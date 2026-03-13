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
          View, manage, and organize all your provider services in one clean
          place.
        </p>
      </section>

      {msg && <div className="myListingsMessage">{msg}</div>}

      <section className="myListingsGrid">
        {items.length === 0 ? (
          <div className="myListingsEmpty">You have not created any listing yet.</div>
        ) : (
          items.map((item) => (
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
                      {item.city} •{" "}
                      {item.listingType === "vehicle"
                        ? "Vehicle Service"
                        : "Travel Planner"}
                    </p>
                  </div>

                  <div className="myListingsRating">
                    ⭐ {item.ratingAverage || 0} ({item.ratingCount || 0})
                  </div>
                </div>

                <div className="myListingsDesc">
                  {item.description || "No description available."}
                </div>

                {item.listingType === "travel_planner" ? (
                  <div className="myListingsMiniInfo">
                    Package: {item.travelPlanner?.packageTitle || "Travel Package"} •
                    From ₹{item.travelPlanner?.priceFrom || 0}
                  </div>
                ) : (
                  <div className="myListingsMiniInfo">
                    Vehicles: {item.vehicles?.length || 0}
                  </div>
                )}

                <div className="myListingsActions">
                  <button
                    className="myListingsGhostBtn"
                    onClick={() => navigate(`/providers/${item._id}`)}
                  >
                    View
                  </button>

                  <button
                    className="myListingsGhostBtn"
                    onClick={() => navigate("/providers")}
                  >
                    Edit in Providers
                  </button>

                  <button
                    className="myListingsDangerBtn"
                    onClick={() => removeItem(item._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}