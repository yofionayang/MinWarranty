// Date and status helpers for warranties.
// Dates are calendar dates ("YYYY-MM-DD") handled in UTC so that time zones
// and daylight saving time can never shift a day.

// A warranty with this many days or fewer left (and not yet expired) is "expiring soon".
export const EXPIRING_SOON_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC'
});

// Turn "YYYY-MM-DD" into a Date at UTC midnight, or null if it is not a real date.
export function parseIsoDate(value) {
  if (typeof value !== 'string') return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isRealDate ? date : null;
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Today's calendar date in the user's time zone, at UTC midnight.
export function getToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Add months without overflowing: Jan 31 + 1 month is Feb 28 (or Feb 29).
export function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(Date.UTC(year, month, day));
}

export function getExpiryDate(purchaseIsoDate, months) {
  return toIsoDate(addMonths(parseIsoDate(purchaseIsoDate), months));
}

export function getDaysRemaining(expiryIsoDate, today = getToday()) {
  return Math.round((parseIsoDate(expiryIsoDate) - today) / MS_PER_DAY);
}

// One definition of "status" for the badges, the filter, and the summary counts.
export function getStatus(daysRemaining) {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= EXPIRING_SOON_DAYS) return 'expiring';
  return 'active';
}

export function formatDate(isoDate) {
  return DATE_FORMAT.format(parseIsoDate(isoDate));
}

// "478 days", "1 day", "Expires today", or "45 days ago" for expired warranties.
export function describeRemaining(daysRemaining) {
  if (daysRemaining === 0) return 'Expires today';

  const days = Math.abs(daysRemaining);
  const label = `${days} ${days === 1 ? 'day' : 'days'}`;

  return daysRemaining > 0 ? label : `${label} ago`;
}
