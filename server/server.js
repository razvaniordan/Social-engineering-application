require('dotenv').config();

const express = require('express');
const path = require('path');
const { User, RefreshToken, Employee, SendingProfile, Group } = require('./models');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const JWT = require('./JWT');
const jwt = require('jsonwebtoken');
const { access } = require('fs');
const { Op } = require('sequelize');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { group } = require('console');

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(cors());
app.use(bodyParser.json());

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

app.delete('/removeGroup', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {

        // const groupWithEmployees = await Group.findOne({
        //     where: { name },
        //     include: [{
        //         model: Employee,
        //         attributes: ['id']
        //     }]
        // });

        // if(!groupWithEmployees) {
        //     return res.status(404).json({ message: 'Group not found' });
        // }

        // if (groupWithEmployees.Employees.length > 0) {
        //     return res.status(409).json({ message: `Group ${name} has employees assigned to it. Remove employees from the group first.` });
        // }

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
        console.error('Error updating group:', err);
        res.status(500).json({ message: 'An error occurred while updating the group.' });
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

app.post('/addSendingProfile', authenticateToken, async (req, res) => {
    const { name, smtpFrom, host, username, password } = req.body;

    if (!name || !smtpFrom || !host || !username || !password) {
        return res.status(400).json({ message: 'All fields are required!' });
    }

    try {
        await SendingProfile.create({ name, smtpFrom, host, username, password });
        res.status(200).json({ message: `Sending profile added: ${name}` });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'A sending profile with this name already exists' });
        }
        console.error('Error adding sending profile:', err);
        return res.status(500).json({ message: 'An error occurred while adding the sending profile.' });
    }
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});