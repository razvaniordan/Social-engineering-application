const router = require('express').Router();
const { Employee, Group } = require('../models');
const { Op } = require('sequelize');
const authenticateToken = require('../middlewares/authMiddleware.js');
const crypto = require('crypto');  

// Endpoint to get all employees
router.get('/employeesList', authenticateToken, async (req, res) => {
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
router.post('/addEmployee', authenticateToken, async (req, res) => {
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

// Endpoint to remove an employee
router.delete('/removeEmployee', authenticateToken, async (req, res) => {
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

router.put('/updateEmployee', authenticateToken, async (req, res) => {
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
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'An employee with this email already exists' });
        }
        console.error('Error updating employee:', err);
        res.status(500).json({ message: 'An error occurred while updating the employee.' });
    }
});

router.post('/assignEmployeeToGroup', authenticateToken, async (req, res) => {
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

router.post('/exitEmployeeFromGroup', authenticateToken, async (req, res) => {
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

module.exports = router;