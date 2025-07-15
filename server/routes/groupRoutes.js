const router = require('express').Router();
const { Group, Employee } = require('../models');
const authenticateToken = require('../middlewares/authMiddleware.js');
const { Op } = require('sequelize');

router.get('/getGroups', async (req, res) => {
    try {
      const groups = await Group.findAll();
      res.json(groups);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
});

router.post('/addGroup', authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    normalized_name = name.toLowerCase();

    if (!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    if (description && description.length > 100) {
        return res.status(400).json({ message: 'Description must be 100 characters or less' });
    }

    try {
        await Group.create({ name, normalized_name, description });
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

// Endpoint to update a group
router.put('/updateGroup', authenticateToken, async (req, res) => {
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
            group.description = description; // Keep existing description if not provided
            await group.save();
            res.status(200).json({ message: `Group description updated successfully for: ${newName}` });
        } else {
            group.name = newName;
            group.description = description; // Keep existing description if not provided
            await group.save();
            res.status(200).json({ message: `Group updated successfully from ${oldName} to ${newName}` });
        }
    } catch (err) {
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: err.errors.map(e => e.message).join('; ') });
        } else if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A group with this name already exists' });
        }
        return res.status(500).json({ message: 'An error occurred while updating the group.' });
    }
});

router.delete('/removeGroup', authenticateToken, async (req, res) => {
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

router.get('/checkGroupEmployees', authenticateToken, async (req, res) => {
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

router.get('/groupMembers', authenticateToken, async (req, res) => {
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

router.post('/removeMembersFromGroup', authenticateToken, async (req, res) => {
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

router.get('/groupsList', authenticateToken, async (req, res) => {
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

module.exports = router;