const express = require('express');
const path = require('path');
const { User } = require('./models');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');


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


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).send({ message: 'Invalid username or password' });
    }

    res.send({ message: 'Login successful' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});