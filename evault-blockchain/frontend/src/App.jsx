import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import StoreDocument from "./pages/StoreDocument";
import VerifyDocument from "./pages/VerifyDocument";
import AuditLog from "./pages/AuditLog";
import RoleManager from "./pages/RoleManager";
import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/store" element={<StoreDocument />} />
        <Route path="/verify" element={<VerifyDocument />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/roles" element={<RoleManager />} />
      </Routes>
    </BrowserRouter>
  );
}
