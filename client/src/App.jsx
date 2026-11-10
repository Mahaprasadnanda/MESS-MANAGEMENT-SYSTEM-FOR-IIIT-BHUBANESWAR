import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

import { StudentLayout } from './layouts/StudentLayout';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { WeeklyMenuPage } from './pages/student/WeeklyMenuPage';
import { BookMealsPage } from './pages/student/BookMealsPage';
import { MyCouponsPage } from './pages/student/MyCouponsPage';
import { BookingHistoryPage } from './pages/student/BookingHistoryPage';
import { PaymentsPage } from './pages/student/PaymentsPage';
import { ProfilePage } from './pages/student/ProfilePage';

import { MessLayout } from './layouts/MessLayout';
import { MessDashboard } from './pages/mess/MessDashboard';
import { DailyMealOverviewPage } from './pages/mess/DailyMealOverviewPage';
import { ManageMenuPage } from './pages/mess/ManageMenuPage';
import { MessWeeklyMenuPage } from './pages/mess/MessWeeklyMenuPage';
import { StudentBookingsPage } from './pages/mess/StudentBookingsPage';
import { CouponVerificationPage } from './pages/mess/CouponVerificationPage';
import { PaymentReportsPage } from './pages/mess/PaymentReportsPage';
import { AnalyticsPage } from './pages/mess/AnalyticsPage';

import { FullPageLoader } from './components/common/LoadingSkeleton';

function RootRedirect() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === 'MESS' ? '/mess/dashboard' : '/student/dashboard'}
      replace
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3800,
            style: {
              borderRadius: '12px',
              background: '#022c22',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
            },
          }}
        />

        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* Public Auth Routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Student Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="menu" element={<WeeklyMenuPage />} />
              <Route path="book-meals" element={<BookMealsPage />} />
              <Route path="coupons" element={<MyCouponsPage />} />
              <Route path="bookings" element={<BookingHistoryPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Mess Personnel Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['MESS']} />}>
            <Route path="/mess" element={<MessLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MessDashboard />} />
              <Route path="daily-overview" element={<DailyMealOverviewPage />} />
              <Route path="manage-menu" element={<ManageMenuPage />} />
              <Route path="weekly-menu" element={<MessWeeklyMenuPage />} />
              <Route path="bookings" element={<StudentBookingsPage />} />
              <Route path="verify-coupons" element={<CouponVerificationPage />} />
              <Route path="reports" element={<PaymentReportsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
