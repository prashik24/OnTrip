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

                  <h3 className="providerDetailsItemTitle">
                    {vehicle.title || vehicle.vehicleType}
                  </h3>

                  <div className="providerDetailsVehicleHero">
                    {vehicle.images?.length > 0 ? (
                      <img
                        src={vehicle.images[0].url}
                        alt={vehicle.title || vehicle.vehicleType}
                      />
                    ) : (
                      <div className="providerDetailsImageEmpty">
                        No Vehicle Image
                      </div>
                    )}
                  </div>

                  <div className="providerDetailsVehicleSummary">

                    <div className="providerDetailsVehicleMetaGrid">

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Type</span>
                        <strong>{vehicle.vehicleType}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Capacity</span>
                        <strong>{vehicle.capacity || 1}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Fuel</span>
                        <strong>{vehicle.fuelType || "N/A"}</strong>
                      </div>

                      <div className="providerDetailsMiniInfo">
                        <span className="providerDetailsMiniLabel">Driver</span>
                        <strong>
                          {vehicle.withDriver ? "With Driver" : "Self Drive"}
                        </strong>
                      </div>

                    </div>

                    <div className="providerDetailsVehiclePriceCard">
                      <span className="providerDetailsVehiclePriceLabel">Price</span>
                      <div className="providerDetailsVehiclePrice">
                        ₹{vehicle.price}
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

                  <h3 className="providerDetailsItemTitle">
                    {trip.packageTitle || "Travel Package"}
                  </h3>

                  <div className="providerDetailsPackageHero">
                    {trip.images?.length > 0 ? (
                      <img
                        src={trip.images[0].url}
                        alt={trip.packageTitle || "package"}
                      />
                    ) : (
                      <div className="providerDetailsImageEmpty">
                        No Package Image
                      </div>
                    )}
                  </div>

                  <div className="providerDetailsDataGrid">

                    <div className="providerDetailsDataBox">
                      <strong>Duration</strong>
                      <span>{trip.durationText || "-"}</span>
                    </div>

                    <div className="providerDetailsDataBox">
                      <strong>Price From</strong>
                      <span>₹{trip.priceFrom || 0}</span>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews and Similar sections unchanged */}

      </div>
    </div>
  );
}