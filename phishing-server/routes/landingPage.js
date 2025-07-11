const router = require('express').Router();
const path = require("path");
const { Employee, ClickLog } = require('../../server/models');

router.get('/:landingPage/:campaignId/:uniqueUrl', async (req, res) => {
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

            // After storing the click, redirect the user
            const filePath = path.join(__dirname, `../../frontend/LandingPages/${landingPage}/${landingPage}.html`);
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

module.exports = router;