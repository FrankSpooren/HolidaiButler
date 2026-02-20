import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AgentsPage from './pages/AgentsPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import useAuthStore from './stores/authStore.js';

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/pois" element={<PlaceholderPage title="POI Management" icon={PlaceIcon} />} />
            <Route path="/reviews" element={<PlaceholderPage title="Reviews" icon={StarIcon} />} />
            <Route path="/analytics" element={<PlaceholderPage title="Analytics" icon={BarChartIcon} />} />
            <Route path="/settings" element={<PlaceholderPage title="Instellingen" icon={SettingsIcon} />} />
          </Route>
        </Route>

        {/* Redirects & 404 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
