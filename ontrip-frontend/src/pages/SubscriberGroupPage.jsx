import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SubscriberGroupPage.css";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatLastSeen(value, isOnline) {
  if (isOnline) return "Online";
  if (!value) return "Offline";
  const date = new Date(value);
  return `Last seen ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function SubscriberGroupPage() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [subscribers, setSubscribers] = useState([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (currentUser?.role !== "provider") {
      navigate("/profile");
      return;
    }

    async function loadSubscribers() {
      try {
        setLoading(true);
        setMsg({ text: "", type: "" });

        const data = await apiFetch("/api/subscribers/all");
        setSubscribers(data.subscribers || []);
      } catch (err) {
        setMsg({
          text: err.message || "Failed to load subscribers.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadSubscribers();
  }, [navigate, currentUser?.role]);

  const filteredSubscribers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;

    return subscribers.filter((item) => {
      const bag = `${item.name} ${item.email} ${item.chatUser?.city || ""}`.toLowerCase();
      return bag.includes(q);
    });
  }, [subscribers, search]);

  const selectedSubscribers = useMemo(() => {
    return subscribers.filter((item) =>
      selectedIds.includes(String(item.chatUser?.id || ""))
    );
  }, [subscribers, selectedIds]);

  function toggleSelect(subscriber) {
    const userId = String(subscriber.chatUser?.id || "");
    if (!subscriber.hasAccount || !userId) return;

    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      setMsg({ text: "Group name is required.", type: "error" });
      return;
    }

    if (selectedIds.length < 1) {
      setMsg({ text: "Select at least 1 subscriber.", type: "error" });
      return;
    }

    try {
      setCreating(true);
      setMsg({ text: "", type: "" });

      const res = await apiFetch("/api/chat/conversations/group", {
        method: "POST",
        body: JSON.stringify({
          groupName: groupName.trim(),
          groupDescription: groupDescription.trim(),
          participantIds: selectedIds,
        }),
      });

      setMsg({
        text: res.message || "Subscriber group created successfully.",
        type: "success",
      });

      navigate(`/chat?conversation=${res.conversation.id}`, { replace: true });
    } catch (err) {
      setMsg({
        text: err.message || "Failed to create group.",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  if (!isLoggedIn()) return null;

  if (loading) {
    return <LoadingSpinner text="Loading subscribers..." />;
  }

  return (
    <div className="subscriberGroupPage container">
      <div className="subscriberGroupHero">
        <div className="subscriberGroupHeroText">
          <div className="subscriberGroupKicker">OnTrip Provider Tools</div>
          <h1>Create Subscriber Chat Group</h1>
          <p>
            View all subscribed users, select the ones with chat accounts, and create a
            group that will appear directly inside your chat page.
          </p>
        </div>

        <button
          className="subscriberGroupTopBtn"
          type="button"
          onClick={() => navigate("/chat")}
        >
          Open Chat
        </button>
      </div>

      {msg.text ? (
        <div className={`subscriberGroupMessage ${msg.type}`}>{msg.text}</div>
      ) : null}

      <div className="subscriberGroupLayout">
        <section className="subscriberGroupMainCard">
          <div className="subscriberGroupSectionHead">
            <div>
              <h2>All Subscribers</h2>
              <p>Select subscribers with active user accounts for the chat group.</p>
            </div>

            <input
              className="subscriberGroupSearch"
              placeholder="Search subscribers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="subscriberGroupEmpty">No subscribers found.</div>
          ) : (
            <div className="subscriberGroupGrid">
              {filteredSubscribers.map((item) => {
                const userId = String(item.chatUser?.id || "");
                const isSelected = selectedIds.includes(userId);
                const initial =
                  item.name?.charAt(0)?.toUpperCase() ||
                  item.email?.charAt(0)?.toUpperCase() ||
                  "S";

                return (
                  <div
                    key={item.id}
                    className={`subscriberCard ${isSelected ? "selected" : ""} ${
                      !item.hasAccount ? "disabled" : ""
                    }`}
                  >
                    <div className="subscriberCardTop">
                      <div className="subscriberCardIdentity">
                        {item.chatUser?.avatar ? (
                          <img
                            src={item.chatUser.avatar}
                            alt={item.name || item.email}
                            className="subscriberAvatar"
                          />
                        ) : (
                          <div className="subscriberAvatar fallback">{initial}</div>
                        )}

                        <div className="subscriberCardInfo">
                          <h3>{item.name || "Subscriber"}</h3>
                          <p>{item.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`subscriberSelectBtn ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => toggleSelect(item)}
                        disabled={!item.hasAccount}
                      >
                        {!item.hasAccount
                          ? "No Account"
                          : isSelected
                          ? "Selected"
                          : "Select"}
                      </button>
                    </div>

                    <div className="subscriberMetaGrid">
                      <div className="subscriberMetaItem">
                        <strong>Status</strong>
                        <span>{item.isSubscribed ? "Subscribed" : "Unsubscribed"}</span>
                      </div>

                      <div className="subscriberMetaItem">
                        <strong>Subscribed At</strong>
                        <span>{formatDate(item.subscribedAt)}</span>
                      </div>

                      <div className="subscriberMetaItem">
                        <strong>Chat Account</strong>
                        <span>{item.hasAccount ? "Available" : "Not Available"}</span>
                      </div>

                      <div className="subscriberMetaItem">
                        <strong>Presence</strong>
                        <span>
                          {item.hasAccount
                            ? formatLastSeen(
                                item.chatUser?.lastSeenAt,
                                item.chatUser?.isOnline
                              )
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="subscriberGroupSideCard">
          <div className="subscriberGroupSectionHead side">
            <div>
              <h2>Create Group</h2>
              <p>Selected subscribers will be added to this chat group.</p>
            </div>
          </div>

          <div className="subscriberGroupForm">
            <div className="subscriberGroupField">
              <label>Group Name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Example: Goa Offer Subscribers"
              />
            </div>

            <div className="subscriberGroupField">
              <label>Description</label>
              <textarea
                rows={5}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Write a short group description..."
              />
            </div>

            <div className="subscriberSelectedBox">
              <div className="subscriberSelectedHead">
                <strong>Selected Members</strong>
                <span>{selectedSubscribers.length}</span>
              </div>

              {selectedSubscribers.length === 0 ? (
                <div className="subscriberSelectedEmpty">
                  No subscribers selected yet.
                </div>
              ) : (
                <div className="subscriberSelectedList">
                  {selectedSubscribers.map((item) => (
                    <div key={item.id} className="subscriberSelectedItem">
                      <span>{item.name || item.email}</span>
                      <button
                        type="button"
                        onClick={() => toggleSelect(item)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="subscriberGroupActions">
              <button
                className="subscriberGroupGhostBtn"
                type="button"
                onClick={() => navigate("/profile")}
              >
                Back to Profile
              </button>

              <button
                className="subscriberGroupPrimaryBtn"
                type="button"
                onClick={handleCreateGroup}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}