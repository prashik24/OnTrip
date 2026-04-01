import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./MyListings.css";

export default function MyListings() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/providers/mine");
      setItems(data.providers || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id) {
    try {
      setRemovingId(id);
      await apiFetch(`/api/providers/${id}`, { method: "DELETE" });
      await load();
      setMsg("Listing removed successfully.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setRemovingId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading your listings..." />;
  }

  return (
    <div className="myListingsPage container">
      <div className="myListingsHead">
        <h1>My Listings</h1>
        <p>
          Manage your provider services, update details, remove old listings,
          and keep your profile clean.
        </p>
      </div>

      {msg && <div className="myListingsMessage">{msg}</div>}

      {items.length === 0 ? (
        <div className="myListingsEmpty">
          You have not created any listing yet.
        </div>
      ) : (
        <div className="myListingsGrid">
          {items.map((item) => (
            <article className="myListingsCard" key={item._id}>
              <div className="myListingsMedia">
                {item.serviceImage?.url ? (
                  <img src={item.serviceImage.url} alt={item.businessName} />
                ) : item.listingType === "vehicle" ? (
                  item.vehicles?.[0]?.images?.[0]?.url ? (
                    <img
                      src={item.vehicles[0].images[0].url}
                      alt={item.businessName}
                    />
                  ) : (
                    <div className="myListingsMediaEmpty">No Image</div>
                  )
                ) : item.travelPlans?.[0]?.images?.[0]?.url ? (
                  <img
                    src={item.travelPlans[0].images[0].url}
                    alt={item.businessName}
                  />
                ) : item.travelPlanner?.images?.[0]?.url ? (
                  <img
                    src={item.travelPlanner.images[0].url}
                    alt={item.businessName}
                  />
                ) : (
                  <div className="myListingsMediaEmpty">No Image</div>
                )}
              </div>

              <div className="myListingsBody">
                <div className="myListingsTop">
                  <div>
                    <h3>{item.businessName}</h3>
                    <p>
                      {item.city} •{" "}
                      {item.listingType === "vehicle"
                        ? "Vehicle Service"
                        : "Travel Planner"}
                    </p>
                  </div>

                  <div className="myListingsType">
                    {item.listingType === "vehicle" ? "Vehicle" : "Travel"}
                  </div>
                </div>

                <div className="myListingsDesc">
                  {item.description || "No description available."}
                </div>

                <div className="myListingsActions">
                  <button
                    className="myListingsBtn myListingsBtnPrimary"
                    onClick={() =>
                      navigate(`/profile/my-listings/${item._id}/edit`)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="myListingsBtn danger"
                    onClick={() => removeItem(item._id)}
                    disabled={removingId === item._id}
                  >
                    {removingId === item._id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}