require('dotenv').config();
const express = require('express');
const { ClickLog } = require('./models');
const path = require('path');
const app = express();
const port = 4000;


app.get('/:uniqueUrl', async (req, res) => {
    const { uniqueUrl } = req.params;

    // Store the click information in the database
    try {
        await ClickLog.create({
            uniqueUrl: uniqueUrl,
            ipAddress: req.ip, // Express's req.ip captures the requester's IP address
            referrer: req.get('Referrer') // The page from which the link was clicked
        });
        // After storing the click, redirect the user
        res.redirect('https://www.google.com');
    } catch (err) {
        console.error('Error logging click:', err);
        res.redirect('https://www.google.com'); // even if the logging fails, redirect the user
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Phishing server listening at http://localhost:${port}`);
});
