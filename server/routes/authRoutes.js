const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { User, RefreshToken } = require('../models.js');

const tokenHelper = require('../tokenHelper.js');
const authenticateToken = require('../middlewares/authMiddleware.js');

router.post('/login', async (req, res) => { 
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    accessToken = tokenHelper.createToken(user);
    refreshToken = jwt.sign({ username: user.username }, process.env.REFRESH_TOKEN_SECRET);

    await RefreshToken.create({ token: refreshToken, username: user.username });

    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' });
    res.json({ accessToken: accessToken });
});


router.delete('/logout', authenticateToken, async (req, res) => {
    if(!req.user) return res.sendStatus(401);

    await RefreshToken.destroy({ where: { username: req.user.username } });
    res.clearCookie('refreshToken');
    res.sendStatus(204);
});


// This endpoint checks if the refresh token is valid and if it is, it generates a new access token
router.post('/token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken; // Use cookie parser middleware to access cookies
    if (refreshToken == null) return res.sendStatus(401);

    const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
    if (!storedToken) return res.sendStatus(403);

    jwt.verify(
        refreshToken, 
        process.env.REFRESH_TOKEN_SECRET, 
        (err, user) => {
            if (err) return res.sendStatus(403);
            res.json({ accessToken: tokenHelper.createToken(user) });
        }
    );
});

router.get('/validateToken', authenticateToken, (req, res) => {
    res.json({ message: 'Token is valid' });
});

module.exports = router;