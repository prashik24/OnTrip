import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getUser } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Providers.css";

const vehicleTypes = ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"];

export default function Providers() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [providers, setProviders] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    q: "",
    city: "",
    listingType: "",
    vehicleType: "",
  });

  const searchListingTypeOptions = [
    { label: "All Types", value: "" },
    { label: "Vehicle Service", value: "vehicle" },
    { label: "Travel Planner", value: "travel_planner" },
  ];

  const searchVehicleTypeOptions = [
    { label: "All Vehicles", value: "" },
    ...vehicleTypes.map((type) => ({
      label: type,
      value: type,
    })),
  ];

  async function loadProviders() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.city) params.set("city", filters.city);
      if (filters.listingType) params.set("listingType", filters.listingType);
      if (filters.vehicleType) params.set("vehicleType", filters.vehicleType);

      const data = await apiFetch(`/api/providers?${params.toString()}`);
      setProviders(data.providers || []);
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  const visibleProviders = useMemo(() => {
    return providers.filter((item) => {
      if (!currentUser) return true;
      const ownerId = item.owner?._id || item.owner;
      return String(ownerId) !== String(currentUser.id);
    });
  }, [providers, currentUser]);

  return (
    <div className="providersPage container">
      <section className="providersTopBar">
        <div>
          <h1 className="providersTitle">Provider Marketplace</h1>
          <p className="providersSub">
            Browse travel planners and vehicle rental services in one clean marketplace.
          </p>
        </div>

        <button
          className="providersPrimaryBtn"
          onClick={() => navigate("/provider-register")}
        >
          Register as Provider
        </button>
      </section>

      {msg.text && (
        <div className={`providersMessage ${msg.type}`}>
          {msg.text}
        </div>
      )}

      <section className="providersSearchStrip">
        <form
          className="providersSearchGrid"
          onSubmit={(e) => {
            e.preventDefault();
            loadProviders();
          }}
        >
          <input
            className="providersSearchInput"
            placeholder="Search providers"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />

          <input
            className="providersSearchInput"
            placeholder="City / Destination"
            value={filters.city}
            onChange={(e) => setFilters((s) => ({ ...s, city: e.target.value }))}
          />

          <CustomSelect
            value={filters.listingType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, listingType: e.target.value }))
            }
            options={searchListingTypeOptions}
            placeholder="All Types"
          />

          <CustomSelect
            value={filters.vehicleType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, vehicleType: e.target.value }))
            }
            options={searchVehicleTypeOptions}
            placeholder="All Vehicles"
          />

          <button className="providersSearchBtn" type="submit">
            Search
          </button>
        </form>
      </section>

      {loading ? (
        <LoadingSpinner text="Loading providers..." />
      ) : (
        <section className="providersGrid">
          {visibleProviders.map((item) => (
            <div className="providerCard" key={item._id}>
              <div className="providerCardMedia">
                {item.serviceImage?.url ? (
                  <img src={item.serviceImage.url} alt={item.businessName} />
                ) : item.listingType === "vehicle" ? (
                  item.vehicles?.[0]?.images?.[0]?.url ? (
                    <img src={item.vehicles[0].images[0].url} alt={item.businessName} />
                  ) : (
                    <div className="providerCardMediaEmpty">No Image</div>
                  )
                ) : item.travelPlanner?.images?.[0]?.url ? (
                  <img src={item.travelPlanner.images[0].url} alt={item.businessName} />
                ) : (
                  <div className="providerCardMediaEmpty">No Image</div>
                )}
              </div>

              <div className="providerCardBody">
                <div className="providerCardHeader">
                  <div>
                    <h3>{item.businessName}</h3>
                    <p>{item.city} • by {item.owner?.name || "Provider"}</p>
                  </div>

                  <div className="providerCardRating">
                    ⭐ {item.ratingAverage || 0}
                  </div>
                </div>

                <div className="providerTypePill">
                  {item.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
                </div>

                <div className="providerCardDesc">
                  {item.description || "No description available."}
                </div>

                <button
                  className="providersGhostBtn"
                  onClick={() => navigate(`/providers/${item._id}`)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}