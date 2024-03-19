require('dotenv').config();

const express = require('express');
const path = require('path');
const { User, RefreshToken } = require('./models');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const JWT = require('./JWT');
const jwt = require('jsonwebtoken');
const { access } = require('fs');


const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '../frontend/Login')));
app.use(express.static(path.join(__dirname, '../frontend/Platform')));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend/Login'));
app.use(express.static('../frontend/Platform'));


// This and the app.use(express.static()) I use in order to change the path of the html and connect frontend to the backend of the login
// and the app would run on localhost:3000 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Login/Login.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/Platform/Platform.html'));
});

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

app.post('/token', async (req, res) => {
    const { token: refreshToken } = req.body;
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

app.delete('/logout', async (req, res) => {
    await RefreshToken.destroy({ where: { token: req.body.token } });
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
    res.json({ accessToken: accessToken, refreshToken: refreshToken });
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