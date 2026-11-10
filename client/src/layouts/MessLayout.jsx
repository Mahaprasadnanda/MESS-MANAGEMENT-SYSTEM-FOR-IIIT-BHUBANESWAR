import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarPlus,
  CalendarDays,
  Users,
  ScanQrCode,
  FileSpreadsheet,
  BarChart3,
  LogOut,
  Menu,
  X,
  Clock,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { getTodayDateStrIST, formatDisplayDate } from '../utils/dateIst';
import { ChangePasswordModal } from '../components/mess/ChangePasswordModal';

const MESS_NAV = [
  { to: '/mess/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mess/daily-overview', label: 'Daily Meal Overview', icon: ClipboardList },
  { to: '/mess/manage-menu', label: 'Manage Menu', icon: CalendarPlus },
  { to: '/mess/weekly-menu', label: 'Weekly Menu', icon: CalendarDays },
  { to: '/mess/bookings', label: 'Student Bookings', icon: Users },
  { to: '/mess/verify-coupons', label: 'Coupon Verification', icon: ScanQrCode },
  { to: '/mess/reports', label: 'Payment Reports', icon: FileSpreadsheet },
  { to: '/mess/analytics', label: 'Analytics', icon: BarChart3 },
];

export function MessLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentNav = MESS_NAV.find((n) => location.pathname.startsWith(n.to));
  const pageTitle = currentNav?.label || 'Mess Operations';
  const todayFormatted = formatDisplayDate(getTodayDateStrIST());

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-brand-950 text-slate-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <BrandLogo dark subtitle="Mess Admin Console" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden rounded-lg p-1.5 text-emerald-200 hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Mess Personnel
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-1 text-sm font-semibold text-white truncate">
            {user?.fullName || 'Mess Administration'}
          </div>
          <div className="text-xs text-emerald-100/60 truncate">{user?.email}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {MESS_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-white font-semibold ring-1 ring-emerald-400/30'
                    : 'text-emerald-100/75 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-emerald-300' : 'text-emerald-200/50'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1">
        <button
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            setPwdModalOpen(true);
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-emerald-100/80 hover:bg-white/5 hover:text-white transition"
        >
          <KeyRound className="h-4 w-4 text-emerald-300" />
          <span>Change Password</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/15 transition"
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
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
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
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-xs font-semibold text-brand-900">
              <Clock className="h-3.5 w-3.5 text-brand-800" />
              <span>{todayFormatted} · IST</span>
            </div>
            <button
              type="button"
              onClick={() => setPwdModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              Security
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />
    </div>
  );
}
