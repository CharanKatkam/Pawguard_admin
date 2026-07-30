import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Users from "./pages/users/Users";
import Pets from "./pages/pets/Pets";
import Shelters from "./pages/shelters/Shelters";
import Adoptions from "./pages/adoptions/Adoptions";
import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";

import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/shelters" element={<Shelters />} />
          <Route path="/adoptions" element={<Adoptions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;