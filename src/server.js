/*
 * MinWarranty - Server Startup
 *
 * Loads the Express app and starts it on the configured port.
 */

// Load the app with its routes and middleware already set up.
const app = require('./app');

// Get the port from the app's configuration.
const { port } = require('./config/env');

// Start accepting requests and print the local URL when the server is ready.
app.listen(port, () => console.log(`MinWarranty running at http://localhost:${port}`));