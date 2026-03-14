import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDetails.css";

export default function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similarProviders, setSimilarProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const providerData = await apiFetch(`/api/providers/${id}`);
        setProvider(providerData.provider);
        setSimilarProviders(providerData.similarProviders || []);

        const reviewData = await apiFetch(`/api/reviews/${id}`);
        setReviews(reviewData.reviews || []);
      } catch (err) {
        setMsg({ text: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner text="Loading provider details..." />;
  }

  if (!provider) {
    return (
      <div className="providerDetailsPage container">
        <div className="providerDetailsMessage error">
          {msg.text || "Provider not found."}
        </div>
      </div>
    );
  }

  const isOwner =
    user && String(provider.owner?._id || provider.owner) === String(user.id);

  return (
    <div className="providerDetailsPage container">
      {msg.text && (
        <div className={`providerDetailsMessage ${msg.type}`}>
          {msg.text}
        </div>
      )}

      <section className="providerDetailsCard">
        <div className="providerDetailsTop">
          <div className="providerDetailsHeroImage">
            {provider.serviceImage?.url ? (
              <img src={provider.serviceImage.url} alt={provider.businessName} />
            ) : (
              <div className="providerDetailsImageEmpty">No Service Image</div>
            )}
          </div>

          <div className="providerDetailsTopContent">
            <div className="providerDetailsType">
              {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
            </div>

            <h1>{provider.businessName}</h1>

            <div className="providerDetailsMeta">
              {provider.city}
              {provider.state ? `, ${provider.state}` : ""} • ⭐ {provider.ratingAverage || 0} • {provider.ratingCount || 0} reviews
            </div>

            <p className="providerDetailsDesc">
              {provider.description || "No description provided."}
            </p>

            <div className="providerDetailsInfoRow">
              <span>Provider: {provider.owner?.name || "Provider"}</span>
              <span>Phone: {provider.phone}</span>
              <span>WhatsApp: {provider.whatsapp || "N/A"}</span>
            </div>

            {!isLoggedIn() ? (
              <button className="providerDetailsPrimaryBtn" onClick={() => navigate("/login")}>
                Login to Book
              </button>
            ) : isOwner ? (
              <div className="providerDetailsNote">You cannot book your own service.</div>
            ) : (
              <button
                className="providerDetailsPrimaryBtn"
                onClick={() => navigate(`/providers/${id}/book`)}
              >
                Book Service
              </button>
            )}
          </div>
        </div>

        {provider.listingType === "travel_planner" ? (
          <div className="providerDetailsSection">
            <h2>Travel Package Details</h2>

            <div className="providerDetailsDataGrid">
              <div className="providerDetailsDataBox">
                <strong>Package</strong>
                <span>{provider.travelPlanner?.packageTitle || "Travel Package"}</span>
              </div>

              <div className="providerDetailsDataBox">
                <strong>Duration</strong>
                <span>{provider.travelPlanner?.durationText || "Flexible"}</span>
              </div>

              <div className="providerDetailsDataBox">
                <strong>Days</strong>
                <span>{provider.travelPlanner?.days || 1}</span>
              </div>

              <div className="providerDetailsDataBox">
                <strong>Price From</strong>
                <span>₹{provider.travelPlanner?.priceFrom || 0}</span>
              </div>

              <div className="providerDetailsDataBox">
                <strong>Price Per Person</strong>
                <span>₹{provider.travelPlanner?.pricePerPerson || 0}</span>
              </div>

              <div className="providerDetailsDataBox">
                <strong>Planner Mode</strong>
                <span>{provider.travelPlanner?.plannerMode || "N/A"}</span>
              </div>
            </div>

            <div className="providerDetailsInfoBlocks">
              <div className="providerDetailsInfoBlock">
                <h3>Places Covered</h3>
                <p>{(provider.travelPlanner?.placesCovered || []).join(", ") || "N/A"}</p>
              </div>

              <div className="providerDetailsInfoBlock">
                <h3>Inclusions</h3>
                <p>{(provider.travelPlanner?.inclusions || []).join(", ") || "N/A"}</p>
              </div>

              <div className="providerDetailsInfoBlock">
                <h3>Exclusions</h3>
                <p>{(provider.travelPlanner?.exclusions || []).join(", ") || "N/A"}</p>
              </div>
            </div>

            <div className="providerDetailsGallery">
              {(provider.travelPlanner?.images || []).map((img, index) => (
                <div className="providerDetailsGalleryItem" key={index}>
                  <img src={img.url} alt="travel package" />
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                        {vehicle.withDriver ? "With Driver" : "Without Driver"} •{" "}
                        {vehicle.fuelType || "N/A"}
                      </p>
                    </div>

                    <div className="providerDetailsVehiclePrice">
                      ₹{vehicle.price} /{" "}
                      {vehicle.priceUnit === "per_hour"
                        ? "hour"
                        : vehicle.priceUnit === "fixed"
                        ? "fixed"
                        : "day"}
                    </div>
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
        )}

        <div className="providerDetailsSection">
          <h2>Comments & Reviews</h2>

          <div className="providerDetailsReviewList">
            {reviews.length === 0 ? (
              <div className="providerDetailsNote">
                No comments yet. Reviews can be written only by users from Booking History after booking/payment.
              </div>
            ) : (
              reviews.map((review) => (
                <div className="providerDetailsReviewItem" key={review._id}>
                  <div className="providerDetailsReviewTop">
                    <strong>{review.user?.name || "User"}</strong>
                    <span>⭐ {review.rating}</span>
                  </div>

                  <p>{review.comment || "No comment"}</p>

                  {review.images?.length > 0 && (
                    <div className="providerDetailsGallery">
                      {review.images.map((img, index) => (
                        <div className="providerDetailsGalleryItem" key={index}>
                          <img src={img.url} alt="review" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="providerDetailsSection">
          <h2>Similar Services</h2>

          <div className="providerDetailsSimilarList">
            {similarProviders.length === 0 ? (
              <div className="providerDetailsNote">No similar services found.</div>
            ) : (
              similarProviders.map((item) => (
                <div className="providerDetailsSimilarCard" key={item._id}>
                  <div>
                    <strong>{item.businessName}</strong>
                    <p>{item.city} • ⭐ {item.ratingAverage || 0}</p>
                  </div>

                  <button
                    className="providerDetailsGhostBtn"
                    onClick={() => navigate(`/providers/${item._id}`)}
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}