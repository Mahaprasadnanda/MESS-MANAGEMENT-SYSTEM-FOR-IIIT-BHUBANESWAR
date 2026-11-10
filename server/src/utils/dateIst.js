/**
 * IST (Asia/Kolkata, fixed UTC+05:30) date & week window utilities.
 *
 * Business Rule:
 * - Mess week runs Monday through Sunday.
 * - Students may book meals ONLY for the immediately upcoming Monday-Sunday week.
 * - Booking closes at Sunday 23:59:59.999 IST; at Monday 00:00:00.000 IST
 *   booking for that Monday's week is closed and the window shifts to the following week.
 */

const {
  MEAL_TYPES,
  MEAL_LABELS,
  MEAL_TIMINGS,
  SAME_DAY_MEAL_PRICES,
  SAME_DAY_CUTOFF_HOURS_IST,
  SAME_DAY_CUTOFF_LABELS,
} = require('./constants');

const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getISTParts(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const dayOfWeek = ist.getUTCDay(); // 0=Sun..6=Sat
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const seconds = ist.getUTCSeconds();
  const milliseconds = ist.getUTCMilliseconds();

  const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
  const timeStr = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    milliseconds,
    dateStr,
    timeStr,
  };
}

function formatDateStringIST(date = new Date()) {
  return getISTParts(date).dateStr;
}

function parseDateOnlyUTC(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date string format (expected YYYY-MM-DD): ${dateStr}`);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return dt;
}

function toDateStrFromUTCDate(dt) {
  if (!dt) return null;
  if (typeof dt === 'string') return dt.slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function addDaysToDateStr(dateStr, days) {
  const dt = parseDateOnlyUTC(dateStr);
  const next = new Date(dt.getTime() + days * DAY_MS);
  return next.toISOString().slice(0, 10);
}

function getDayOfWeekFromDateStr(dateStr) {
  return parseDateOnlyUTC(dateStr).getUTCDay();
}

function getDayNameFromDateStr(dateStr) {
  return DAY_NAMES[getDayOfWeekFromDateStr(dateStr)];
}

function getShortDayNameFromDateStr(dateStr) {
  return SHORT_DAY_NAMES[getDayOfWeekFromDateStr(dateStr)];
}

/**
 * Convert an IST wall-clock date string (YYYY-MM-DD) at 00:00:00.000 IST into a real UTC Date instant.
 */
function istMidnightToUtcInstant(dateStr) {
  const utcMidnight = parseDateOnlyUTC(dateStr);
  return new Date(utcMidnight.getTime() - IST_OFFSET_MS);
}

/**
 * Convert an IST wall-clock date string and time (HH:MM:SS.mmm IST) into a real UTC Date instant.
 */
function istTimeToUtcInstant(dateStr, hours, minutes = 0, seconds = 0, milliseconds = 0) {
  const utcMidnight = parseDateOnlyUTC(dateStr);
  const wallClockMs =
    ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
  return new Date(utcMidnight.getTime() + wallClockMs - IST_OFFSET_MS);
}

/**
 * Returns the Monday..Sunday bounds containing the given YYYY-MM-DD calendar date.
 */
function getWeekBoundsForDateStr(dateStr) {
  const dow = getDayOfWeekFromDateStr(dateStr);
  const daysSinceMonday = (dow + 6) % 7; // Mon->0, Tue->1, ..., Sun->6
  const weekStartStr = addDaysToDateStr(dateStr, -daysSinceMonday);
  const weekEndStr = addDaysToDateStr(weekStartStr, 6);
  return { weekStartStr, weekEndStr };
}

/**
 * Returns an ordered array of 7 YYYY-MM-DD date strings starting from weekStartStr (Monday..Sunday).
 */
function getWeekDates(weekStartStr) {
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    dates.push(addDaysToDateStr(weekStartStr, i));
  }
  return dates;
}

/**
 * Computes the current IST week and the ONLY bookable next Monday-Sunday week.
 */
function getBookingWindowIST(now = new Date()) {
  const parts = getISTParts(now);
  const todayStr = parts.dateStr;
  const { weekStartStr: currentWeekStartStr, weekEndStr: currentWeekEndStr } =
    getWeekBoundsForDateStr(todayStr);

  const targetWeekStartStr = addDaysToDateStr(currentWeekStartStr, 7);
  const targetWeekEndStr = addDaysToDateStr(targetWeekStartStr, 6);

  // Booking for targetWeek closes right when targetWeekStart 00:00:00.000 IST begins
  // (i.e. current Sunday ends at 23:59:59.999 IST).
  const closesAtUtc = istMidnightToUtcInstant(targetWeekStartStr);
  const msRemaining = Math.max(0, closesAtUtc.getTime() - now.getTime());

  // Target week Monday 00:00:00 IST minus 1 second is Sunday 23:59:59 IST
  const deadlineParts = getISTParts(new Date(closesAtUtc.getTime() - 1000));

  return {
    timezone: 'Asia/Kolkata',
    nowUtcISO: now.toISOString(),
    todayStr,
    nowIST: `${parts.dateStr} ${parts.timeStr} IST`,
    currentWeekStartStr,
    currentWeekEndStr,
    targetWeekStartStr,
    targetWeekEndStr,
    targetWeekDates: getWeekDates(targetWeekStartStr),
    closesAtISO: closesAtUtc.toISOString(),
    deadlineDisplay: `${deadlineParts.dateStr} 23:59:59 IST`,
    msRemaining,
    isBookingOpen: now.getTime() < closesAtUtc.getTime(),
  };
}

/**
 * Computes today's same-day meal booking cutoffs in Asia/Kolkata IST:
 * - Breakfast: strictly before 06:00:00 IST (₹25)
 * - Lunch: strictly before 10:00:00 IST (₹65)
 * - Dinner: strictly before 17:00:00 IST / 5:00 PM IST (₹55)
 */
function getSameDayBookingWindowIST(now = new Date()) {
  const parts = getISTParts(now);
  const todayStr = parts.dateStr;
  const { weekStartStr: currentWeekStartStr, weekEndStr: currentWeekEndStr } =
    getWeekBoundsForDateStr(todayStr);

  const slots = {};
  for (const mealType of MEAL_TYPES) {
    const cutoffHour = SAME_DAY_CUTOFF_HOURS_IST[mealType];
    const cutoffUtc = istTimeToUtcInstant(todayStr, cutoffHour, 0, 0, 0);
    const msRemaining = Math.max(0, cutoffUtc.getTime() - now.getTime());

    slots[mealType] = {
      mealType,
      label: MEAL_LABELS[mealType],
      price: SAME_DAY_MEAL_PRICES[mealType],
      servingTiming: MEAL_TIMINGS[mealType],
      cutoffHourIST: cutoffHour,
      cutoffDisplay: SAME_DAY_CUTOFF_LABELS[mealType],
      closesAtISO: cutoffUtc.toISOString(),
      msRemaining,
      isWindowOpen: now.getTime() < cutoffUtc.getTime(),
    };
  }

  return {
    timezone: 'Asia/Kolkata',
    nowUtcISO: now.toISOString(),
    todayStr,
    nowIST: `${parts.dateStr} ${parts.timeStr} IST`,
    currentWeekStartStr,
    currentWeekEndStr,
    slots,
    anySlotOpen: MEAL_TYPES.some((t) => slots[t].isWindowOpen),
  };
}

/**
 * Suggests the default meal session currently being served in IST for Mess verification UI.
 */
function getSuggestedServingMealIST(now = new Date()) {
  const { hours, minutes } = getISTParts(now);
  const minsOfDay = hours * 60 + minutes;
  if (minsOfDay < 11 * 60 + 30) return 'BREAKFAST';
  if (minsOfDay < 16 * 60 + 30) return 'LUNCH';
  return 'DINNER';
}

module.exports = {
  IST_OFFSET_MS,
  DAY_MS,
  getISTParts,
  formatDateStringIST,
  parseDateOnlyUTC,
  toDateStrFromUTCDate,
  addDaysToDateStr,
  getDayOfWeekFromDateStr,
  getDayNameFromDateStr,
  getShortDayNameFromDateStr,
  istMidnightToUtcInstant,
  istTimeToUtcInstant,
  getWeekBoundsForDateStr,
  getWeekDates,
  getBookingWindowIST,
  getSameDayBookingWindowIST,
  getSuggestedServingMealIST,
};
