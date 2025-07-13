const router = require('express').Router();
const { Employee, Group, SendingProfile, Campaign, InformationData, ClickLog, EmailOpen, CampaignEmployee } = require('../models.js');
const authenticateToken = require('../middlewares/authMiddleware.js');
const { Op, Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const sendEmailQueue = require('../emailWorkers');

function formatDateToRomanian() {
    const date = new Date();
    const day = date.getDate();

    const months = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
                    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
    const month = months[date.getMonth()]; // getMonth() returns 0 for January, 1 for February, etc.

    return `${day} ${month}`;
}

const loadEmailTemplates = async () => {

    const templatesFilePath = path.join(__dirname, '../templates/emailTemplates.json');
    try {
        const data = await fs.readFile(templatesFilePath, 'utf8');
        const templates = JSON.parse(data);
        return templates;
    } catch (error) {
        console.error('Error loading email templates:', error);
        throw error; // Re-throw the error to handle it further up the call stack
    }
};

router.post('/addCampaign', authenticateToken, async (req, res) => {
    let { name, emailTemplateId, launchDate, sendingProfileId, groupIds } = req.body;
    normalized_name = name.toLowerCase();

    if (!name || !launchDate || !sendingProfileId || !groupIds || groupIds.length === 0) {
        return res.status(400).json({ message: 'All the fields are required in order to launch a campaign!' });
    }

    try {

        const emailTemplates = await loadEmailTemplates();
        const emailTemplate = emailTemplates.find(t => t.id === emailTemplateId);
        if(!emailTemplate) {
            throw new Error('Email template not found');
        }

        sendingProfile = await SendingProfile.findByPk(sendingProfileId);
        const newCampaign = await Campaign.create({
            name,
            normalized_name,
            template: emailTemplateId,
            date: launchDate,
            profile: sendingProfile.name
        });

        // Fetch the email template and groups
        const groups = await Group.findAll({
            where: { id: groupIds },
            include: { model: Employee, as: 'Employees' }
        });

        // Queue emails for each user in the selected groups
        groups.forEach(group => {
            group.Employees.forEach(async employee => {

                await CampaignEmployee.create({
                    campaignId: newCampaign.id,
                    employeeId: employee.id,
                    employeeToken: employee.token,
                    employeeFirstName: employee.firstName,
                    employeeLastName: employee.lastName,
                    groupId: group.id
                });

                const personalizedLink = `http://localhost:4000/${emailTemplateId}/${newCampaign.id}/${employee.token}`;
                const ziua = formatDateToRomanian();
                let personalizedHtmlContent = emailTemplate.content.replace('{{link}}', personalizedLink);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{employeeName}}', employee.firstName);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{dataxdatayzi}}', ziua);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{campaignId}}', newCampaign.id);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{employeeToken}}', employee.token);

                // Schedule the email for the launch date
                const delay = new Date(launchDate) - new Date(); // Delay in ms
                if (delay > 0) {
                    // Add job to the email sending queue
                    sendEmailQueue.add({
                        email: employee.email,
                        subject: emailTemplate.subject,
                        content: personalizedHtmlContent,
                        profileId: sendingProfileId,
                        campaignId: parseInt(newCampaign.id)
                    }, { delay });
                }
                
            });
        });

        res.status(200).json({ message: `Campaign scheduled successfully: ${name}` });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A campaign with this name already exists' });
        }
        console.error('Error adding campaign:', err);
        return res.status(500).json({ message: 'An error occurred while adding the campaign.' });
    }
});

router.get('/campaignsList', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.size) || 10;
    let queryOptions = {
        where: {
            [Op.or]: [
                { name: { [Op.like]: `%${search}%` } },
            ]
        },
        offset: page * pageSize,
        limit: pageSize,
    };

    try {
        const { count, rows } = await Campaign.findAndCountAll(queryOptions);
        res.json({ rows, count });
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ message: 'An error occurred while fetching the campaigns.' });
    }
});

router.get('/campaignEmployees', async (req, res) => {
    const { campaignId, page, size, employeeName } = req.query;
    const limit = parseInt(size);
    const offset = parseInt(page) * limit;

    try {
        const employees = await CampaignEmployee.findAll({
            where: { 
                [Op.or]: [
                    { employeeFirstName: { [Sequelize.Op.like]: `%${employeeName}%` } },
                    { employeeLastName: { [Sequelize.Op.like]: `%${employeeName}%` } }
                ],
                campaignId: campaignId
            },
            limit: limit,
            offset: offset
        });

        res.json({
            rows: employees,
            count: employees.length
        });

    } catch (err) {
        console.error('Error fetching campaign employees:', err);
        res.status(500).json({ message: 'An error occurred while fetching the campaign employees.' });
    }
});

router.delete('/removeCampaign', authenticateToken, async (req, res) => {
    const { campaignName, campaignId } = req.body;
    try {
        await ClickLog.destroy({ where: { CampaignId: campaignId } });
        await InformationData.destroy({ where: { CampaignId: campaignId } });
        const result = await Campaign.destroy({ where: { id: campaignId } });
        if (result > 0) {
            // Remove related jobs from the email sending queue
            const jobs = await sendEmailQueue.getJobs(['waiting', 'delayed']);
            console.log('JOBSSS: ', JSON.stringify(jobs, null, 2));
            console.log('CAMPAIGN ID: ' + campaignId);
            var numberyes = 0;

            for (const job of jobs) {
                console.log('JOB DATA CAMPAIGN ID: ' + job.data.campaignId);
                if (parseInt(job.data.campaignId) === parseInt(campaignId)) {
                    await job.remove();
                    numberyes = numberyes + 1;
                    console.log(`Removed job ${job.id} for campaign ${campaignId}`);
                }
            }

            console.log(`Number of jobs removed: ${numberyes}`);
            res.status(200).json({ message: `Campaign ${campaignName} and related emails has been successfully removed.` });
        } else {
            res.status(404).json({ message: 'Campaign not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the campaign.' });
    }
});

router.get('/logsList', async (req, res) => {
    const { campaignId, page = 0, size = 10, employeeName, employeeToken } = req.query;
    const limit = parseInt(size);
    const offset = parseInt(page) * limit;

    try {
        const employees = await CampaignEmployee.findAll({
            where: { 
                campaignId: campaignId,
                employeeToken: employeeToken
            }
        });

        const employeeTokens = employees.map(emp => emp.employeeToken);

        if (employeeTokens.length === 0) {
            return res.json({ rows: [], count: 0 });
        }

        // Count total logs before slicing for pagination
        const totalClickLogs = await ClickLog.count({
            where: { 
                CampaignId: campaignId,
                uniqueUrl: { [Sequelize.Op.in]: employeeTokens }
            }
        });

        const totalInformationDataLogs = await InformationData.count({
            where: { 
                CampaignId: campaignId, 
                token: { [Sequelize.Op.in]: employeeTokens }
            }
        });

        const totalEmailsOpened = await EmailOpen.count({
            where: {
                CampaignId: campaignId,
                employeeUniqueUrl: { [Sequelize.Op.in]: employeeTokens }
            }
        });

        const totalLogs = totalClickLogs + totalInformationDataLogs + totalEmailsOpened;
        
        const clickLogs = await ClickLog.findAll({
            where: { 
                CampaignId: campaignId,
                uniqueUrl: { [Sequelize.Op.in]: employeeTokens }
            },
            limit: limit,
            offset: offset
        });

        const informationDataLogs = await InformationData.findAll({
            where: { 
                CampaignId: campaignId, 
                token: { [Sequelize.Op.in]: employeeTokens }
            },
            limit: limit,
            offset: offset
        });

        const emailsOpenedLogs = await EmailOpen.findAll({
            where: {
                CampaignId: campaignId,
                employeeUniqueUrl: { [Sequelize.Op.in]: employeeTokens }
            },
            limit: limit,
            offset: offset
        });

        const employeeMap = new Map(employees.map(emp => [emp.employeeToken, emp]));

        const mergedClickLogs = clickLogs.map(log => ({
            ...log.dataValues,
            CampaignEmployee: employeeMap.get(log.uniqueUrl),
            type: 'ClickLog'
        }));

        const mergedInformationDataLogs = informationDataLogs.map(data => ({
            ...data.dataValues,
            CampaignEmployee: employeeMap.get(data.token),
            type: 'InformationData'
        }));

        const mergedEmailsOpenedLogs = emailsOpenedLogs.map(data => ({
            ...data.dataValues,
            CampaignEmployee: employeeMap.get(data.employeeUniqueUrl),
            type: 'EmailOpen'
        }));

        const combinedLogs = [...mergedClickLogs, ...mergedInformationDataLogs, ...mergedEmailsOpenedLogs];
        combinedLogs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json({
            rows: combinedLogs,
            count: totalLogs // Total logs for pagination on client side
        });

    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ message: 'An error occurred while fetching the logs.' });
    }
});

router.get('/campaignDetails', async (req, res) => {
    const campaignId = req.query.campaignId;
    if (!campaignId) {
        return res.status(400).json({ message: 'Campaign ID is required' });
    }

    try {
        const campaign = await Campaign.findByPk(campaignId, {
            attributes: ['id', 'name', 'template', 'date', 'profile']  // Adjust attributes as needed
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json({
            name: campaign.name,
            template: campaign.template,
            date: campaign.date,
            profile: campaign.profile,
        });
    } catch (error) {
        console.error('Error fetching campaign details:', error);
        res.status(500).json({ message: 'An error occurred while fetching the campaign details.' });
    }
});

// Route used for displaying the credentials submitted by an employee in a campaign
router.get('/credentials/:logId', authenticateToken, async (req, res) => {
    const logId = req.params.logId;

    try {
        const credentials = await InformationData.findOne({
            where: { id: logId },
            attributes: ['username', 'password'], // Only fetch the necessary data
            include: [{
                model: Campaign,
                attributes: ['name'] // Fetch the campaign name if needed
            }]
        });

        if (!credentials) {
            return res.status(404).send('Credentials not found.');
        }

        res.json({
            username: credentials.username,
            password: credentials.password,
            campaignName: credentials.Campaign.name
        });
    } catch (error) {
        console.error('Failed to fetch credentials:', error);
        res.status(500).json({ message: 'An error occurred while fetching the credentials.' });
    }
});

// Route used for loading the pixel from the email template in order to track the log for opening the mail from the campaign
router.get('/track/:campaignId/:employeeToken', async (req, res) => {
    const { campaignId, employeeToken } = req.params;

    try {
        await EmailOpen.create({
            employeeUniqueUrl: employeeToken,
            CampaignId: campaignId
        });
        console.log(`Email opened: Campaign ${campaignId}, Employee ${employeeToken}`);
    } catch (error) {
        console.error('Error logging email open:', error);
    }

    res.set('Content-Type', 'image/gif');
    res.type('gif').send(req.app.locals.pixel);
});

module.exports = router;