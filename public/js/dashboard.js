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

let warranties = [];
let pendingDeleteId = null;

function redirectToLogin(){
    window.location.assign('/login.html');
}

// ------------- building the list ----------------

function createElement(tag, className, text){
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function createDetail(label, value, isoDate){
    const row = createElement('div');
    const description = createElement('dd');

    if (isoDate){
        const time = createElement('time', '', value);
        time.dateTime = isoDate;
        description.append(time);
    } else {
        description.textContent = value;
    }

    row.append(createElement('dt', '', label), description);
    return row;
}

function createActions(item){
    const actions = createElement('div', 'warranty-actions');

    const edit = createElement('button', 'edit-warranty', "Edit");
    edit.type = 'button';
    edit.setAttribute('aria-label', `Edit ${item.productName}`);

    const remove = createElement('button', 'delete-warranty', 'Delete');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${item.productName}`);

    actions.append(edit, remove);
    return actions;
}

function createCard(item){
    const card = createElement('li', 'warranty-card');
    card.dataset.id = item.id;

    const header = createElement('div', 'warranty-card-header');
    header.append(
        createElement('h2', '', item.productName),
        createElement('span', `status-badge status-${item.status}`, STATUS_LABELS[item.status])
    );

    if (item.retailer) details.append(createDetail('Retailer', item.retailer));
    if (item.serialNumber) details.append(createDetail('Serial number', item.serialNumber));

    card.append(header, details);

    if (item.notes) card.append(createElement('p', 'warranty-notes', item.notes));

    card.append(createActions(item));
    return card;
}

