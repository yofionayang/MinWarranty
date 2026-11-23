// Dashboard: lists, searches, filters, sorts, adds, edits, and deletes warranties.
// All data goes through the `api` object. All user-supplied text is inserted
// with textContent, never innerHTML, to prevent HTML injection (XSS).

import { api, ApiError } from './warranty-validation.js';
import { LIMITS, validateWarranty } from './warranty-validation.js';
import{
    describeRemaining,
    formatDate,
    getDaysRemaining,
    getExpiryDate,
    getStatus,
    getToday,
    toIsoDate
} from './warranty-dates.js';

const STATUS_LABELS = {
    active: 'Active',
    expiring: 'Expiring soon',
    expired: 'Expired'
};

const FIELD_NAMES = [
    'productName',
    'purchaseDate',
    'warrantyDuration',
    'retailer',
    'serialNumber',
    'notes'
];

const SORTERS = {
  'expiry-asc': (a, b) => a.expiryDate.localeCompare(b.expiryDate),
  'expiry-desc': (a, b) => b.expiryDate.localeCompare(a.expiryDate),
  'purchase-desc': (a, b) => b.purchaseDate.localeCompare(a.purchaseDate),
  'name-asc': (a, b) =>
    a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' })
};