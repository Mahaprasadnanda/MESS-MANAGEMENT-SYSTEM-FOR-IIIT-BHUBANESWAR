import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Check,
  X,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../context/AuthContext';
import {
  extractApiError,
  getPasswordChecks,
  validateInstitutionalEmail,
  validatePasswordStrength,
} from '../../utils/formatters';

export function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);

  const extractedStudentId = useMemo(() => {
    if (validateInstitutionalEmail(form.email) === null) {
      return form.email.trim().split('@')[0].toUpperCase();
    }
    return null;
  }, [form.email]);

  const validateSingle = (name, value, currentForm = form) => {
    let msg = '';
    if (name === 'fullName') {
      if (!value.trim() || value.trim().length < 2) {
        msg = 'Please enter your full name (at least 2 characters).';
      }
    } else if (name === 'email') {
      msg = validateInstitutionalEmail(value) || '';
    } else if (name === 'password') {
      msg = validatePasswordStrength(value) || '';
    } else if (name === 'confirmPassword') {
      if (!value) msg = 'Please confirm your password.';
      else if (value !== currentForm.password) msg = 'Passwords do not match.';
    }
    setErrors((prev) => ({ ...prev, [name]: msg }));
    return !msg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    setForm(updated);
    if (errors[name] || name === 'email') {
      validateSingle(name, value, updated);
    }
    if (name === 'password' && updated.confirmPassword) {
      validateSingle('confirmPassword', updated.confirmPassword, updated);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const nameOk = validateSingle('fullName', form.fullName);
    const emailOk = validateSingle('email', form.email);
    const pwdOk = validateSingle('password', form.password);
    const confirmOk = validateSingle('confirmPassword', form.confirmPassword);

    if (!nameOk || !emailOk || !pwdOk || !confirmOk) return;

    setSubmitting(true);
    try {
      const data = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Student account created successfully!');
      navigate(data.redirectTo || '/student/dashboard', { replace: true });
    } catch (err) {
      const msg = extractApiError(err, 'Registration failed. Please check your details.');
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const RuleItem = ({ ok, label }) => (
    <div className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
      <span>{label}</span>
    </div>
  );

  return (
    <AuthLayout
      heading="Student Registration"
      subheading="Restricted strictly to IIIT Bhubaneswar students (@iiit-bh.ac.in)"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        ) : null}

        <div>
          <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-name"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              onBlur={(e) => validateSingle('fullName', e.target.value)}
              placeholder="e.g. Aarav Behera"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.fullName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-brand-700 focus:ring-emerald-100'
              }`}
            />
          </div>
          {errors.fullName ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.fullName}</p>
          ) : null}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
              Institutional Email ID
            </label>
            {extractedStudentId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold font-mono text-brand-800">
                <BadgeCheck className="h-3 w-3 text-emerald-600" />
                ID: {extractedStudentId}
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={(e) => validateSingle('email', e.target.value)}
              placeholder="B123026@iiit-bh.ac.in"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.email
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-brand-700 focus:ring-emerald-100'
              }`}
            />
          </div>
          {errors.email ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-400">
              Only @iiit-bh.ac.in emails are accepted. External domains (including Gmail, Outlook, and others) are rejected.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              onBlur={(e) => validateSingle('password', e.target.value)}
              placeholder="Create a strong password"
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
          <div className="mt-2 grid grid-cols-2 gap-1.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <RuleItem ok={passwordChecks.minLength} label="At least 8 characters" />
            <RuleItem ok={passwordChecks.hasUpper} label="Uppercase letter (A-Z)" />
            <RuleItem ok={passwordChecks.hasLower} label="Lowercase letter (a-z)" />
            <RuleItem ok={passwordChecks.hasNumber} label="At least one number" />
          </div>
          {errors.password ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.password}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="reg-confirm"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="reg-confirm"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={(e) => validateSingle('confirmPassword', e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                errors.confirmPassword
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-200 focus:border-brand-700 focus:ring-emerald-100'
              }`}
            />
          </div>
          {errors.confirmPassword ? (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.confirmPassword}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition disabled:opacity-60"
        >
          <span>{submitting ? 'Creating Account…' : 'Register as Student'}</span>
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>

        <div className="pt-3 border-t border-slate-100 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-800 hover:text-brand-700">
            Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
