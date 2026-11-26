
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { validateWarranty } = require('../validators/warranty');
const warrantyStorage = require('../services/warrantyStorage');

const router = express.Router();

router.use(requireAuth);

// GET /api/warranties
// Return only the authenticated user's warranties.
router.get('/', async (req, res, next) => {
  try {
    const warranties = await warrantyStorage.list(req.session.userId);

    // Do not expose internal user IDs to the frontend.
    const result = warranties.map(({ userId, ...warranty }) => warranty);

    res.json({ warranties: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/warranties
// Validate and create a warranty.
router.post('/', async (req, res, next) => {
  try {
    const { values, errors } = validateWarranty(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const warranty = await warrantyStorage.create(
      req.session.userId,
      values
    );

    const { userId, ...result } = warranty;

    res.status(201).json({ warranty: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/warranties/:id
// Update an existing warranty.
router.put('/:id', async (req, res, next) => {
  try {
    const { values, errors } = validateWarranty(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const warranty = await warrantyStorage.update(
      req.session.userId,
      req.params.id,
      values
    );

    if (!warranty) {
      return res.status(404).json({ error: 'Warranty not found.' });
    }

    const { userId, ...result } = warranty;

    res.json({ warranty: result });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/warranties/:id
// Delete an existing warranty.
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await warrantyStorage.remove(
      req.session.userId,
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Warranty not found.' });
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
