import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import { isAuthed } from "./lib/auth";

// Route-level code splitting for faster first paint
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contracts = lazy(() => import("./pages/Contracts"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetails = lazy(() => import("./pages/InvoiceDetails"));
const Units = lazy(() => import("./pages/Units"));
const UnitDetails = lazy(() => import("./pages/UnitDetails"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Users = lazy(() => import("./pages/Users"));
const Properties = lazy(() => import("./pages/Properties"));
const HotelLayout = lazy(() => import("./pages/hotel/HotelLayout"));
const HotelDashboard = lazy(() => import("./pages/hotel/HotelDashboard"));
const HotelUnits = lazy(() => import("./pages/hotel/HotelUnits"));
const HotelContracts = lazy(() => import("./pages/hotel/HotelContracts"));
const HotelInvoices = lazy(() => import("./pages/hotel/HotelInvoices"));
const HotelMaintenance = lazy(() => import("./pages/hotel/HotelMaintenance"));
const HotelReports = lazy(() => import("./pages/hotel/HotelReports"));
const HotelTenants = lazy(() => import("./pages/hotel/HotelTenants"));
const HotelTenantDetails = lazy(() => import("./pages/hotel/HotelTenantDetails"));

function PrivateRoute({ children }: { children: ReactElement }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-center">جارٍ تحميل الواجهة…</div>}>
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
          <Route path="units/:id" element={<UnitDetails />} />
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
            <Route path="tenants/:tenantId" element={<HotelTenantDetails />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="settings/users" element={<Users />} />
          <Route path="settings/permissions" element={<Permissions />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthed() ? "/dashboard" : "/login"} replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
