import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDetails.css";

export default function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setMsg("");

        const providerData = await apiFetch(`/api/providers/${id}`);
        const currentProvider = providerData.provider;
        setProvider(currentProvider);

        const reviewData = await apiFetch(`/api/reviews/${id}`);
        setReviews(reviewData.reviews || []);

        const query = new URLSearchParams();
        if (currentProvider.city) query.set("city", currentProvider.city);
        if (currentProvider.listingType) query.set("listingType", currentProvider.listingType);

        const similarData = await apiFetch(`/api/providers?${query.toString()}`);
        setSimilar(
          (similarData.providers || []).filter((item) => item._id !== currentProvider._id).slice(0, 4)
        );
      } catch (err) {
        setMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const isOwner =
    user && provider && String(provider.owner?._id || provider.owner) === String(user.id);

  const heroImage = useMemo(() => {
    if (!provider) return "";

    return (
      provider.serviceImage?.url ||
      provider.travelPlanner?.images?.[0]?.url ||
      provider.vehicles?.[0]?.images?.[0]?.url ||
      ""
    );
  }, [provider]);

  if (loading) {
    return <LoadingSpinner text="Loading provider details..." />;
  }

  if (!provider) {
    return (
      <div className="providerDetailsPage container">
        <div className="providerDetailsMessage error">{msg || "Provider not found."}</div>
      </div>
    );
  }

  return (
    <div className="providerDetailsPage container">
      {msg && <div className="providerDetailsMessage error">{msg}</div>}

      <div className="providerDetailsCard">
        <div className="providerDetailsTop">
          <div className="providerDetailsHeroImage">
            {heroImage ? (
              <img src={heroImage} alt={provider.businessName} />
            ) : (
              <div className="providerDetailsImageEmpty">No Image</div>
            )}
          </div>

          <div className="providerDetailsTopContent">
            <div className="providerDetailsType">
              {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
            </div>

            <h1>{provider.businessName}</h1>
            <div className="providerDetailsMeta">
              {provider.city} • {provider.phone} • ⭐ {provider.ratingAverage || 0} ({provider.ratingCount || 0})
            </div>

            <p className="providerDetailsDesc">
              {provider.description || "No description provided."}
            </p>

            <div className="providerDetailsInfoRow">
              <span>Owner: {provider.owner?.name || "Provider"}</span>
              {provider.whatsapp ? <span>WhatsApp: {provider.whatsapp}</span> : null}
              {provider.state ? <span>State: {provider.state}</span> : null}
            </div>

            {!isOwner ? (
              <button
                className="providerDetailsPrimaryBtn"
                onClick={() => navigate(`/providers/${provider._id}/book`)}
              >
                Book Service
              </button>
            ) : (
              <div className="providerDetailsNote">
                This is your own listing.
              </div>
            )}
          </div>
        </div>

        {provider.listingType === "vehicle" ? (
          <div className="providerDetailsSection">
            <h2>Available Vehicles</h2>
            <div className="providerDetailsVehicleList">
              {(provider.vehicles || []).map((vehicle) => (
                <div className="providerDetailsVehicleCard" key={vehicle._id}>
                  <div className="providerDetailsVehicleHead">
                    <div>
                      <h3>{vehicle.title || vehicle.vehicleType}</h3>
                      <p>
                        {vehicle.vehicleType} • Capacity {vehicle.capacity || 1} •{" "}
                        {vehicle.fuelType || "N/A"} •{" "}
                        {vehicle.withDriver ? "With Driver" : "Without Driver"}
                      </p>
                    </div>
                    <div className="providerDetailsVehiclePrice">₹{vehicle.price}</div>
                  </div>

                  <div className="providerDetailsGallery">
                    {(vehicle.images || []).map((img, index) => (
                      <div className="providerDetailsGalleryItem" key={index}>
                        <img src={img.url} alt={vehicle.title || vehicle.vehicleType} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="providerDetailsSection">
            <h2>Package Details</h2>

            <div className="providerDetailsDataGrid">
              <div className="providerDetailsDataBox">
                <strong>Package</strong>
                <span>{provider.travelPlanner?.packageTitle || "Package"}</span>
              </div>
              <div className="providerDetailsDataBox">
                <strong>Duration</strong>
                <span>{provider.travelPlanner?.durationText || "-"}</span>
              </div>
              <div className="providerDetailsDataBox">
                <strong>Price From</strong>
                <span>₹{provider.travelPlanner?.priceFrom || 0}</span>
              </div>
            </div>

            <div className="providerDetailsInfoBlocks">
              <div className="providerDetailsInfoBlock">
                <h3>Places Covered</h3>
                <p>{(provider.travelPlanner?.placesCovered || []).join(", ") || "-"}</p>
              </div>
              <div className="providerDetailsInfoBlock">
                <h3>Inclusions</h3>
                <p>{(provider.travelPlanner?.inclusions || []).join(", ") || "-"}</p>
              </div>
              <div className="providerDetailsInfoBlock">
                <h3>Exclusions</h3>
                <p>{(provider.travelPlanner?.exclusions || []).join(", ") || "-"}</p>
              </div>
            </div>

            <div className="providerDetailsGallery">
              {(provider.travelPlanner?.images || []).map((img, index) => (
                <div className="providerDetailsGalleryItem" key={index}>
                  <img src={img.url} alt="planner" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="providerDetailsSection">
          <h2>Reviews</h2>

          {reviews.length === 0 ? (
            <div className="providerDetailsNote">No reviews yet.</div>
          ) : (
            <div className="providerDetailsReviewList">
              {reviews.map((review) => (
                <div className="providerDetailsReviewItem" key={review._id}>
                  <div className="providerDetailsReviewTop">
                    <strong>{review.user?.name || "User"}</strong>
                    <span>⭐ {review.rating}</span>
                  </div>
                  <p>{review.comment || "No comment"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="providerDetailsSection">
          <h2>Similar Services</h2>

          {similar.length === 0 ? (
            <div className="providerDetailsNote">No similar services found.</div>
          ) : (
            <div className="providerDetailsSimilarList">
              {similar.map((item) => (
                <div className="providerDetailsSimilarCard" key={item._id}>
                  <div>
                    <strong>{item.businessName}</strong>
                    <p>{item.city} • ⭐ {item.ratingAverage || 0}</p>
                  </div>

                  <button
                    className="providerDetailsPrimaryBtn"
                    onClick={() => navigate(`/providers/${item._id}`)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}