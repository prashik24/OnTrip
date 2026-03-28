import { useNavigate } from "react-router-dom";
import heroImg from "../assets/ontrip-hero.png";
import logoImg from "../assets/Ontrip.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <section
      className="homeFullscreen"
      style={{ backgroundImage: `url(${heroImg})` }}
    >
      <div className="homeLogoWrap">
        <img src={logoImg} alt="OnTrip" className="homeLogo" />
      </div>

      {/* Optional overlay content */}
      {/* 
      <div className="heroContent">
        <button onClick={() => navigate("/explore")}>Explore</button>
        <button onClick={() => navigate("/planner")}>Plan Trip</button>
      </div>
      */}
    </section>
  );
}