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

const elements = {
  heading: document.getElementById('warranties-heading'),
  list: document.getElementById('warrantyList'),
  emptyState: document.getElementById('emptyState'),
  noResults: document.getElementById('noResults'),
  count: document.getElementById('warrantyCount'),
  totalCount: document.getElementById('totalCount'),
  expiringCount: document.getElementById('expiringCount'),
  expiredCount: document.getElementById('expiredCount'),
  search: document.getElementById('searchWarranties'),
  filterStatus: document.getElementById('filterStatus'),
  sort: document.getElementById('sortWarranties'),
  addButton: document.getElementById('addWarranty'),
  addFirstButton: document.getElementById('addFirstWarranty'),
  warrantyDialog: document.getElementById('warrantyDialog'),
  dialogHeading: document.getElementById('warrantyDialogHeading'),
  form: document.getElementById('warrantyForm'),
  formError: document.getElementById('warrantyFormError'),
  saveButton: document.getElementById('saveWarranty'),
  cancelButton: document.getElementById('cancelWarranty'),
  deleteDialog: document.getElementById('deleteDialog'),
  deleteName: document.getElementById('deleteProductName'),
  deleteError: document.getElementById('deleteError'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete')
};

// the hidden id field plus one element per form field
const fields = Object.fromEntries(
    ['warrantyId', ...FIELD_NAMES].map(name => [name, document.getElementById(name)])
);



