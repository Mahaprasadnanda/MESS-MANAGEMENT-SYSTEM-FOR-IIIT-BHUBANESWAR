import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageLoader } from '../components/common/LoadingSkeleton';

export function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'MESS' ? '/mess/dashboard' : '/student/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (isAuthenticated) {
    const destination = user.role === 'MESS' ? '/mess/dashboard' : '/student/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
