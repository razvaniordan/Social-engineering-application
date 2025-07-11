const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// global middleware
app.use(express.static(path.join(__dirname, '../frontend/')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// routes
app.use('/', require('./routes/landingPage'));
app.use('/', require('./routes/submitInformation'));

module.exports = app;