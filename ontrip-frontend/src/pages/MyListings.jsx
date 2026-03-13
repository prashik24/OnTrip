import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function MyListings() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const data = await apiFetch("/api/providers/mine");
      setItems(data.providers || []);
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id) {
    const ok = window.confirm("Remove this service?");
    if (!ok) return;

    try {
      await apiFetch(`/api/providers/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="container providersPlatformPage">
      <div className="providerSearch card">
        <h2 className="providerSectionTitle">My Listings</h2>
        <p className="providerSectionSub">
          View, edit, update and remove your services.
        </p>
      </div>

      {msg && <div className="providerMessage error">{msg}</div>}

      <div className="providerGrid">
        {items.map((item) => (
          <div className="providerCard card" key={item._id}>
            <div className="providerBody">
              <div className="providerCardTop">
                <div>
                  <div className="providerCardTitle">{item.businessName}</div>
                  <div className="providerMetaText">
                    {item.city} • {item.listingType}
                  </div>
                </div>
              </div>

              <div className="providerDesc">
                {item.description || "No description available."}
              </div>

              <div className="providerCardActions">
                <button className="btn" onClick={() => navigate(`/providers/${item._id}`)}>
                  View
                </button>
                <button className="btn" onClick={() => navigate(`/providers/${item._id}/edit`)}>
                  Edit
                </button>
                <button className="btn" onClick={() => removeItem(item._id)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}