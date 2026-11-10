const MEAL_PRICES = Object.freeze({
  BREAKFAST: 20,
  LUNCH: 55,
  DINNER: 45,
});

const SAME_DAY_MEAL_PRICES = Object.freeze({
  BREAKFAST: 25,
  LUNCH: 65,
  DINNER: 55,
});

const SAME_DAY_CUTOFF_HOURS_IST = Object.freeze({
  BREAKFAST: 6, // Strictly before 06:00:00 IST
  LUNCH: 10,    // Strictly before 10:00:00 IST
  DINNER: 17,   // Strictly before 17:00:00 IST (5:00 PM)
});

const SAME_DAY_CUTOFF_LABELS = Object.freeze({
  BREAKFAST: 'Before 6:00 AM IST',
  LUNCH: 'Before 10:00 AM IST',
  DINNER: 'Before 5:00 PM IST',
});

const MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'];

const MEAL_LABELS = Object.freeze({
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
});

const MEAL_TIMINGS = Object.freeze({
  BREAKFAST: '07:30 AM – 09:30 AM',
  LUNCH: '12:30 PM – 02:30 PM',
  DINNER: '07:30 PM – 09:30 PM',
});

const MIN_WEEKLY_BOOKING_AMOUNT = 476;

const INSTITUTIONAL_DOMAIN = '@iiit-bh.ac.in';

module.exports = {
  MEAL_PRICES,
  SAME_DAY_MEAL_PRICES,
  SAME_DAY_CUTOFF_HOURS_IST,
  SAME_DAY_CUTOFF_LABELS,
  MEAL_TYPES,
  MEAL_LABELS,
  MEAL_TIMINGS,
  MIN_WEEKLY_BOOKING_AMOUNT,
  INSTITUTIONAL_DOMAIN,
};
