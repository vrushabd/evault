import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">⬡ eVault Blockchain</div>
      <div className="nav-links">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/store">Store</NavLink>
        <NavLink to="/verify">Verify</NavLink>
        <NavLink to="/audit">Audit Log</NavLink>
        <NavLink to="/roles">Roles</NavLink>
        <span className="indicator">
          <span className="dot" /> Sepolia
        </span>
        <span className="indicator">
          <span className="dot" /> Port 8083
        </span>
      </div>
    </nav>
  );
}
