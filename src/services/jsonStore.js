const fs = require('fs/promises');
const path = require('path');
const dataDir = path.join(__dirname, '..', '..', 'data');

async function readCollection(name) {
  const filename = path.join(dataDir, `${name}.json`);
  try {
    return JSON.parse(await fs.readFile(filename, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeCollection(name, records) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, `${name}.json`), JSON.stringify(records, null, 2));
}
module.exports = { readCollection, writeCollection };
// TODO: serialize writes or use an atomic write queue before simultaneous users.
