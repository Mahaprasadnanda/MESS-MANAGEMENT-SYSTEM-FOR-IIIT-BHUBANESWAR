import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Utensils,
  QrCode,
  History,
  ReceiptIndianRupee,
  UserCircle,
  LogOut,
  Menu,
  X,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { getTodayDateStrIST, formatDisplayDate } from '../utils/dateIst';

const STUDENT_NAV = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/menu', label: 'Weekly Menu', icon: CalendarDays },
  { to: '/student/book-meals', label: 'Book Meals', icon: Utensils },
  { to: '/student/coupons', label: 'My Coupons', icon: QrCode },
  { to: '/student/bookings', label: 'Booking History', icon: History },
  { to: '/student/payments', label: 'Payments', icon: ReceiptIndianRupee },
  { to: '/student/profile', label: 'Profile', icon: UserCircle },
];

export function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentNav = STUDENT_NAV.find((n) => location.pathname.startsWith(n.to));
  const pageTitle = currentNav?.label || 'Student Portal';
  const todayFormatted = formatDisplayDate(getTodayDateStrIST());

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
        <BrandLogo subtitle="Student Dining Portal" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Student Identity Card */}
      <div className="p-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-emerald-800 p-4 text-white shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-200">
            Student ID
          </div>
          <div className="mt-0.5 text-base font-bold font-mono tracking-tight">
            {user?.studentId || 'STUDENT'}
          </div>
          <div className="mt-1 text-xs text-emerald-100/90 truncate">{user?.fullName}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {STUDENT_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-brand-900 font-semibold shadow-sm ring-1 ring-emerald-200/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-brand-800' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F7F9F8]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full">
            <SidebarContent />
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Clock className="h-3.5 w-3.5 text-brand-800" />
              <span>{todayFormatted} · IST</span>
            </div>
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="h-9 w-9 rounded-full bg-brand-900 text-emerald-200 flex items-center justify-center text-xs font-bold">
                {user?.fullName?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-xs font-semibold text-slate-900">{user?.fullName}</div>
                <div className="text-[11px] text-slate-500">{user?.email}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
