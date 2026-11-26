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