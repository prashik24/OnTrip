import { useNavigate } from "react-router-dom";
import heroImg from "../assets/ontrip-hero.png";
import mobileHero from "../assets/OnTrip.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <section
      className="homeFullscreen"
      style={{ backgroundImage: `url(${heroImg})` }}
    >
      {/* Mobile image layer */}
      <div
        className="homeMobileBg"
        style={{ backgroundImage: `url(${mobileHero})` }}
      ></div>

      {/* Optional overlay content */}
      <div className="heroContent">
        {/* buttons / content if needed */}
      </div>
    </section>
  );
}