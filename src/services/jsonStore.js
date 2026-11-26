
const fs = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');

// Keep track of pending operations for each collection.
const collectionQueues = new Map();

// Read a collection from its JSON file.
async function readCollection(name) {
  const filename = path.join(dataDir, `${name}.json`);

  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// Write a collection to its JSON file.
async function writeCollection(name, records) {
  await fs.mkdir(dataDir, { recursive: true });

  const filename = path.join(dataDir, `${name}.json`);

  // Write to a temporary file first.
  const tempFilename = `${filename}.${require('crypto').randomUUID()}.tmp`;

  try {
    await fs.writeFile(
      tempFilename,
      JSON.stringify(records, null, 2),
      'utf8'
    );

    // Replace the original file after the temporary file is complete.
    await fs.rename(tempFilename, filename);
  } catch (error) {
    await fs.unlink(tempFilename).catch(() => {});
    throw error;
  }
}

// Run collection modifications sequentially.
function queueCollectionOperation(name, operation) {
  const previous = collectionQueues.get(name) || Promise.resolve();

  const current = previous
    .catch(() => {})
    .then(operation);

  collectionQueues.set(name, current);

  return current.finally(() => {
    if (collectionQueues.get(name) === current) {
      collectionQueues.delete(name);
    }
  });
}

// Read, modify, and write a collection as one queued operation.
function updateCollection(name, updater) {
  return queueCollectionOperation(name, async () => {
    const records = await readCollection(name);
    const result = await updater(records);

    await writeCollection(name, records);

    return result;
  });
}

module.exports = {
  readCollection,
  writeCollection,
  updateCollection
};
