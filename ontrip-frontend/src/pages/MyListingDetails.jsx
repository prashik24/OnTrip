import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./MyListingDetails.css";

export default function MyListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setMsg("");

        const providerData = await apiFetch(`/api/providers/${id}`);
        setProvider(providerData.provider || null);
      } catch (err) {
        setMsg(err.message || "Failed to load listing.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const travelPlans = useMemo(() => {
    if (!provider) return [];
    if (provider.travelPlans?.length > 0) return provider.travelPlans;

    if (
      provider.travelPlanner?.packageTitle ||
      provider.travelPlanner?.durationText ||
      provider.travelPlanner?.images?.length
    ) {
      return [provider.travelPlanner];
    }

    return [];
  }, [provider]);

  const heroImage = useMemo(() => {
    if (!provider) return "";

    return (
      provider.serviceImage?.url ||
      travelPlans?.[0]?.images?.[0]?.url ||
      provider.vehicles?.[0]?.images?.[0]?.url ||
      ""
    );
  }, [provider, travelPlans]);

  if (loading) {
    return <LoadingSpinner text="Loading your listing details..." />;
  }

  if (!provider) {
    return (
      <div className="myListingDetailsPage container">
        <div className="myListingDetailsMessage error">
          {msg || "Listing not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="myListingDetailsPage container">
      {msg && <div className="myListingDetailsMessage error">{msg}</div>}

      <div className="myListingDetailsCard">
        <div className="myListingDetailsTop">
          <div className="myListingDetailsHeroImage">
            {heroImage ? (
              <img src={heroImage} alt={provider.businessName} />
            ) : (
              <div className="myListingDetailsImageEmpty">No Image</div>
            )}
          </div>

          <div className="myListingDetailsTopContent">
            <div className="myListingDetailsType myListingDetailsTypeTop">
              {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
            </div>

            <h1>{provider.businessName}</h1>

            <div className="myListingDetailsMeta">
              {provider.city} • {provider.phone} • ⭐ {provider.ratingAverage || 0} (
              {provider.ratingCount || 0})
            </div>

            <p className="myListingDetailsDesc">
              {provider.description || "No description provided."}
            </p>

            <div className="myListingDetailsInfoRow">
              <span>Owner: {provider.owner?.name || "Provider"}</span>
              {provider.whatsapp ? <span>WhatsApp: {provider.whatsapp}</span> : null}
              {provider.state ? <span>State: {provider.state}</span> : null}
            </div>

            <div className="myListingDetailsActionRow">
              <button className="myListingDetailsPrimaryBtn" onClick={() => navigate("/profile/my-listings")}>
                Back to My Listings
              </button>
            </div>
          </div>
        </div>

        {provider.listingType === "vehicle" ? (
          <div className="myListingDetailsSection">
            <h2>Available Vehicles</h2>

            <div className="myListingDetailsVehicleList">
              {(provider.vehicles || []).map((vehicle) => (
                <div className="myListingDetailsVehicleCard" key={vehicle._id || vehicle.title}>
                  <div className="myListingDetailsItemHeader">
                    <h3 className="myListingDetailsItemTitle">
                      {vehicle.title || vehicle.vehicleType || "Vehicle"}
                    </h3>
                  </div>

                  <div className="myListingDetailsVehicleHero">
                    {vehicle.images?.length > 0 ? (
                      <img
                        src={vehicle.images[0].url}
                        alt={vehicle.title || vehicle.vehicleType}
                      />
                    ) : (
                      <div className="myListingDetailsImageEmpty">No Vehicle Image</div>
                    )}
                  </div>

                  {vehicle.images?.length > 1 && (
                    <div className="myListingDetailsGallery">
                      {vehicle.images.slice(1).map((img, index) => (
                        <div className="myListingDetailsGalleryItem" key={index}>
                          <img
                            src={img.url}
                            alt={`${vehicle.title || vehicle.vehicleType}-${index + 2}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="myListingDetailsVehicleSummary">
                    <div className="myListingDetailsVehicleMetaGrid">
                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Vehicle Type</span>
                        <strong>{vehicle.vehicleType || "-"}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Title</span>
                        <strong>{vehicle.title || "-"}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Price</span>
                        <strong>₹{vehicle.price || 0}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Price Unit</span>
                        <strong>{vehicle.priceUnit || "-"}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Capacity</span>
                        <strong>{vehicle.capacity || 1}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Fuel Type</span>
                        <strong>{vehicle.fuelType || "N/A"}</strong>
                      </div>

                      <div className="myListingDetailsMiniInfo">
                        <span className="myListingDetailsMiniLabel">Driver Option</span>
                        <strong>{vehicle.withDriver ? "With Driver" : "Without Driver"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="myListingDetailsSection">
            <h2>Package Details</h2>

            <div className="myListingDetailsTravelList">
              {travelPlans.map((trip, index) => (
                <div className="myListingDetailsTravelCard" key={trip._id || index}>
                  <div className="myListingDetailsItemHeader">
                    <h3 className="myListingDetailsItemTitle">
                      {trip.packageTitle || "Package"}
                    </h3>
                  </div>

                  <div className="myListingDetailsPackageHero">
                    {trip.images?.length > 0 ? (
                      <img src={trip.images[0].url} alt={trip.packageTitle || "package"} />
                    ) : (
                      <div className="myListingDetailsImageEmpty">No Package Image</div>
                    )}
                  </div>

                  {trip.images?.length > 1 && (
                    <div className="myListingDetailsGallery">
                      {trip.images.slice(1).map((img, imgIndex) => (
                        <div className="myListingDetailsGalleryItem" key={imgIndex}>
                          <img src={img.url} alt={`planner-${imgIndex + 2}`} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="myListingDetailsDataGrid">
                    <div className="myListingDetailsDataBox">
                      <strong>Package</strong>
                      <span>{trip.packageTitle || "Package"}</span>
                    </div>

                    <div className="myListingDetailsDataBox">
                      <strong>Duration</strong>
                      <span>{trip.durationText || "-"}</span>
                    </div>

                    <div className="myListingDetailsDataBox">
                      <strong>Price From</strong>
                      <span>₹{trip.priceFrom || 0}</span>
                    </div>
                  </div>

                  <div className="myListingDetailsInfoBlocks">
                    <div className="myListingDetailsInfoBlock">
                      <h3>Places Covered</h3>
                      <p>
                        {Array.isArray(trip.placesCovered)
                          ? trip.placesCovered.join(", ") || "-"
                          : trip.placesCovered || "-"}
                      </p>
                    </div>

                    <div className="myListingDetailsInfoBlock">
                      <h3>Inclusions</h3>
                      <p>
                        {Array.isArray(trip.inclusions)
                          ? trip.inclusions.join(", ") || "-"
                          : trip.inclusions || "-"}
                      </p>
                    </div>

                    <div className="myListingDetailsInfoBlock">
                      <h3>Exclusions</h3>
                      <p>
                        {Array.isArray(trip.exclusions)
                          ? trip.exclusions.join(", ") || "-"
                          : trip.exclusions || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}