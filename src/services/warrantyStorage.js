
/*
 * MinWarranty - Warranty Storage
 *
 * Handles warranty CRUD operations.
 * Every operation uses the owner's user_id.
 * A warranty belonging to another user is treated
 * as if it does not exist.
 */

const { randomUUID } = require('crypto');
const { readCollection, updateCollection } = require('./jsonStore');

// Get all warranties belonging to one user.
async function list(userId) {
  const warranties = await readCollection('warranties');

  return warranties.filter(
    warranty => warranty.userId === userId
  );
}

// Create a new warranty for one user.
async function create(userId, values) {
  return updateCollection('warranties', warranties => {

    const warranty = {
      id: randomUUID(),
      userId,
      ...values
    };

    warranties.push(warranty);

    return warranty;
  });
}

// Update a warranty belonging to one user.
async function update(userId, id, values) {
  return updateCollection('warranties', warranties => {

    const index = warranties.findIndex(
      warranty =>
        warranty.id === id &&
        warranty.userId === userId
    );

    // Return null if the warranty doesn't exist
    // or belongs to another user.
    if (index === -1) {
      return null;
    }

    warranties[index] = {
      id,
      userId,
      ...values
    };

    return warranties[index];
  });
}

// Delete a warranty belonging to one user.
async function remove(userId, id) {
  return updateCollection('warranties', warranties => {

    const index = warranties.findIndex(
      warranty =>
        warranty.id === id &&
        warranty.userId === userId
    );

    // Return false if the warranty doesn't exist
    // or belongs to another user.
    if (index === -1) {
      return false;
    }

    warranties.splice(index, 1);

    return true;
  });
}

module.exports = {
  list,
  create,
  update,
  remove
};
