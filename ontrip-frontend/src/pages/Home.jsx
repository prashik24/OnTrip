import { useNavigate } from "react-router-dom";
import heroImg from "../assets/ontrip-hero.png";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <section
      className="homeFullscreen"
      style={{ backgroundImage: `url(${heroImg})` }}
    >
      {/* Optional overlay content */}
     
    </section>
  );
}
