const router = require('express').Router();
const path = require('path');
const fs = require('fs').promises;

// This and the app.use(express.static()) I use in order to change the path of the html and connect frontend to the backend of the login
// and the app would run on localhost:3000 
router.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/Login/Login.html'));
});

router.get('/home', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/Platform/Platform.html'));
});

router.get('/groups', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/EditEmployees/Groups.html'));
});

router.get('/edit', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/EditEmployees/EditEmployees.html'));
});

router.get('/send', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/SendEmails/SendEmails.html'));
});

router.get('/profiles', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/SendingProfiles/SendingProfiles.html'));
});

router.get('/campaignLogs', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/Logs/Logs.html'));
});


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

router.get('/email-templates', async (_req, res) => {

    try {
        const templates = await loadEmailTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Error loading email templates:', error);
        res.status(500).json({ error: error.message });
    }
});

const LANDING_PAGES_DIR = path.join(__dirname, '../../frontend/LandingPages');

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

router.get('/landing-pages', async (_req, res) => {
    try {
        const landingPages = await getHtmlFiles(LANDING_PAGES_DIR);
        res.json(landingPages);
    } catch (err) {
        console.error('Error reading landing pages directory: ', err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;