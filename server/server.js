require('dotenv').config();

const express = require('express');
const path = require('path');
const { User, RefreshToken, Employee, SendingProfile, Group, Campaign, InformationData, ClickLog, EmailOpen, CampaingEmployee } = require('./models');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const JWT = require('./JWT');
const jwt = require('jsonwebtoken');
const { access } = require('fs');
const { Op, Sequelize } = require('sequelize');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { group, profile, log } = require('console');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const sendEmailQueue = require('./emailWorkers');

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend/')));

app.use(cors());
app.use(bodyParser.json());
const LANDING_PAGES_DIR = path.join(__dirname, '..', 'frontend', 'LandingPages');
app.use('/landing-pages', express.static(LANDING_PAGES_DIR));

// This and the app.use(express.static()) I use in order to change the path of the html and connect frontend to the backend of the login
// and the app would run on localhost:3000 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Login/Login.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Platform/Platform.html'));
});

app.get('/groups', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/EditEmployees/Groups.html'));
});

app.get('/edit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/EditEmployees/EditEmployees.html'));
});

app.get('/send', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/SendEmails/SendEmails.html'));
});

app.get('/profiles', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/SendingProfiles/SendingProfiles.html'));
});

app.get('/campaignLogs', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Logs/Logs.html'));
});

// This endpoint is used to verify the token before making some specific requests
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    //console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];
    //console.log(token);
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.get('/validateToken', authenticateToken, (req, res) => {
    res.json({ message: 'Token is valid' });
});

const loadEmailTemplates = async () => {
    // const templatesFilePath = path.join(__dirname, './templates/emailTemplates.json');
    // console.log(`Loading templates from ${templatesFilePath}`);
    // return JSON.parse(fs.readFileSync(templatesFilePath, 'utf8'));

    const templatesFilePath = path.join(__dirname, './templates/emailTemplates.json');
    try {
        const data = await fs.readFile(templatesFilePath, 'utf8');
        const templates = JSON.parse(data);
        return templates;
    } catch (error) {
        console.error('Error loading email templates:', error);
        throw error; // Re-throw the error to handle it further up the call stack
    }
};

app.get('/email-templates', async (req, res) => {

    try {
        const templates = await loadEmailTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Error loading email templates:', error);
        res.status(500).json({ error: error.message });
    }
});

async function getHtmlFiles(dir) {
    let htmlFiles = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
  
    for (const item of items) {
        const resPath = path.resolve(dir, item.name);
        if (item.isDirectory()) {
            htmlFiles = htmlFiles.concat(await getHtmlFiles(resPath));
        } else if (item.isFile() && item.name.endsWith('.html')) {
            const directoryName = path.basename(path.dirname(resPath));
            htmlFiles.push({
                path: path.relative(LANDING_PAGES_DIR, resPath),
                name: directoryName
            });
        }
    }
    return htmlFiles;
}

app.get('/landing-pages', async (req, res) => {
    try {
        const landingPages = await getHtmlFiles(LANDING_PAGES_DIR);
        res.json(landingPages);
    } catch (err) {
        console.error('Error reading landing pages directory: ', err);
        res.status(500).send('Internal Server Error');
    }
});
  
app.get('/sending-profiles', async (req, res) => {
    try {
      const profiles = await SendingProfile.findAll();
      res.json(profiles);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});

app.get('/getGroups', async (req, res) => {
    try {
      const groups = await Group.findAll();
      res.json(groups);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});
  

// This endpoint checks if the refresh token is valid and if it is, it generates a new access token
app.post('/token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken; // Use cookie parser middleware to access cookies
    if (refreshToken == null) return res.sendStatus(401);

    const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
    if (!storedToken) return res.sendStatus(403);

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        const accessToken = JWT.createToken(user);
        res.json({ accessToken: accessToken });
    });
});

app.delete('/logout', authenticateToken, async (req, res) => {
    if(!req.user) return res.sendStatus(401);

    await RefreshToken.destroy({ where: { username: req.user.username } });
    res.clearCookie('refreshToken'); // clear the refreshToken cookie
    res.sendStatus(204);
});

app.post('/login', async (req, res) => { 
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
    accessToken = JWT.createToken(user);
    refreshToken = jwt.sign({ username: user.username }, process.env.REFRESH_TOKEN_SECRET);
    await RefreshToken.create({ token: refreshToken, username: user.username });
    console.log(accessToken);
    console.log(refreshToken);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });
    res.json({ accessToken: accessToken });
});

// Endpoint to get all employees
app.get('/employees', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.size) || 10;
    let queryOptions = {
        include: [Group],
        where: {
            [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ]
            // email: {
            //     [Op.like]: `%${search}%`
            // }
        },
        offset: page * pageSize,
        limit: pageSize,
    };

    try {
        const { count, rows } = await Employee.findAndCountAll(queryOptions);
        res.json({ rows, count });
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ message: 'An error occurred while fetching the employees.' });
    }
});

// Endpoint to add an employee
app.post('/addEmployee', authenticateToken, async (req, res) => {
    let { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    const token = crypto.createHash('sha256').update(email).digest('hex').substring(0, 8); // Generate token

    email = email.toLowerCase(); // Normalize email address to lowercase

    try {
        await Employee.create({ firstName, lastName, email, token });
        res.status(200).json({ message: `Employee added: ${email}`, token });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'An employee with this email already exists' });
        }
        return res.status(500).json({ message: 'An error occurred while adding the employee.' });
    }
});

app.post('/addGroup', authenticateToken, async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    if (description && description.length > 30) {
        return res.status(400).json({ message: 'Description must be 30 characters or less' });
    }

    try {
        await Group.create({ name, description });
        res.status(200).json({ message: `Group added: ${name}` });
    } catch (err) {
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: err.errors.map(e => e.message).join('; ') });
        } else if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A group with this name already exists' });
        }
        return res.status(500).json({ message: 'An error occurred while adding the group.' });
    }
});

// Endpoint to remove an employee
app.delete('/removeEmployee', authenticateToken, async (req, res) => {
    const { email, employeeName } = req.body;
    try {
        const result = await Employee.destroy({ where: { email } });
        if (result > 0) {
            res.status(200).json({ message: `Employee ${employeeName} removed: ${email}`, email });
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the employee.' });
    }
});

app.delete('/removeProfile', authenticateToken, async (req, res) => {
    const { id, profileName } = req.body;
    try {
        const result = await SendingProfile.destroy({ where: { id } });
        if (result > 0) {
            res.status(200).json({ message: `Profile ${profileName} has been succesfully removed.`, id });
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the employee.' });
    }
});

app.delete('/removeGroup', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {

        const result = await Group.destroy({ where: { name } });
        if (result > 0) {
            res.status(200).json({ message: `Group removed: ${name}`, name });
        } else {
            res.status(404).json({ message: 'Group not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the group.' });
    }
});

app.delete('/removeCampaign', authenticateToken, async (req, res) => {
    const { campaignName, campaignId } = req.body;
    try {
        await ClickLog.destroy({ where: { CampaignId: campaignId } });
        await InformationData.destroy({ where: { CampaignId: campaignId } });
        const result = await Campaign.destroy({ where: { id: campaignId } });
        if (result > 0) {
            res.status(200).json({ message: `Campaign ${campaignName} has been successfully removed.` });
        } else {
            res.status(404).json({ message: 'Campaign not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the campaign.' });
    }
});

app.get('/checkGroupEmployees', async (req, res) => {
    const { name } = req.query;

    try {
        const group = await Group.findOne({
            where: { name },
            include: [{
                model: Employee,
                attributes: ['id'] // We just need to know if there are any employees, not their details
            }]
        });

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if there are any employees in the group
        const hasEmployees = group.Employees && group.Employees.length > 0;
        res.json({ hasEmployees });
    } catch (error) {
        console.error('Error checking group employees:', error);
        res.status(500).json({ message: 'An error occurred while checking for group employees.' });
    }
});

app.get('/groupMembers', async (req, res) => {
    const { name, page = 0, pageSize = 10, search = '' } = req.query;

    try {
        // First, find the group to ensure it exists
        const group = await Group.findOne({ where: { name } });
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Construct the where clause for employees
        const employeeWhereClause = search ? {
            [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ],
            groupId: group.id
        } : { groupId: group.id };

        // Query to get the total count of employees in the group
        const totalMembersCount = await Employee.count({
            where: employeeWhereClause
        });

        // Query to get the paginated list of employees
        const employees = await Employee.findAll({
            where: employeeWhereClause,
            attributes: ['id', 'firstName', 'lastName', 'email'],
            limit: parseInt(pageSize, 10),
            offset: page * parseInt(pageSize, 10)
        });

        res.json({ 
            count: totalMembersCount, 
            members: employees 
        });
    } catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ message: 'An error occurred while fetching the group members.' });
    }
});


app.post('/removeMembersFromGroup', authenticateToken, async (req, res) => {
    const { memberIds, groupName } = req.body;

    console.log('Group name: ', groupName);

    try {
        const group = await Group.findOne({ where: { name: groupName } });
        console.log('memberIds:', memberIds);
        console.log('group.id:', group.id);


        const result = await Employee.update({ GroupId: null }, {
            where: {
                id: {
                    [Op.in]: memberIds
                },
                GroupId: group.id
            }
        });

        if(result > 0) {
            res.status(200).json({ message: `Removed selected members from ${groupName}.` });
        } else {
            res.status(404).json({ message: 'No members found in the group' });
        }

    } catch (error) {
        console.error('Error removing members from group:', error);
        res.status(500).json({ message: 'An error occurred while removing members from the group.' });
    }
});


app.get('/groupsList', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.size) || 10;
    let queryOptions = {
        where: {
            [Op.or]: [
                { name: { [Op.like]: `%${search}%` } },
                //{ description: { [Op.like]: `%${search}%` } }
            ]
        },
        offset: page * pageSize,
        limit: pageSize,
    };

    try {
        const { count, rows } = await Group.findAndCountAll(queryOptions);
        res.json({ rows, count });
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ message: 'An error occurred while fetching the groups.' });
    }
});

function formatDateToRomanian() {
    const date = new Date();
    const day = date.getDate();

    const months = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
                    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
    const month = months[date.getMonth()]; // getMonth() returns 0 for January, 1 for February, etc.

    return `${day} ${month}`;
}


app.post('/addCampaign', authenticateToken, async (req, res) => {
    let { name, emailTemplateId, landingPageId, launchDate, sendingProfileId, groupIds } = req.body;

    if (!name || !launchDate || !sendingProfileId || !groupIds || groupIds.length === 0) {
        return res.status(400).json({ message: 'All the fields are required in order to launch a campaign!' });
    }

    try {
        sendingProfile = await SendingProfile.findByPk(sendingProfileId);
        const newCampaign = await Campaign.create({
            name,
            template: landingPageId,
            date: launchDate,
            profile: sendingProfile.name
        });

        const emailTemplates = await loadEmailTemplates();
        const emailTemplate = emailTemplates.find(t => t.id === emailTemplateId);
        if(!emailTemplate) {
            throw new Error('Email template not found');
        }

        // Fetch the email template and groups
        const groups = await Group.findAll({
            where: { id: groupIds },
            include: { model: Employee, as: 'Employees' }
        });

        // Queue emails for each user in the selected groups
        groups.forEach(group => {
            group.Employees.forEach(async employee => {

                const newCampaignEmployee = await CampaingEmployee.create({
                    campaignId: newCampaign.id,
                    employeeId: employee.id,
                    employeeToken: employee.token,
                    employeeFirstName: employee.firstName,
                    employeeLastName: employee.lastName,
                    groupId: group.id
                });

                const personalizedLink = `http://localhost:4000/${landingPageId}/${newCampaign.id}/${employee.token}`;
                const ziua = formatDateToRomanian();
                let personalizedHtmlContent = emailTemplate.content.replace('{{link}}', personalizedLink);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{dataxdatayzi}}', ziua);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{campaignId}}', newCampaign.id);
                personalizedHtmlContent = personalizedHtmlContent.replace('{{employeeToken}}', employee.token);

                //let bodyHtml = '<p> Email brooo </p>' + '<img src = "http://localhost:3000/track/1/b6cac057" style="height:400px; width:400px; border:0;" alt="">';

                // Schedule the email for the launch date
                const delay = new Date(launchDate) - new Date(); // Delay in ms
                if (delay > 0) {
                    // Add job to the email sending queue
                    sendEmailQueue.add({
                        email: employee.email,
                        subject: emailTemplate.subject,
                        content: personalizedHtmlContent,
                        profileId: sendingProfileId,
                        campaignId: newCampaign.id
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

app.get('/campaignsList', async (req, res) => {
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

app.get('/campaignEmployees', async (req, res) => {
    const { campaignId, page, size, employeeName } = req.query;
    const limit = parseInt(size);
    const offset = parseInt(page) * limit;

    try {
        const employees = await CampaingEmployee.findAll({
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

app.get('/logsList', async (req, res) => {
    const { campaignId, page = 0, size = 10, employeeName, employeeToken } = req.query;
    const limit = parseInt(size);
    const offset = parseInt(page) * limit;

    try {
        const employees = await CampaingEmployee.findAll({
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

app.get('/campaignDetails', async (req, res) => {
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

// Endpoint to update a group
app.put('/updateGroup', authenticateToken, async (req, res) => {
    const { groupId, oldName, newName, description, oldDescription } = req.body;

    if (!newName) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (oldName === newName && oldDescription === description) {
            res.status(200).json({ message: `No changes made to group: ${newName}. No update necessary.` });
        } else if (oldName === newName) {
            group.description = description || group.description; // Keep existing description if not provided
            await group.save();
            res.status(200).json({ message: `Group description updated successfully for: ${newName}` });
        } else {
            group.name = newName;
            group.description = description || group.description; // Keep existing description if not provided
            await group.save();
            res.status(200).json({ message: `Group updated successfully from ${oldName} to ${newName}` });
        }
    } catch (err) {
        console.error('Error updating group:', err);
        res.status(500).json({ message: 'An error occurred while updating the group.' });
    }
});

app.put('/updateEmployee', authenticateToken, async (req, res) => {
    const { employeeId, oldFirstName, oldLastName, newFirstName, newLastName, oldEmail, newEmail } = req.body;

    if (!newFirstName || !newLastName || !newEmail) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const newEmailLowerCase = newEmail.toLowerCase(); // Normalize email address to lowercase

    try {
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (oldFirstName === newFirstName && oldLastName === newLastName && oldEmail === newEmailLowerCase) {
            res.status(200).json({ message: `No changes made to employee: ${newFirstName} ${newLastName}. No update necessary.` });
        } else if (oldFirstName === newFirstName && oldLastName === newLastName) {
            employee.email = newEmailLowerCase;
            await employee.save();
            res.status(200).json({ message: `Employee email updated successfully for "${newFirstName} ${newLastName}" to: ${newEmailLowerCase}` });
        } else if (oldEmail === newEmailLowerCase) {
            employee.firstName = newFirstName;
            employee.lastName = newLastName;
            await employee.save();
            res.status(200).json({ message: `Employee name updated successfully from "${oldFirstName} ${oldLastName}" to "${newFirstName} ${newLastName}" for ${oldEmail}` });
        } else {
            employee.firstName = newFirstName;
            employee.lastName = newLastName;
            employee.email = newEmailLowerCase;
            await employee.save();
            res.status(200).json({ message: `Employee updated successfully from "${oldFirstName} ${oldLastName}" to "${newFirstName} ${newLastName}" and its email address to ${newEmailLowerCase}` });
        }
    } catch (err) {
        console.error('Error updating employee:', err);
        res.status(500).json({ message: 'An error occurred while updating the employee.' });
    }
});

app.put('/updateProfile', authenticateToken, async (req, res) => {
    const { profileId, oldName, newName, oldHost, newHost, oldPort, newPort, oldUsername, newUsername, oldPassword, newPassword } = req.body;

    if (!newName || !newHost || !newPort || !newUsername || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const profile = await SendingProfile.findByPk(profileId);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        if (oldName === newName && oldHost === newHost && oldPort === newPort && oldUsername === newUsername && oldPassword === newPassword) {
            res.status(200).json({ message: `No changes made to profile: ${newName}. No update necessary.` });
        } else if (oldName === newName) {
            profile.smtpHost = newHost;
            profile.smtpPort = newPort;
            profile.username = newUsername;
            profile.password = newPassword;
            await profile.save();
            res.status(200).json({ message: `Profile updated successfully for "${newName}"` });
        } else if (oldHost === newHost && oldPort === newPort && oldUsername === newUsername && oldPassword === newPassword) {
            profile.name = newName;
            await profile.save();
            res.status(200).json({ message: `Profile updated successfully from "${oldName}" to "${newName}"` });
        } else {
            profile.name = newName;
            profile.smtpHost = newHost;
            profile.smtpPort = newPort;
            profile.username = newUsername;
            profile.password = newPassword;
            await profile.save();
            res.status(200).json({ message: `Profile updated successfully from "${oldName}" to "${newName}" and its information` });
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'An error occurred while updating the profile.' });
    }
});

app.post('/assignEmployeeToGroup', authenticateToken, async (req, res) => {
    let { employeeId, groupId } = req.body;
    
    if (!employeeId || !groupId) {
        return res.status(400).json({ message: 'Employee ID and Group ID are required' });
    }
    employeeId = Number(employeeId);
    groupId = Number(groupId);

    console.log(`Assigning employee with ID ${employeeId} to group with ID ${groupId}`);

    try {
        const employee = await Employee.findByPk(employeeId);
        const group = await Group.findByPk(groupId);

        if (!employee || !group) {
            return res.status(404).json({ message: 'Employee or group not found' });
        }

        await employee.setGroup(group);
        res.status(200).json({ message: `Employee ${employee.firstName} ${employee.lastName} assigned to group: ${group.name}` });
    } catch (err) {
        console.error('Error assigning employee to group:', err);
        res.status(500).json({ message: 'An error occurred while assigning the employee to the group.' });
    }
});

app.post('/exitEmployeeFromGroup', authenticateToken, async (req, res) => {
    const { employeeId } = req.body;

    try {
        const employee = await Employee.findByPk(employeeId, {
            include: [Group]
        });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const groupName = employee.Group ? employee.Group.name : 'No group';
        
        await employee.setGroup(null);

        res.status(200).json({ message: `Employee ${employee.firstName} ${employee.lastName} removed from the group ${groupName} successfully.` });
    } catch (error) {
        console.error('Error removing employee from group:', error);
        res.status(500).json({ message: 'An error occurred while removing the employee from the group.' });
    }
});

app.get('/getProfiles', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.size) || 10;
    let queryOptions = {
        where: {
            [Op.or]: [
                { name: { [Op.like]: `%${search}%` } }
            ]
        },
        offset: page * pageSize,
        limit: pageSize,
    };

    try {
        const { count, rows } = await SendingProfile.findAndCountAll(queryOptions);
        res.json({ rows, count });
    } catch (err) {
        console.error('Error fetching sending profiles:', err);
        res.status(500).json({ message: 'An error occurred while fetching the sending profiles.' });
    }
});

app.post('/addSendingProfile', authenticateToken, async (req, res) => {
    const { name, smtpHost, smtpPort, username, password } = req.body;

    if (!name || !smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({ message: 'All fields are required!' });
    }

    try {
        await SendingProfile.create({ name, smtpHost, smtpPort, username, password });
        res.status(200).json({ message: `Sending profile added: ${name}` });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A sending profile with this name already exists' });
        }
        console.error('Error adding sending profile:', err);
        return res.status(500).json({ message: 'An error occurred while adding the sending profile.' });
    }
});

app.get('/credentials/:logId', authenticateToken, async (req, res) => {
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
``

app.get('/track/:campaignId/:employeeToken', async (req, res) => {
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
    res.send(pixel);
});

//use this when we want to process the requests
app.use( (req,res,next) => {//this a custom middleware function and has next()
    console.log(req.url)    //logs the urls of every request
    next()                  //pass control to the next middleware/route handler
})

app.use( (err,req,res,next) => {        // handles servers errors
    console.log('An error Ocurred! : ' + err)        // logs the error into the console
    res.status(500).json({message: 'server error'}) // responds with status code 500 and message 'server error'
})


let pixel;

async function initializeServer() {
    try {
        pixel = await fs.readFile(path.join(__dirname, './public/transparent.gif'));
        // Start the server once the pixel is loaded
        app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
    } catch (error) {
        console.error('Error loading the pixel image:', error);
    }
}

initializeServer();