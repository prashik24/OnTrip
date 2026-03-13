import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";
import "./MyListings.css";

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
    <div className="myListingsPage container">
      <section className="myListingsHero">
        <h1>My Listings</h1>
        <p>
          View, manage, and update your travel or vehicle services with a cleaner professional layout.
        </p>
      </section>

      {msg && <div className="myListingsMessage">{msg}</div>}

      <div className="myListingsGrid">
        {items.map((item) => (
          <article className="myListingsCard" key={item._id}>
            <div className="myListingsMedia">
              {item.serviceImage?.url ? (
                <img src={item.serviceImage.url} alt={item.businessName} />
              ) : item.listingType === "vehicle" ? (
                item.vehicles?.[0]?.images?.[0]?.url ? (
                  <img src={item.vehicles[0].images[0].url} alt={item.businessName} />
                ) : (
                  <div className="myListingsMediaEmpty">No Image</div>
                )
              ) : item.travelPlanner?.images?.[0]?.url ? (
                <img src={item.travelPlanner.images[0].url} alt={item.businessName} />
              ) : (
                <div className="myListingsMediaEmpty">No Image</div>
              )}
            </div>

            <div className="myListingsBody">
              <div className="myListingsTop">
                <div>
                  <h3>{item.businessName}</h3>
                  <p>
                    {item.city} • {item.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
                  </p>
                </div>

                <div className="myListingsType">
                  {item.listingType === "vehicle" ? "Vehicle" : "Travel"}
                </div>
              </div>

              <div className="myListingsDesc">
                {item.description || "No description available."}
              </div>

              {item.listingType === "travel_planner" && (
                <div className="myListingsMeta">
                  From ₹{item.travelPlanner?.priceFrom || 0} • Per person ₹
                  {item.travelPlanner?.pricePerPerson || 0}
                </div>
              )}

              {item.listingType === "vehicle" && (
                <div className="myListingsMeta">
                  {item.vehicles?.length || 0} vehicles added
                </div>
              )}

              <div className="myListingsActions">
                <button className="myListingsBtn" onClick={() => navigate(`/providers/${item._id}`)}>
                  View
                </button>

                <button className="myListingsBtn" onClick={() => navigate("/providers")}>
                  Edit from Providers
                </button>

                <button className="myListingsBtn danger" onClick={() => removeItem(item._id)}>
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}