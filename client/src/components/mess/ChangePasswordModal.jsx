import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { authService } from '../../services/authService';
import { extractApiError, validatePasswordStrength } from '../../utils/formatters';

export function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword) {
      setError('Current password is required.');
      return;
    }
    const pwdErr = validatePasswordStrength(form.newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(form);
      toast.success('Password updated successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      onClose();
    } catch (err) {
      setError(extractApiError(err, 'Unable to update password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Change Account Password"
      subtitle="Update your password securely"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Enter current password"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Min 8 chars, upper, lower, number"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={form.confirmNewPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmNewPassword: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Re-enter new password"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand-900 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {saving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
