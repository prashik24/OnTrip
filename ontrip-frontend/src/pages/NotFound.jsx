import "./NotFound.css";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="nfWrap">
      <div className="nfGlow nfGlowOne" />
      <div className="nfGlow nfGlowTwo" />

      <div className="container nf">
        <div className="nfCard">
          <div className="nfCode">404</div>
          <div className="nfBadge">Oops! Page Missing</div>

          <h1 className="nfTitle">This page could not be found</h1>

          <p className="nfSub">
            The page you are looking for may have been removed, renamed, or the
            link might be broken.
          </p>

          <div className="nfActions">
            <Link className="nfBtn nfBtnPrimary" to="/">
              Go Home
            </Link>
            <Link className="nfBtn nfBtnGhost" to="/explore">
              Explore Places
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}