import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import InvoiceDetails from "./pages/InvoiceDetails";
import Units from "./pages/Units";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Permissions from "./pages/Permissions";
import Users from "./pages/Users";
import Properties from "./pages/Properties";
import HotelLayout from "./pages/hotel/HotelLayout";
import HotelDashboard from "./pages/hotel/HotelDashboard";
import HotelUnits from "./pages/hotel/HotelUnits";
import HotelContracts from "./pages/hotel/HotelContracts";
import HotelInvoices from "./pages/hotel/HotelInvoices";
import HotelMaintenance from "./pages/hotel/HotelMaintenance";
import HotelReports from "./pages/hotel/HotelReports";
import HotelTenants from "./pages/hotel/HotelTenants";
import { isAuthed } from "./lib/auth";

function PrivateRoute({ children }: { children: ReactElement }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="properties" element={<Properties />} />
          <Route path="units" element={<Units />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="reports" element={<Reports />} />
          {/* Hotel scoped routes */}
          <Route path="hotel/:id" element={<HotelLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<HotelDashboard />} />
            <Route path="units" element={<HotelUnits />} />
            <Route path="contracts" element={<HotelContracts />} />
            <Route path="invoices" element={<HotelInvoices />} />
            <Route path="maintenance" element={<HotelMaintenance />} />
            <Route path="reports" element={<HotelReports />} />
            <Route path="tenants" element={<HotelTenants />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="settings/users" element={<Users />} />
          <Route path="settings/permissions" element={<Permissions />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthed() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
