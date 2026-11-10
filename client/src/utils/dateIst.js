const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function getTodayDateStrIST(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}

export function parseDateOnlyUTC(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function addDaysToDateStr(dateStr, days) {
  const dt = parseDateOnlyUTC(dateStr);
  return new Date(dt.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function getDayNameFromDateStr(dateStr) {
  return DAYS[parseDateOnlyUTC(dateStr).getUTCDay()];
}

export function getShortDayNameFromDateStr(dateStr) {
  return SHORT_DAYS[parseDateOnlyUTC(dateStr).getUTCDay()];
}

export function formatDisplayDate(dateStr, includeYear = true) {
  if (!dateStr) return '—';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const base = `${pad2(d)} ${MONTHS[m - 1]}`;
  return includeYear ? `${base} ${y}` : base;
}

export function formatWeekRange(startStr, endStr) {
  if (!startStr || !endStr) return '—';
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  if (sy === ey && sm === em) {
    return `${pad2(sd)} – ${pad2(ed)} ${MONTHS[sm - 1]} ${sy}`;
  }
  if (sy === ey) {
    return `${pad2(sd)} ${MONTHS[sm - 1]} – ${pad2(ed)} ${MONTHS[em - 1]} ${sy}`;
  }
  return `${formatDisplayDate(startStr)} – ${formatDisplayDate(endStr)}`;
}

export function formatISTDateTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}
