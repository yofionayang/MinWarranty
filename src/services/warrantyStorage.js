
const { randomUUID } = require('crypto');
const { readCollection, writeCollection } = require('./jsonStore');

// Get warranties belonging to one user.
async function list(userId) {
  const warranties = await readCollection('warranties');

  return warranties.filter(warranty => warranty.userId === userId);
}

// Create a warranty for one user.
async function create(userId, values) {
  const warranties = await readCollection('warranties');

  const warranty = {
    id: randomUUID(),
    userId,
    ...values
  };

  warranties.push(warranty);
  await writeCollection('warranties', warranties);

  return warranty;
}

// Update a warranty belonging to one user.
async function update(userId, id, values) {
  const warranties = await readCollection('warranties');

  const index = warranties.findIndex(
    warranty => warranty.id === id && warranty.userId === userId
  );

  if (index === -1) return null;

  warranties[index] = {
    id,
    userId,
    ...values
  };

  await writeCollection('warranties', warranties);

  return warranties[index];
}

// Delete a warranty belonging to one user.
async function remove(userId, id) {
  const warranties = await readCollection('warranties');

  const index = warranties.findIndex(
    warranty => warranty.id === id && warranty.userId === userId
  );

  if (index === -1) return false;

  warranties.splice(index, 1);
  await writeCollection('warranties', warranties);

  return true;
}

module.exports = { list, create, update, remove };
