import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppThemeProvider } from './ThemeContext';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import TicketList from './pages/TicketList';
import TicketCreate from './pages/TicketCreate';
import TicketDetail from './pages/TicketDetail';
import JobList from './pages/JobList';
import JobCreate from './pages/JobCreate';
import JobDetail from './pages/JobDetail';
import UserManagement from './pages/UserManagement';
import CategoryManagement from './pages/CategoryManagement';
import PriorityManagement from './pages/PriorityManagement';
import ProblemManagement from './pages/ProblemManagement';
import VehicleUnitManagement from './pages/VehicleUnitManagement';
import RadioManagement from './pages/RadioManagement';
import DashcamManagement from './pages/DashcamManagement';
import AppSettingsPage from './pages/AppSettings';
import InspectionList from './pages/InspectionList';
import InspectionCreate from './pages/InspectionCreate';

// Helper pengecekan role pengguna
const getUserRole = (): 'admin' | 'it_support' | 'client' => {
  const userJson = localStorage.getItem('taurus_user');
  if (!userJson) return 'client';
  try {
    const user = JSON.parse(userJson);
    if (user.role === 'admin' || user.username === 'admin') return 'admin';
    if (user.role === 'it_support' || user.role === 'technician') return 'it_support';
    return 'client';
  } catch {
    return 'client';
  }
};

// Route wrapper untuk Dashboard (Root /)
// Jika Client: tampilkan ClientDashboard (Antrian Tiket Saya)
// Jika IT Support atau Admin: tampilkan Dashboard
const HomeRoute: React.FC = () => {
  const role = getUserRole();
  if (role === 'client') {
    return <ClientDashboard />;
  }
  return <Dashboard />;
};

// Route wrapper khusus Administrator (Admin Only)
const AdminRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const role = getUserRole();
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return element;
};

// Route wrapper untuk Halaman Staff (IT Support & Admin)
// Client tidak boleh mengakses daftar tiket internal, daftar job, detail job, dll
const StaffRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const role = getUserRole();
  if (role === 'client') {
    return <Navigate to="/" replace />;
  }
  return element;
};

// Route wrapper khusus IT Support untuk Buat Job Baru
// Admin tidak membuat job (hanya memantau), Client tidak membuat job
const TechnicianOnlyRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const role = getUserRole();
  if (role === 'client') {
    return <Navigate to="/" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/jobs" replace />;
  }
  return element;
};

export const App: React.FC = () => {
  return (
    <AppThemeProvider>
      <BrowserRouter basename="/taurus">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes dengan Layout Sidebar + Topbar */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              {/* Home / Dashboard */}
              <Route path="/" element={<HomeRoute />} />

              {/* Tiket Routes */}
              <Route path="/tickets" element={<StaffRoute element={<TicketList />} />} />
              <Route path="/tickets/create" element={<TicketCreate />} />
              <Route path="/tickets/:id" element={<StaffRoute element={<TicketDetail />} />} />

              {/* Job Routes */}
              <Route path="/jobs" element={<StaffRoute element={<JobList />} />} />
              <Route path="/jobs/create" element={<TechnicianOnlyRoute element={<JobCreate />} />} />
              <Route path="/jobs/:id" element={<StaffRoute element={<JobDetail />} />} />

              {/* Radio & Dascam Management Routes (Client: Read-Only, Staff: Full CRUD) */}
              <Route path="/radios" element={<RadioManagement />} />
              <Route path="/dashcams" element={<DashcamManagement />} />

              {/* Inspeksi Unit (Radio Rig, Camera Cabin, Camera Fatigue) */}
              <Route path="/inspections" element={<StaffRoute element={<InspectionList />} />} />
              <Route path="/inspections/create" element={<StaffRoute element={<InspectionCreate />} />} />

              {/* Master Data & Admin Routes */}
              <Route path="/users" element={<AdminRoute element={<UserManagement />} />} />
              <Route path="/categories" element={<AdminRoute element={<CategoryManagement />} />} />
              <Route path="/problems" element={<AdminRoute element={<ProblemManagement />} />} />
              <Route path="/priorities" element={<AdminRoute element={<PriorityManagement />} />} />
              <Route path="/units" element={<AdminRoute element={<VehicleUnitManagement />} />} />
              <Route path="/settings" element={<AdminRoute element={<AppSettingsPage />} />} />
            </Route>
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<HomeRoute />} />
        </Routes>
      </BrowserRouter>
    </AppThemeProvider>
  );
};

export default App;
