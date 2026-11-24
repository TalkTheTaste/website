'use strict';
const fs = require('node:fs');
const path = require('node:path');

// This ignored file configures only the developer preview, never npm start.
const config = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(config)) process.loadEnvFile(config);
require('../server.js');
