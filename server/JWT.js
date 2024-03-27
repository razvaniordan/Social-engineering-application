require('dotenv').config({path: './server/.env'});

const jwt = require('jsonwebtoken');

const createToken = (user) => {
    const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10s' });
    return accessToken;
}

module.exports = { createToken };