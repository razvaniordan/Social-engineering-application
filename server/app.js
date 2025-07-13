const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const routes = require('./routes');

const app = express();

app.use(cookieParser());
app.use(bodyParser.json());

//use this when we want to process the requests
app.use( (req,res,next) => {//this a custom middleware function and has next()
    console.log(req.url, req.url);    //logs the urls of every request
    next();                  //pass control to the next middleware/route handler
});

app.use(express.static(path.join(__dirname, '../frontend/')));
const LANDING_PAGES_DIR = path.join(__dirname, '../frontend/LandingPages');
app.use('/landing-pages', express.static(LANDING_PAGES_DIR));

app.use('/', routes);

app.use(require('./middlewares/errorMiddleware.js'));

module.exports = app;