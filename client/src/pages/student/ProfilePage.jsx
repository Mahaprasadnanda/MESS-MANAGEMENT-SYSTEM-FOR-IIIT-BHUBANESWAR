import { useState } from 'react';
import { User, Mail, BadgeCheck, KeyRound, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { formatISTDateTime } from '../../utils/dateIst';
import { extractApiError, validatePasswordStrength } from '../../utils/formatters';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [pwdError, setPwdError] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Full name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await authService.updateProfile({ fullName: fullName.trim() });
      setUser(updated);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(extractApiError(err, 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (!pwdForm.currentPassword) {
      setPwdError('Current password is required.');
      return;
    }
    const err = validatePasswordStrength(pwdForm.newPassword);
    if (err) {
      setPwdError(err);
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setSavingPwd(true);
    try {
      await authService.changePassword(pwdForm);
      toast.success('Password updated successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (apiErr) {
      setPwdError(extractApiError(apiErr, 'Unable to change password.'));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Student Account Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-brand-900 text-emerald-200 flex items-center justify-center text-xl font-bold shrink-0">
          {user?.fullName?.slice(0, 2).toUpperCase() || 'ST'}
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user?.fullName}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold font-mono text-brand-900">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              {user?.studentId}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{user?.email}</span>
          </div>
          <div className="text-xs text-slate-400">
            Registered on {formatISTDateTime(user?.createdAt)}
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <form
        onSubmit={handleProfileSave}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="h-4 w-4 text-brand-800" />
          <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Institutional Email (Read-only)
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-800 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form
        onSubmit={handlePasswordSubmit}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-soft p-6 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <KeyRound className="h-4 w-4 text-brand-800" />
          <h3 className="text-base font-bold text-slate-900">Security &amp; Password</h3>
        </div>

        {pwdError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {pwdError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, newPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={pwdForm.confirmNewPassword}
              onChange={(e) => setPwdForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingPwd}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {savingPwd ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
