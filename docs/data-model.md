# Planned data model

Users: `{ id, email, passwordHash }`

Warranties (planned): `{ id, userId, productName, purchaseDate, expiryDate, notes }`

All warranty reads and writes MUST check `userId` against the logged-in session user.
