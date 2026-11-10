export const MEAL_PRICES = {
  BREAKFAST: 20,
  LUNCH: 55,
  DINNER: 45,
};

export const SAME_DAY_MEAL_PRICES = {
  BREAKFAST: 25,
  LUNCH: 65,
  DINNER: 55,
};

export const SAME_DAY_CUTOFF_LABELS = {
  BREAKFAST: 'Before 6:00 AM IST',
  LUNCH: 'Before 10:00 AM IST',
  DINNER: 'Before 5:00 PM IST',
};

export const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'];

export const MEAL_META = {
  BREAKFAST: {
    label: 'Breakfast',
    short: 'B',
    price: 20,
    sameDayPrice: 25,
    cutoffDisplay: 'Before 6:00 AM IST',
    timing: '07:30 AM – 09:30 AM',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    accentBg: 'bg-amber-500',
  },
  LUNCH: {
    label: 'Lunch',
    short: 'L',
    price: 55,
    sameDayPrice: 65,
    cutoffDisplay: 'Before 10:00 AM IST',
    timing: '12:30 PM – 02:30 PM',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentBg: 'bg-emerald-600',
  },
  DINNER: {
    label: 'Dinner',
    short: 'D',
    price: 45,
    sameDayPrice: 55,
    cutoffDisplay: 'Before 5:00 PM IST',
    timing: '07:30 PM – 09:30 PM',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    accentBg: 'bg-indigo-600',
  },
};

export const MIN_WEEKLY_BOOKING_AMOUNT = 476;

export const INSTITUTIONAL_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@iiit-bh\.ac\.in$/i;
