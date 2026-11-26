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

function createElement(tag, className, text) { // creates an HTML element with an optional CSS class and text content
  const element = document.createElement(tag); //creates a new HTML element using the specified tag (div, button, h2 etc.)

  // if a CSS class was provided, assign it to the element
  // this allows the element to be stled using css
  if (className) element.className = className;
  //if text was provided, set it as the element's text content
  //checking against the undefined allows empty strings to be used intentionally
  if (text !== undefined) element.textContent = text;

  return element; // return the completed elements so other functions can use it
}

function createDetail(label, value, isoDate) { // creates a row displaying a warranty detail
  const row = createElement('div'); // create div for entire detail row
  const description = createElement('dd'); // create description element with actual value

  if (isoDate) { // create a time element if date exists
    const time = createElement('time', '', value); // create <time> element
    time.dateTime = isoDate;
    description.append(time);
  } else { // if no ISO data, display time as text
    description.textContent = value;
  }

  row.append(createElement('dt', '', label), description);
  return row;
}

function createActions(item) { // creates the edit and delete buttons for a warranty card
  const actions = createElement('div', 'warranty-actions');

  const edit = createElement('button', 'edit-warranty', 'Edit');
  edit.type = 'button'; // this button should not submit form when clicked
  edit.setAttribute('aria-label', `Edit ${item.productName}`); // accessibility

  const remove = createElement('button', 'delete-warranty', 'Delete'); // create delete button
  remove.type = 'button';
  remove.setAttribute('aria-label', `Delete ${item.productName}`);

  actions.append(edit, remove); // add both button to the actions container
  return actions;
}

function createCard(item) { // creates the complete HTML card for a single warranty
  const card = createElement('li', 'warranty-card'); //<li> element represents warranty card
  card.dataset.id = item.id; // store the warranty's unique id in a data attribute

  const header = createElement('div', 'warranty-card-header');
  header.append( // add the product name and its current status to the warranty card
    createElement('h2', '', item.productName),
    createElement('span', `status-badge status-${item.status}`, STATUS_LABELS[item.status])
  );

  const details = createElement('dl', 'warranty-details'); 
  details.append(// add the main warranty details to the description list
    createDetail('Purchased', formatDate(item.purchaseDate), item.purchaseDate),
    createDetail('Expires', formatDate(item.expiryDate), item.expiryDate),
    createDetail(
      item.daysRemaining < 0 ? 'Expired' : 'Remaining',
      describeRemaining(item.daysRemaining)
    )
  );

  if (item.retailer) details.append(createDetail('Retailer', item.retailer));
  if (item.serialNumber) details.append(createDetail('Serial number', item.serialNumber));

  card.append(header, details); // add the header and warranty details to the main card

  if (item.notes) card.append(createElement('p', 'warranty-notes', item.notes));

  card.append(createActions(item));
  return card;
}

// ---------- Filtering, sorting, and rendering ----------

// Add the calculated fields (expiry date, days remaining, status) to a warranty.
function toViewModel(warranty, today) {
  const expiryDate = getExpiryDate(warranty.purchaseDate, warranty.warrantyDuration);
  const daysRemaining = getDaysRemaining(expiryDate, today);

  return { // return a new object containing the original warranty information along with calculated fields
    ...warranty,
    retailer: warranty.retailer ?? '',
    serialNumber: warranty.serialNumber ?? '',
    notes: warranty.notes ?? '',
    expiryDate,
    daysRemaining,
    status: getStatus(daysRemaining)
  };
}

function getVisibleItems(items) { // filters and sorts the warranties based on the user's selected options
  const query = elements.search.value.trim().toLowerCase();
  const status = elements.filterStatus.value;
  const sorter = SORTERS[elements.sort.value] ?? SORTERS['expiry-asc']; // get sorting function selected by the user

  return items // start with the original list of warranty items
    .filter(item => status === 'all' || item.status === status) // only keep warranties matching the selected value
    .filter( // check whether the search text matches
      item =>
        !query ||
        [item.productName, item.retailer].some(text => text.toLowerCase().includes(query))
    )
    .sort(sorter); // sort the remaining warranites using the selected sorting functions
}

// The summary always counts every warranty, regardless of the search and filter.
function renderSummary(items) {
  elements.totalCount.textContent = items.length;
  elements.expiringCount.textContent = items.filter(item => item.status === 'expiring').length;
  elements.expiredCount.textContent = items.filter(item => item.status === 'expired').length;
}

function render() { // main rendering function. updates the webpage whenever the warranty information or display options change
  const today = getToday();
  const items = warranties.map(warranty => toViewModel(warranty, today)); // convert every original warranty into a view model
  const visible = getVisibleItems(items); // apply the selected search, status, and sorting options
  const hasWarranties = items.length > 0; // check whether at least one warranty exists

  renderSummary(items); // update the summary counters using ALL warranties
  elements.list.replaceChildren(...visible.map(createCard));

  elements.emptyState.hidden = hasWarranties;
  elements.noResults.hidden = !hasWarranties || visible.length > 0;

  elements.count.textContent = hasWarranties 
    ? `Showing ${visible.length} of ${items.length} ${items.length === 1 ? 'warranty' : 'warranties'}`
    : ''; // if no warranties display the empty string
}

// ---------- Add / edit form ----------

function setFieldError(name, message) { // displays an error message for a specific form field
  document.getElementById(`${name}Error`).textContent = message; 
  fields[name].setAttribute('aria-invalid', String(Boolean(message))); // accessibility
}

function clearFormErrors() { // removes all validation errors from the form
  FIELD_NAMES.forEach(name => setFieldError(name, ''));
  elements.formError.textContent = '';
}

function showFieldErrors(errors) { // displays validation errors after user attempts to submit the form
  FIELD_NAMES.forEach(name => setFieldError(name, errors[name] || '')); // loop through every form field. if an error exists, display it. Otherwise, display an empty string (clear previous errors)
  elements.formError.textContent = errors.form || ''; 

  const firstInvalid = FIELD_NAMES.find(name => errors[name]); // find the first field that contains a validation error. find() returns the first matching field name
  if (firstInvalid) fields[firstInvalid].focus(); // if an invalid field was found, move cursoe to it.
}

// Make sure the duration dropdown can show a length that is not in its list.
function ensureDurationOption(months) { 
  const value = String(months);
  const exists = [...fields.warrantyDuration.options].some(option => option.value === value);

  if (!exists) {
    fields.warrantyDuration.append(new Option(`${months} months`, value));
  }
}

function fillForm(warranty) { // fills the form with info from an existing warranty (used for editing)
  ensureDurationOption(warranty.warrantyDuration);
  // populate each form field using the existing warranty information
  fields.productName.value = warranty.productName;
  fields.purchaseDate.value = warranty.purchaseDate;
  fields.warrantyDuration.value = String(warranty.warrantyDuration);
  fields.retailer.value = warranty.retailer ?? ''; //optional
  fields.serialNumber.value = warranty.serialNumber ?? ''; //optional
  fields.notes.value = warranty.notes ?? ''; //optional
}

function readForm() { // collects the values entered into the form and returns them as objects
  return {
    productName: fields.productName.value,
    purchaseDate: fields.purchaseDate.value,
    warrantyDuration: Number(fields.warrantyDuration.value),
    retailer: fields.retailer.value,
    serialNumber: fields.serialNumber.value,
    notes: fields.notes.value
  };
}

function openForm(warranty = null) { // opens the warranty form for creating or editing a warranty
  elements.form.reset(); // resets all form fields to default values
  clearFormErrors();

  // form.reset() does not clear a hidden input once its value has been set,
  // so the id is always set explicitly. A leftover id would turn "Add" into
  // an update of the last warranty that was edited.
  fields.warrantyId.value = warranty ? warranty.id : '';

  fields.purchaseDate.min = LIMITS.earliestPurchase; // sets the earliest date the user is allowed to select
  fields.purchaseDate.max = toIsoDate(getToday()); //set the earliest date the user is allowed to select
  elements.dialogHeading.textContent = warranty ? 'Edit warranty' : 'Add warranty'; // change the dialog header depending on what the user is doing

  if (warranty) fillForm(warranty); // if an existing warranty was provided, populate the form with its info

  elements.warrantyDialog.showModal(); //diaplay the form in a modal dialog (above the reest of the webpage)
}

function getSaveErrorMessage(error) { // determines which error message should be displayed when saving a warranty fails
  return error instanceof ApiError
    ? error.message
    : 'Could not save the warranty. Please try again.';
}

async function handleSubmit(event) { // handles the form submission when the user clicks save
  event.preventDefault();
  clearFormErrors();

  const { values, errors } = validateWarranty(readForm()); // read the form values and validate them

  if (Object.keys(errors).length > 0) { // check if any errors exist
    showFieldErrors(errors);
    return;
  }

  const id = fields.warrantyId.value; // get the warranty ID from the hidden form field

  // Prevent multiple submissions.
  elements.saveButton.disabled = true;

  try { // save warranty using appropriate API operation
    const saved = id ? await api.update(id, values) : await api.create(values);

    warranties = id // update the local warranties array with the saved warranty
      ? warranties.map(item => (item.id === id ? saved : item)) // edit: loop through existing warranties, replace the matching id with new info
      : [...warranties, saved]; // add: create a new array followed by the newly created warranty

    elements.warrantyDialog.close(); // close the form dialog
    render(); // refresh the webpage to display updated warranty info
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

function openDeleteDialog(warranty) { //opens confirmation dialog when the user wants to delete a warranty
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

async function handleConfirmDelete() { // Handles the deletion after the user confirms that they want to delete a warranty.
  if (!pendingDeleteId) return; // check whether a warranty ID is currently stored

  const id = pendingDeleteId; // store the id of warranty to be deleted
  elements.confirmDelete.disabled = true; // disable delete button to avoid multiple delete requests

  try {
    await api.remove(id); // send deletion request to the API

    warranties = warranties.filter(item => item.id !== id); // removes the deleted warranty from the local warranties array

    elements.deleteDialog.close(); // close confirmation dialog
    render(); // refresh page
    focusHeading(); // move keyboard focus to main heading
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

async function loadWarranties() { // loads the user's warranties from the API when the application starts
  elements.count.textContent = 'Loading warranties...';

  try { 
    warranties = await api.list();// request all warranties belonging to the user from the API
    render(); // refresh the page
  } catch (error) {
    if (error.status === 401) return redirectToLogin();

    elements.count.textContent =
      'Could not load your warranties. Refresh the page to try again.';
  }
}

function init() { // initialize the application by preparing the webpage
  // Remove the sample card and placeholder numbers that the HTML ships with.
  elements.list.replaceChildren(); // removes the sample info present in the HTML files
  [elements.totalCount, elements.expiringCount, elements.expiredCount].forEach(
    element => (element.textContent = '-')
  );

  elements.list.addEventListener('click', event => { // add event listener to entire warranty list
    const button = event.target.closest('button'); // find closest button containing the clicked element
    const card = event.target.closest('.warranty-card');

    if (!button || !card) return;

    const warranty = warranties.find(item => item.id === card.dataset.id); // find the original warranty object that belongs to the clicked card
    if (!warranty) return; // if no matching warranty, stop the function

    // Check whether the clicked button has the CSS class "edit-warranty".
    // If it does, open the form and populate it with the warranty information.
    if (button.classList.contains('edit-warranty')) openForm(warranty);

    // Check whether the clicked button has the CSS class "delete-warranty".
    // If it does, open the deletion confirmation dialog for that warranty.
    if (button.classList.contains('delete-warranty')) openDeleteDialog(warranty);
  });

  // Add an input event listener to the search, status filter, and sorting controls.
  // Whenever the user changes one of these controls, call render()
  // to update the displayed warranty list.
  //
  // input works for both text inputs and select controls.
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
    pendingDeleteId = null; // clear the stored warranty id
  });

  loadWarranties(); // load the users warranties from the API
}

init(); // start the application
