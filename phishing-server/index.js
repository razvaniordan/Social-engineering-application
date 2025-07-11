require('dotenv').config();
const app = require('./app');

const PORT = process.env.PHISH_PORT;

app.listen(PORT, () => {
    console.log(`Phishing server listening at http://localhost:${PORT}`);
});