require('dotenv').config();
const express = require('express');
const { Employee, ClickLog } = require('./models');
const path = require('path');
const app = express();
const port = 4000;

app.get('/', (req, res) => {
    res.redirect('https://www.google.com');
});

app.get('/:uniqueUrl', async (req, res) => {
    const { uniqueUrl } = req.params;

    // Store the click information in the database
    try {
        // Check if the unique URL exists in the Employee table (which is the token column)
        const employee = await Employee.findOne({
            where: { token: uniqueUrl }
        });

        // If the unique URL does not exist in the Employee table, don't creater the ClickLog and return a 404 error
        if (employee) {
            await ClickLog.create({
                uniqueUrl: uniqueUrl,
                ipAddress: req.ip, // Express's req.ip captures the requester's IP address
                referrer: req.get('Referrer') // The page from which the link was clicked
            });
            console.log('Click logged for valid token.');
            // After storing the click, redirect the user
            res.redirect('https://www.google.com');
        } else {
            console.log('Invalid URL:', uniqueUrl);
            res.status(404).send('Page not found');
        }
        
        
    } catch (err) {
        console.error('Error logging click:', err);
        res.redirect('https://www.google.com'); // even if the logging fails, redirect the user
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Phishing server listening at http://localhost:${port}`);
});
