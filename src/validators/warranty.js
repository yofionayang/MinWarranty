
const LIMITS = {
  productName: 100,
  retailer: 100,
  serialNumber: 100,
  notes: 500,
  maxMonths: 600,
  earliestPurchase: '1990-01-01'
};

function validateWarranty(input) {
  const errors = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      values: {},
      errors: { productName: 'Invalid warranty information.' }
    };
  }

  const values = {
    productName: typeof input.productName === 'string'
      ? input.productName.trim() : '',
    purchaseDate: typeof input.purchaseDate === 'string'
      ? input.purchaseDate : '',
    warrantyDuration: input.warrantyDuration,
    retailer: typeof input.retailer === 'string'
      ? input.retailer.trim() : '',
    serialNumber: typeof input.serialNumber === 'string'
      ? input.serialNumber.trim() : '',
    notes: typeof input.notes === 'string'
      ? input.notes.trim() : ''
  };

  if (!values.productName) {
    errors.productName = 'Enter a product name.';
  } else if (values.productName.length > LIMITS.productName) {
    errors.productName = "Product name can't exceed 100 characters.";
  }

  const date = values.purchaseDate;
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00.000Z`)
    : null;

  const validDate = parsedDate &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date;

  const today = new Date().toISOString().slice(0, 10);

  if (!date) {
    errors.purchaseDate = 'Enter a purchase date.';
  } else if (!validDate) {
    errors.purchaseDate = 'Enter a valid purchase date.';
  } else if (date > today) {
    errors.purchaseDate = "Purchase date can't be in the future.";
  } else if (date < LIMITS.earliestPurchase) {
    errors.purchaseDate = "Purchase date can't be before 1990.";
  }

  if (!Number.isInteger(values.warrantyDuration) ||
      values.warrantyDuration < 1) {
    errors.warrantyDuration = 'Choose a warranty duration.';
  } else if (values.warrantyDuration > LIMITS.maxMonths) {
    errors.warrantyDuration = "Warranty duration can't exceed 50 years.";
  }

  for (const [field, label, limit] of [
    ['retailer', 'Retailer', LIMITS.retailer],
    ['serialNumber', 'Serial number', LIMITS.serialNumber],
    ['notes', 'Notes', LIMITS.notes]
  ]) {
    if (values[field].length > limit) {
      errors[field] = `${label} can't exceed ${limit} characters.`;
    }
  }

  return { values, errors };
}

module.exports = { validateWarranty };
