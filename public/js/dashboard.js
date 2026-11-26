// Dashboard: lists, searches, filters, sorts, adds, edits, and deletes warranties.
// All data goes through the `api` object. All user-supplied text is inserted
// with textContent, never innerHTML, to prevent HTML injection (XSS).

import { api, ApiError } from './warranty-api.js';
import { LIMITS, validateWarranty } from './warranty-validation.js';
import {
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

// The hidden id field plus one element per form field.
const fields = Object.fromEntries(
  ['warrantyId', ...FIELD_NAMES].map(name => [name, document.getElementById(name)])
);

let warranties = [];
let pendingDeleteId = null;

function redirectToLogin() {
  window.location.assign('/login.html');
}

// ---------- Building the list ----------

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function createDetail(label, value, isoDate) {
  const row = createElement('div');
  const description = createElement('dd');

  if (isoDate) {
    const time = createElement('time', '', value);
    time.dateTime = isoDate;
    description.append(time);
  } else {
    description.textContent = value;
  }

  row.append(createElement('dt', '', label), description);
  return row;
}

function createActions(item) {
  const actions = createElement('div', 'warranty-actions');

  const edit = createElement('button', 'edit-warranty', 'Edit');
  edit.type = 'button';
  edit.setAttribute('aria-label', `Edit ${item.productName}`);

  const remove = createElement('button', 'delete-warranty', 'Delete');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Delete ${item.productName}`);

  actions.append(edit, remove);
  return actions;
}

function createCard(item) {
  const card = createElement('li', 'warranty-card');
  card.dataset.id = item.id;

  const header = createElement('div', 'warranty-card-header');
  header.append(
    createElement('h2', '', item.productName),
    createElement('span', `status-badge status-${item.status}`, STATUS_LABELS[item.status])
  );

  const details = createElement('dl', 'warranty-details');
  details.append(
    createDetail('Purchased', formatDate(item.purchaseDate), item.purchaseDate),
    createDetail('Expires', formatDate(item.expiryDate), item.expiryDate),
    createDetail(
      item.daysRemaining < 0 ? 'Expired' : 'Remaining',
      describeRemaining(item.daysRemaining)
    )
  );

  if (item.retailer) details.append(createDetail('Retailer', item.retailer));
  if (item.serialNumber) details.append(createDetail('Serial number', item.serialNumber));

  card.append(header, details);

  if (item.notes) card.append(createElement('p', 'warranty-notes', item.notes));

  card.append(createActions(item));
  return card;
}

// ---------- Filtering, sorting, and rendering ----------

// Add the calculated fields (expiry date, days remaining, status) to a warranty.
function toViewModel(warranty, today) {
  const expiryDate = getExpiryDate(warranty.purchaseDate, warranty.warrantyDuration);
  const daysRemaining = getDaysRemaining(expiryDate, today);

  return {
    ...warranty,
    retailer: warranty.retailer ?? '',
    serialNumber: warranty.serialNumber ?? '',
    notes: warranty.notes ?? '',
    expiryDate,
    daysRemaining,
    status: getStatus(daysRemaining)
  };
}

function getVisibleItems(items) {
  const query = elements.search.value.trim().toLowerCase();
  const status = elements.filterStatus.value;
  const sorter = SORTERS[elements.sort.value] ?? SORTERS['expiry-asc'];

  return items
    .filter(item => status === 'all' || item.status === status)
    .filter(
      item =>
        !query ||
        [item.productName, item.retailer].some(text => text.toLowerCase().includes(query))
    )
    .sort(sorter);
}

// The summary always counts every warranty, regardless of the search and filter.
function renderSummary(items) {
  elements.totalCount.textContent = items.length;
  elements.expiringCount.textContent = items.filter(item => item.status === 'expiring').length;
  elements.expiredCount.textContent = items.filter(item => item.status === 'expired').length;
}

function render() {
  const today = getToday();
  const items = warranties.map(warranty => toViewModel(warranty, today));
  const visible = getVisibleItems(items);
  const hasWarranties = items.length > 0;

  renderSummary(items);
  elements.list.replaceChildren(...visible.map(createCard));

  elements.emptyState.hidden = hasWarranties;
  elements.noResults.hidden = !hasWarranties || visible.length > 0;

  elements.count.textContent = hasWarranties
    ? `Showing ${visible.length} of ${items.length} ${items.length === 1 ? 'warranty' : 'warranties'}`
    : '';
}

// ---------- Add / edit form ----------

function setFieldError(name, message) {
  document.getElementById(`${name}Error`).textContent = message;
  fields[name].setAttribute('aria-invalid', String(Boolean(message)));
}

function clearFormErrors() {
  FIELD_NAMES.forEach(name => setFieldError(name, ''));
  elements.formError.textContent = '';
}

function showFieldErrors(errors) {
  FIELD_NAMES.forEach(name => setFieldError(name, errors[name] || ''));
  elements.formError.textContent = errors.form || '';

  const firstInvalid = FIELD_NAMES.find(name => errors[name]);
  if (firstInvalid) fields[firstInvalid].focus();
}

// Make sure the duration dropdown can show a length that is not in its list.
function ensureDurationOption(months) {
  const value = String(months);
  const exists = [...fields.warrantyDuration.options].some(option => option.value === value);

  if (!exists) {
    fields.warrantyDuration.append(new Option(`${months} months`, value));
  }
}

function fillForm(warranty) {
  ensureDurationOption(warranty.warrantyDuration);

  fields.warrantyId.value = warranty.id;
  fields.productName.value = warranty.productName;
  fields.purchaseDate.value = warranty.purchaseDate;
  fields.warrantyDuration.value = String(warranty.warrantyDuration);
  fields.retailer.value = warranty.retailer ?? '';
  fields.serialNumber.value = warranty.serialNumber ?? '';
  fields.notes.value = warranty.notes ?? '';
}

function readForm() {
  return {
    productName: fields.productName.value,
    purchaseDate: fields.purchaseDate.value,
    warrantyDuration: Number(fields.warrantyDuration.value),
    retailer: fields.retailer.value,
    serialNumber: fields.serialNumber.value,
    notes: fields.notes.value
  };
}

function openForm(warranty = null) {
  elements.form.reset();
  clearFormErrors();

  fields.purchaseDate.min = LIMITS.earliestPurchase;
  fields.purchaseDate.max = toIsoDate(getToday());
  elements.dialogHeading.textContent = warranty ? 'Edit warranty' : 'Add warranty';

  if (warranty) fillForm(warranty);

  elements.warrantyDialog.showModal();
}

function getSaveErrorMessage(error) {
  return error instanceof ApiError
    ? error.message
    : 'Could not save the warranty. Please try again.';
}

async function handleSubmit(event) {
  event.preventDefault();
  clearFormErrors();

  const { values, errors } = validateWarranty(readForm());

  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  const id = fields.warrantyId.value;

  // Prevent multiple submissions.
  elements.saveButton.disabled = true;

  try {
    const saved = id ? await api.update(id, values) : await api.create(values);

    warranties = id
      ? warranties.map(item => (item.id === id ? saved : item))
      : [...warranties, saved];

    elements.warrantyDialog.close();
    render();
  } catch (error) {
    if (error.status === 401) return redirectToLogin();

    if (error.fieldErrors) {
      showFieldErrors(error.fieldErrors);
    } else {
      elements.formError.textContent = getSaveErrorMessage(error);
    }
  } finally {
    elements.saveButton.disabled = false;
  }
}

// ---------- Delete ----------

function openDeleteDialog(warranty) {
  pendingDeleteId = warranty.id;
  elements.deleteName.textContent = warranty.productName;
  elements.deleteError.textContent = '';
  elements.deleteDialog.showModal();
}

// The deleted card no longer exists, so move focus somewhere sensible.
function focusHeading() {
  elements.heading.setAttribute('tabindex', '-1');
  elements.heading.focus();
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  elements.confirmDelete.disabled = true;

  try {
    await api.remove(id);

    warranties = warranties.filter(item => item.id !== id);

    elements.deleteDialog.close();
    render();
    focusHeading();
  } catch (error) {
    if (error.status === 401) return redirectToLogin();

    elements.deleteError.textContent =
      error instanceof ApiError
        ? error.message
        : 'Could not delete the warranty. Please try again.';
  } finally {
    elements.confirmDelete.disabled = false;
  }
}

// ---------- Loading and wiring ----------

async function loadWarranties() {
  elements.count.textContent = 'Loading warranties...';

  try {
    warranties = await api.list();
    render();
  } catch (error) {
    if (error.status === 401) return redirectToLogin();

    elements.count.textContent =
      'Could not load your warranties. Refresh the page to try again.';
  }
}

function init() {
  // Remove the sample card and placeholder numbers that the HTML ships with.
  elements.list.replaceChildren();
  [elements.totalCount, elements.expiringCount, elements.expiredCount].forEach(
    element => (element.textContent = '-')
  );

  elements.list.addEventListener('click', event => {
    const button = event.target.closest('button');
    const card = event.target.closest('.warranty-card');

    if (!button || !card) return;

    const warranty = warranties.find(item => item.id === card.dataset.id);
    if (!warranty) return;

    if (button.classList.contains('edit-warranty')) openForm(warranty);
    if (button.classList.contains('delete-warranty')) openDeleteDialog(warranty);
  });

  [elements.search, elements.filterStatus, elements.sort].forEach(control =>
    control.addEventListener('input', render)
  );

  elements.addButton.addEventListener('click', () => openForm());
  elements.addFirstButton.addEventListener('click', () => openForm());
  elements.form.addEventListener('submit', handleSubmit);
  elements.cancelButton.addEventListener('click', () => elements.warrantyDialog.close());

  elements.cancelDelete.addEventListener('click', () => elements.deleteDialog.close());
  elements.confirmDelete.addEventListener('click', handleConfirmDelete);
  elements.deleteDialog.addEventListener('close', () => {
    pendingDeleteId = null;
  });

  loadWarranties();
}

init();
