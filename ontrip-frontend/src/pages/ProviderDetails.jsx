import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDetails.css";

const HELPFUL_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.82 0 1.52-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'/></svg>";

const NOT_HELPFUL_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M15 3H6c-.82 0-1.52.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z'/></svg>";

function formatReviewDateTime(value) {
  if (!value) return "";
  const date = new Date(value);

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [voteLoadingId, setVoteLoadingId] = useState("");

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
        if (currentProvider.listingType) {
          query.set("listingType", currentProvider.listingType);
        }

        const similarData = await apiFetch(`/api/providers?${query.toString()}`);
        setSimilar(
          (similarData.providers || [])
            .filter((item) => item._id !== currentProvider._id)
            .slice(0, 4)
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
    user &&
    provider &&
    String(provider.owner?._id || provider.owner) === String(user.id);

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

  function goToBooking() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    navigate(`/providers/${provider._id}/book`);
  }

  function goToChat() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const ownerId =
      provider?.owner?._id || provider?.owner?.id || provider?.owner;

    if (!ownerId) {
      setMsg("Provider chat is not available right now.");
      return;
    }

    navigate(`/chat?user=${ownerId}`);
  }

  async function handleReviewVote(reviewId, voteType) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      setVoteLoadingId(reviewId);
      setMsg("");

      const data = await apiFetch(`/api/reviews/${reviewId}/vote`, {
        method: "POST",
        body: JSON.stringify({ voteType }),
      });

      setReviews((prev) =>
        prev.map((review) =>
          review._id === reviewId ? { ...review, ...data.review } : review
        )
      );

      setMsg(data.message || "Review vote saved.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setVoteLoadingId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading provider details..." />;
  }

  if (!provider) {
    return (
      <div className="providerDetailsPage container">
        <div className="providerDetailsMessage error">
          {msg || "Provider not found."}
        </div>
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
            <div className="providerDetailsType providerDetailsTypeTop">
              {provider.listingType === "vehicle"
                ? "Vehicle Service"
                : "Travel Planner"}
            </div>

            <h1>{provider.businessName}</h1>

            <div className="providerDetailsMeta">
              {provider.city} • {provider.phone} • ⭐ {provider.ratingAverage || 0} (
              {provider.ratingCount || 0})
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
              <div className="providerDetailsActionRow">
                <button className="providerDetailsPrimaryBtn" onClick={goToBooking}>
                  Book Service
                </button>

                <button className="providerDetailsGhostBtn" onClick={goToChat}>
                  Chat with Provider
                </button>
              </div>
            ) : (
              <div className="providerDetailsNote">This is your own listing.</div>
            )}
          </div>
        </div>

        {provider.listingType === "vehicle" ? (
          <div className="providerDetailsSection">
            <h2>Available Vehicles</h2>

            <div className="providerDetailsVehicleList">
              {(provider.vehicles || []).map((vehicle) => (
                <div className="providerDetailsVehicleCard" key={vehicle._id}>
                  <div className="providerDetailsItemHeader">
                    <h3 className="providerDetailsItemTitle">
                      {vehicle.title || vehicle.vehicleType || "Vehicle"}
                    </h3>
                  </div>

                  <div className="providerDetailsVehicleHero">
                    {vehicle.images?.length > 0 ? (
                      <img
                        src={vehicle.images[0].url}
                        alt={vehicle.title || vehicle.vehicleType}
                      />
                    ) : (
                      <div className="providerDetailsImageEmpty">No Vehicle Image</div>
                    )}
                  </div>

                  {vehicle.images?.length > 1 && (
                    <div className="providerDetailsGallery providerDetailsVehicleThumbs">
                      {vehicle.images.slice(1).map((img, index) => (
                        <div className="providerDetailsGalleryItem" key={index}>
                          <img
                            src={img.url}
                            alt={`${vehicle.title || vehicle.vehicleType}-${index + 2}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="providerDetailsInfoGrid">
                    <div>
                      <strong>Business</strong>
                      <span>{provider.businessName || "-"}</span>
                    </div>

                    <div>
                      <strong>City</strong>
                      <span>{provider.city || "-"}</span>
                    </div>

                    <div>
                      <strong>Vehicle Type</strong>
                      <span>{formatLabel(vehicle.vehicleType || "-")}</span>
                    </div>

                    <div>
                      <strong>Title</strong>
                      <span>{vehicle.title || "-"}</span>
                    </div>

                    <div>
                      <strong>Price</strong>
                      <span>₹{vehicle.price || 0}</span>
                    </div>

                    <div>
                      <strong>Price Unit</strong>
                      <span>{formatLabel(vehicle.priceUnit || "-")}</span>
                    </div>

                    <div>
                      <strong>Capacity</strong>
                      <span>{vehicle.capacity || 1}</span>
                    </div>

                    <div>
                      <strong>Fuel Type</strong>
                      <span>{vehicle.fuelType || "N/A"}</span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Driver Option</strong>
                      <span>
                        {vehicle.withDriver ? "With Driver" : "Without Driver"}
                      </span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Description</strong>
                      <span>{provider.description || "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="providerDetailsSection">
            <h2>Package Details</h2>

            <div className="providerDetailsTravelList">
              {travelPlans.map((trip, index) => (
                <div className="providerDetailsTravelCard" key={trip._id || index}>
                  <div className="providerDetailsItemHeader">
                    <h3 className="providerDetailsItemTitle">
                      {trip.packageTitle || "Package"}
                    </h3>
                  </div>

                  <div className="providerDetailsPackageHero">
                    {trip.images?.length > 0 ? (
                      <img
                        src={trip.images[0].url}
                        alt={trip.packageTitle || "package"}
                      />
                    ) : (
                      <div className="providerDetailsImageEmpty">No Package Image</div>
                    )}
                  </div>

                  {trip.images?.length > 1 && (
                    <div className="providerDetailsGallery providerDetailsPackageThumbs">
                      {trip.images.slice(1).map((img, imgIndex) => (
                        <div className="providerDetailsGalleryItem" key={imgIndex}>
                          <img src={img.url} alt={`planner-${imgIndex + 2}`} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="providerDetailsInfoGrid">
                    <div>
                      <strong>Business</strong>
                      <span>{provider.businessName || "-"}</span>
                    </div>

                    <div>
                      <strong>City</strong>
                      <span>{provider.city || "-"}</span>
                    </div>

                    <div>
                      <strong>Planner Type</strong>
                      <span>{formatLabel(trip.plannerMode || "-")}</span>
                    </div>

                    <div>
                      <strong>Package Title</strong>
                      <span>{trip.packageTitle || "-"}</span>
                    </div>

                    <div>
                      <strong>Duration</strong>
                      <span>{trip.durationText || "-"}</span>
                    </div>

                    <div>
                      <strong>Days</strong>
                      <span>{trip.days || "-"}</span>
                    </div>

                    <div>
                      <strong>Price From</strong>
                      <span>₹{trip.priceFrom || 0}</span>
                    </div>

                    <div>
                      <strong>Price Per Person</strong>
                      <span>₹{trip.pricePerPerson || 0}</span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Places Covered</strong>
                      <span>
                        {Array.isArray(trip.placesCovered)
                          ? trip.placesCovered.join(", ")
                          : trip.placesCovered || "-"}
                      </span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Inclusions</strong>
                      <span>
                        {Array.isArray(trip.inclusions)
                          ? trip.inclusions.join(", ")
                          : trip.inclusions || "-"}
                      </span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Exclusions</strong>
                      <span>
                        {Array.isArray(trip.exclusions)
                          ? trip.exclusions.join(", ")
                          : trip.exclusions || "-"}
                      </span>
                    </div>

                    <div className="providerDetailsInfoWide">
                      <strong>Description</strong>
                      <span>{provider.description || "-"}</span>
                    </div>
                  </div>
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
                    <div className="providerDetailsReviewTopLeft">
                      <strong>{review.user?.name || "User"}</strong>
                      <div className="providerDetailsReviewDate">
                        {formatReviewDateTime(review.createdAt)}
                      </div>
                    </div>
                    <span>⭐ {review.rating}</span>
                  </div>

                  <p>{review.comment || "No comment"}</p>

                  {review.images?.length > 0 && (
                    <div className="providerDetailsReviewImageGrid">
                      {review.images.map((img, index) => (
                        <div className="providerDetailsReviewImageItem" key={index}>
                          <img src={img.url} alt={`review-${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="providerDetailsVoteRow">
                    <button
                      type="button"
                      className={`providerDetailsVoteBtn ${
                        review.currentUserVote === "helpful" ? "active" : ""
                      }`}
                      onClick={() => handleReviewVote(review._id, "helpful")}
                      disabled={voteLoadingId === review._id}
                    >
                      <img
                        src={HELPFUL_ICON}
                        alt="Helpful"
                        className="providerDetailsVoteIcon"
                      />
                      <span>Helpful ({review.helpfulCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      className={`providerDetailsVoteBtn providerDetailsVoteBtnAlt ${
                        review.currentUserVote === "not_helpful" ? "active" : ""
                      }`}
                      onClick={() => handleReviewVote(review._id, "not_helpful")}
                      disabled={voteLoadingId === review._id}
                    >
                      <img
                        src={NOT_HELPFUL_ICON}
                        alt="Not Helpful"
                        className="providerDetailsVoteIcon"
                      />
                      <span>Not Helpful ({review.notHelpfulCount || 0})</span>
                    </button>
                  </div>
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
                    <p>
                      {item.city} • ⭐ {item.ratingAverage || 0}
                    </p>
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