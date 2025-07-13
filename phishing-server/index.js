require('dotenv').config();
const app = require('./app');
const requireEnv = require('../utils/requireEnv.js');

const PORT = requireEnv('PHISHING_PORT');

app.listen(PORT, () => {
    console.log(`Phishing server listening at http://localhost:${PORT}`);
});