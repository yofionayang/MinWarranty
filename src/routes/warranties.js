const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const router = express.Router();
router.use(requireAuth);

// CRUD routes are placeholders for the next milestone.
// IMPORTANT: every operation must filter by req.session.userId.
router.get('/', (req, res) => res.json({ warranties: [], note: 'Warranty storage is not implemented yet.' }));
router.post('/', (req, res) => res.status(501).json({ error: 'Create warranty not implemented yet.' }));
router.put('/:id', (req, res) => res.status(501).json({ error: 'Update warranty not implemented yet.' }));
router.delete('/:id', (req, res) => res.status(501).json({ error: 'Delete warranty not implemented yet.' }));
module.exports = router;
