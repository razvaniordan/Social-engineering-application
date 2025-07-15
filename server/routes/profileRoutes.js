const router = require('express').Router();
const { SendingProfile } = require('../models');
const authenticateToken = require('../middlewares/authMiddleware.js');
const { Op } = require('sequelize');

router.get('/sending-profiles', authenticateToken, async (req, res) => {
    try {
      const profiles = await SendingProfile.findAll();
      res.json(profiles);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});

router.get('/getProfiles', authenticateToken, async (req, res) => {
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

router.post('/addSendingProfile', authenticateToken, async (req, res) => {
    let { name, smtpHost, smtpPort, username, password } = req.body;
    username = username.toLowerCase();
    const normalized_name = name.toLowerCase();

    if (!name || !smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({ message: 'All fields are required!' });
    }

    if (!/^\d+$/.test(smtpPort)) {
        return res.status(413).json({ message: 'SMTP Port must be a number' });
    }

    try {
        await SendingProfile.create({ name, normalized_name, smtpHost, smtpPort, username, password });
        res.status(200).json({ message: `Sending profile added: ${name}` });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A sending profile with this name already exists' });
        }
        console.error('Error adding sending profile:', err);
        return res.status(500).json({ message: 'An error occurred while adding the sending profile.' });
    }
});

router.put('/updateProfile', authenticateToken, async (req, res) => {
    const { profileId, oldName, newName, oldHost, newHost, oldPort, newPort, oldUsername, newUsername, oldPassword, newPassword } = req.body;

    if (!newName || !newHost || !newPort || !newUsername || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (Number.isInteger(parseInt(newPort, 10)) === false) {
        return res.status(413).json({ message: 'SMTP Port must be a number' });
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

router.delete('/removeProfile', authenticateToken, async (req, res) => {
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

module.exports = router;