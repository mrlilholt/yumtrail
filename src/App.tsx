import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import AppShell from './pages/AppShell';
import ProtectedRoute from './routes/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LogMeal from './pages/LogMeal';
import Forest from './pages/Forest';
import Settings from './pages/Settings';
import Rewards from './pages/Rewards';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="log" element={<LogMeal />} />
        <Route path="kids" element={<Navigate to="/app/settings" replace />} />
        <Route path="forest" element={<Forest />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
};

export default App;
