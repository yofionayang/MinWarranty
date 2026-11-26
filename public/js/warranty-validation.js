// Client-side validation for the add/edit warranty form.
// This gives instant feedback only. The server must repeat every check,
// because anything in the browser can be bypassed.

import { getToday, parseIsoDate, toIsoDate } from './warranty-dates.js';

export const LIMITS = {
  productName: 100,
  retailer: 100,
  serialNumber: 100,
  notes: 500,
  maxMonths: 600,
  earliestPurchase: '1990-01-01'
};

const OPTIONAL_TEXT_FIELDS = [
  ['retailer', 'Retailer'],
  ['serialNumber', 'Serial number'],
  ['notes', 'Notes']
];

// Check and clean the form input. Returns { values, errors }.
export function validateWarranty(input) {
  const errors = {};

  const values = {
    productName: String(input.productName ?? '').trim(),
    purchaseDate: String(input.purchaseDate ?? ''),
    warrantyDuration: input.warrantyDuration,
    retailer: String(input.retailer ?? '').trim(),
    serialNumber: String(input.serialNumber ?? '').trim(),
    notes: String(input.notes ?? '').trim()
  };

  if (!values.productName) {
    errors.productName = 'Enter a product name.';
  } else if (values.productName.length > LIMITS.productName) {
    errors.productName = `Product name can't exceed ${LIMITS.productName} characters.`;
  }

  if (values.purchaseDate === '') {
    errors.purchaseDate = 'Enter a purchase date.';
  } else if (!parseIsoDate(values.purchaseDate)) {
    errors.purchaseDate = 'Enter a valid purchase date.';
  } else if (values.purchaseDate > toIsoDate(getToday())) {
    errors.purchaseDate = "Purchase date can't be in the future.";
  } else if (values.purchaseDate < LIMITS.earliestPurchase) {
    errors.purchaseDate = "Purchase date can't be before 1990.";
  }

  if (!Number.isInteger(values.warrantyDuration) || values.warrantyDuration < 1) {
    errors.warrantyDuration = 'Choose a warranty duration.';
  } else if (values.warrantyDuration > LIMITS.maxMonths) {
    errors.warrantyDuration = "Warranty duration can't exceed 50 years.";
  }

  OPTIONAL_TEXT_FIELDS.forEach(([field, label]) => {
    if (values[field].length > LIMITS[field]) {
      errors[field] = `${label} can't exceed ${LIMITS[field]} characters.`;
    }
  });

  return { values, errors };
}
