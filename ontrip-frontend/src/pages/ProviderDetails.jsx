import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDetails.css";

function formatReviewDateTime(value) {
  if (!value) return "";
  const date = new Date(value);

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
    user && provider && String(provider.owner?._id || provider.owner) === String(user.id);

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
              {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
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
              <button className="providerDetailsPrimaryBtn" onClick={goToBooking}>
                Book Service
              </button>
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

                  <div className="providerDetailsVehicleSummary">
                    <div className="providerDetailsVehicleMetaGrid">
                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Vehicle Type</span>
                        <strong>{vehicle.vehicleType || "-"}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Title</span>
                        <strong>{vehicle.title || "-"}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Price</span>
                        <strong>₹{vehicle.price || 0}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Price Unit</span>
                        <strong>{vehicle.priceUnit || "-"}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Capacity</span>
                        <strong>{vehicle.capacity || 1}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Fuel Type</span>
                        <strong>{vehicle.fuelType || "N/A"}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Driver Option</span>
                        <strong>{vehicle.withDriver ? "With Driver" : "Without Driver"}</strong>
                      </div>
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

                  <div className="providerDetailsDataGrid">
                    <div className="providerDetailsDataBox">
                      <strong>Package</strong>
                      <span>{trip.packageTitle || "Package"}</span>
                    </div>

                    <div className="providerDetailsDataBox">
                      <strong>Duration</strong>
                      <span>{trip.durationText || "-"}</span>
                    </div>

                    <div className="providerDetailsDataBox">
                      <strong>Price From</strong>
                      <span>₹{trip.priceFrom || 0}</span>
                    </div>
                  </div>

                  <div className="providerDetailsInfoBlocks">
                    <div className="providerDetailsInfoBlock">
                      <h3>Places Covered</h3>
                      <p>{(trip.placesCovered || []).join(", ") || "-"}</p>
                    </div>

                    <div className="providerDetailsInfoBlock">
                      <h3>Inclusions</h3>
                      <p>{(trip.inclusions || []).join(", ") || "-"}</p>
                    </div>

                    <div className="providerDetailsInfoBlock">
                      <h3>Exclusions</h3>
                      <p>{(trip.exclusions || []).join(", ") || "-"}</p>
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
                      👍 Helpful ({review.helpfulCount || 0})
                    </button>

                    <button
                      type="button"
                      className={`providerDetailsVoteBtn providerDetailsVoteBtnAlt ${
                        review.currentUserVote === "not_helpful" ? "active" : ""
                      }`}
                      onClick={() => handleReviewVote(review._id, "not_helpful")}
                      disabled={voteLoadingId === review._id}
                    >
                      👎 Not Helpful ({review.notHelpfulCount || 0})
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