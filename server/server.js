require('dotenv').config();

const express = require('express');
const path = require('path');
const { User, RefreshToken, Employee, ClickLog } = require('./models');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const JWT = require('./JWT');
const jwt = require('jsonwebtoken');
const { access } = require('fs');
const { Op } = require('sequelize');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend/Login')));
app.use(express.static(path.join(__dirname, '../frontend/Platform')));
app.use(express.static(path.join(__dirname, '../frontend/EditEmployees')));
app.use(express.static(path.join(__dirname, '../frontend/SendEmails')));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend/Login'));
app.use(express.static('../frontend/Platform'));
app.use(express.static('../frontend/EditEmployees'));
app.use(express.static('../frontend/SendEmails'));

// This and the app.use(express.static()) I use in order to change the path of the html and connect frontend to the backend of the login
// and the app would run on localhost:3000 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Login/Login.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Platform/Platform.html'));
});

app.get('/edit', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/EditEmployees/EditEmployees.html'));
});

app.get('/send', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/SendEmails/SendEmails.html'));
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

app.post('/generate', authenticateToken, (req, res) => {  // THIS CODE IS USED ONLY TO CHECK THE FUNCTIONALITY OF THE TOKENS AND REFRESH TOKENS
    res.json({ message: 'Token is valid' });
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
        where: {
            email: {
                [Op.like]: `%${search}%`
            }
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
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const token = crypto.createHash('sha256').update(email).digest('hex').substring(0, 8); // Generate token

    try {
        await Employee.create({ email, token });
        res.status(200).json({ message: `Employee added: ${email}`, token });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'An employee with this email already exists' });
        }
        return res.status(500).json({ message: 'An error occurred while adding the employee.' });
    }
});

// Endpoint to remove an employee
app.delete('/removeEmployee', authenticateToken, async (req, res) => {
    const { email } = req.body;
    try {
        const result = await Employee.destroy({ where: { email } });
        if (result > 0) {
            res.status(200).json({ message: `Employee removed: ${email}`, email });
        } else {
            res.status(404).json({ message: 'Employee not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'An error occurred while removing the employee.' });
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