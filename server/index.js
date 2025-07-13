require('dotenv').config();
const app = require('./app');
const path = require('path');
const fs = require('fs').promises;

const PORT = process.env.SERVER_PORT;

async function initializeServer() {
    try {
        app.locals.pixel = await fs.readFile(path.join(__dirname, './public/transparent.gif'));
        // Start the server once the pixel is loaded
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    } catch (error) {
        console.error('Error loading the pixel image:', error);
    }
}

initializeServer();