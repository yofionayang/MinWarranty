const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => console.log(`MinWarranty running at http://localhost:${port}`));
