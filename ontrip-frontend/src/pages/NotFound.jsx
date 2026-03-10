import "./NotFound.css";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container nf">
      <div className="card nfCard">
        <div className="nfTitle">404</div>
        <div className="nfSub">Page not found.</div>
        <Link className="btn btnPrimary" to="/">Go Home</Link>
      </div>
    </div>
  );
}
