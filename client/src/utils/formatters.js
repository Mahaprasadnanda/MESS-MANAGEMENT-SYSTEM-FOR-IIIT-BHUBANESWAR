import { INSTITUTIONAL_EMAIL_REGEX } from './constants';

export function formatINR(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

export function extractApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const resp = error.response?.data;
  if (resp?.message) return resp.message;
  if (error.message) return error.message;
  return fallback;
}

export function validateInstitutionalEmail(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return 'Institutional email ID is required.';
  }
  if (!trimmed.includes('@')) {
    return 'Please enter a valid institutional email (e.g. B123026@iiit-bh.ac.in).';
  }
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (domain && domain !== 'iiit-bh.ac.in') {
    return `Domain "@${domain}" is not permitted. Only official @iiit-bh.ac.in email addresses are allowed.`;
  }
  if (!INSTITUTIONAL_EMAIL_REGEX.test(trimmed)) {
    return 'Only official @iiit-bh.ac.in email addresses are accepted.';
  }
  return null;
}

export function getPasswordChecks(password) {
  const pwd = String(password || '');
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
  };
}

export function validatePasswordStrength(password) {
  const checks = getPasswordChecks(password);
  if (!checks.minLength) return 'Password must be at least 8 characters long.';
  if (!checks.hasUpper) return 'Password must include at least one uppercase letter.';
  if (!checks.hasLower) return 'Password must include at least one lowercase letter.';
  if (!checks.hasNumber) return 'Password must include at least one number.';
  return null;
}
