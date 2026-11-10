import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { extractApiError, validateInstitutionalEmail } from '../../utils/formatters';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateField = (fieldName, value) => {
    if (fieldName === 'email') {
      const msg = validateInstitutionalEmail(value);
      setErrors((prev) => ({ ...prev, email: msg || '' }));
      return !msg;
    }
    if (fieldName === 'password') {
      const msg = !value ? 'Password is required.' : '';
      setErrors((prev) => ({ ...prev, password: msg }));
      return !msg;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const emailOk = validateField('email', email);
    const pwdOk = validateField('password', password);
    if (!emailOk || !pwdOk) return;

    setSubmitting(true);
    try {
      const data = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${data.user.fullName}!`);
      navigate(data.redirectTo || '/student/dashboard', { replace: true });
    } catch (err) {
      const msg = extractApiError(err, 'Invalid institutional email or password.');
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Sign in to your portal"
      subheading="Use your official @iiit-bh.ac.in institutional credentials"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Institutional Email ID
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) validateField('email', e.target.value);
              }}
              onBlur={(e) => validateField('email', e.target.value)}
              placeholder="B123026@iiit-bh.ac.in"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.email
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-brand-700 focus:ring-emerald-100'
              }`}
            />
          </div>
          {errors.email ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) validateField('password', e.target.value);
              }}
              placeholder="Enter your password"
              className={`w-full rounded-xl border pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.password
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-brand-700 focus:ring-emerald-100'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition disabled:opacity-60"
        >
          <span>{submitting ? 'Signing in…' : 'Sign In'}</span>
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>

        <div className="pt-3 border-t border-slate-100 text-center text-sm text-slate-600">
          New student at IIIT Bhubaneswar?{' '}
          <Link to="/register" className="font-semibold text-brand-800 hover:text-brand-700">
            Create Student Account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
