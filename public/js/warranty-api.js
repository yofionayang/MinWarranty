// Data layer for warranties. The dashboard only talks to the `api` object at
// the bottom of this file, so switching from the mock to the real backend is
// one line: set USE_MOCK_API to false.
//
// Contract (JSON, camelCase field names):
//   GET    /api/warranties       -> { warranties: [...] }
//   POST   /api/warranties       -> { warranty }
//   PUT    /api/warranties/:id   -> { warranty }
//   DELETE /api/warranties/:id   -> 204, no body
//   Validation failure (400)     -> { errors: { fieldName: "message" } }
//   Any other failure            -> { error: "message" }
// State-changing requests send the CSRF token in the X-CSRF-Token header.

import { addMonths, getToday, toIsoDate } from './warranty-dates.js';
import { validateWarranty } from './warranty-validation.js';

// Set to false once the backend serves /api/warranties.
const USE_MOCK_API = true;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SIMULATED_DELAY_MS = 150;

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// ---------- Real backend ----------

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf', { cache: 'no-store' });

  if (!response.ok) {
    throw new ApiError('Could not start a secure request.', { status: response.status });
  }

  const { csrfToken } = await response.json();
  return csrfToken;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};

  // Fetch a fresh token for every change: logging in replaces the session,
  // which invalidates any token fetched earlier.
  if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrfToken();
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.error || 'Request failed.', {
      status: response.status,
      fieldErrors: data?.errors ?? null
    });
  }

  return data;
}

function createHttpApi() {
  return {
    async list() {
      const data = await request('/api/warranties');
      return data.warranties;
    },

    async create(fields) {
      const data = await request('/api/warranties', { method: 'POST', body: fields });
      return data.warranty;
    },

    async update(id, fields) {
      const data = await request(`/api/warranties/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: fields
      });
      return data.warranty;
    },

    async remove(id) {
      await request(`/api/warranties/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
  };
}

// ---------- Mock backend (in memory, resets on reload) ----------

// A purchase date that makes the warranty expire in `daysUntilExpiry` days
// (negative means it expired that many days ago).
function purchaseDateFor(months, daysUntilExpiry) {
  const base = addMonths(getToday(), -months);
  return toIsoDate(new Date(base.getTime() + daysUntilExpiry * MS_PER_DAY));
}

function createSeedData() {
  return [
    {
      id: crypto.randomUUID(),
      productName: 'Sony WH-1000XM5 Headphones',
      purchaseDate: purchaseDateFor(24, 400),
      warrantyDuration: 24,
      retailer: 'Best Buy',
      serialNumber: 'SN-8841-2207',
      notes: 'Receipt is in the blue folder.'
    },
    {
      id: crypto.randomUUID(),
      productName: 'LG 27-inch Monitor',
      purchaseDate: purchaseDateFor(36, 18),
      warrantyDuration: 36,
      retailer: 'Costco',
      serialNumber: '',
      notes: ''
    },
    {
      id: crypto.randomUUID(),
      productName: 'Dyson V15 Vacuum',
      purchaseDate: purchaseDateFor(24, -45),
      warrantyDuration: 24,
      retailer: 'Dyson',
      serialNumber: 'DY-5521-0090',
      notes: 'Registered online.'
    },
    {
      id: crypto.randomUUID(),
      productName: 'MacBook Air',
      purchaseDate: purchaseDateFor(12, 200),
      warrantyDuration: 12,
      retailer: 'Apple',
      serialNumber: '',
      notes: ''
    }
  ];
}

function createMockApi() {
  let warranties = createSeedData();

  const pause = () => new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY_MS));
  const copy = warranty => ({ ...warranty });

  // Same rules the real server applies.
  function validated(fields) {
    const { values, errors } = validateWarranty(fields);

    if (Object.keys(errors).length > 0) {
      throw new ApiError('Please fix the highlighted fields.', {
        status: 400,
        fieldErrors: errors
      });
    }

    return values;
  }

  return {
    async list() {
      await pause();
      return warranties.map(copy);
    },

    async create(fields) {
      await pause();
      const warranty = { id: crypto.randomUUID(), ...validated(fields) };
      warranties.push(warranty);
      return copy(warranty);
    },

    async update(id, fields) {
      await pause();
      const values = validated(fields);
      const index = warranties.findIndex(warranty => warranty.id === id);

      if (index === -1) throw new ApiError('Warranty not found.', { status: 404 });

      warranties[index] = { id, ...values };
      return copy(warranties[index]);
    },

    async remove(id) {
      await pause();
      const remaining = warranties.filter(warranty => warranty.id !== id);

      if (remaining.length === warranties.length) {
        throw new ApiError('Warranty not found.', { status: 404 });
      }

      warranties = remaining;
    }
  };
}

export const api = USE_MOCK_API ? createMockApi() : createHttpApi();
