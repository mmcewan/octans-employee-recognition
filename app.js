// app.js
var express = require('express');
var app = express();

// set up mysql database connection
var mysql = require('mysql');
var dbconfig = require('./config/database.json');
var pool = new mysql.createPool(dbconfig);

// set up handlebars
var handlebars = require('express-handlebars');
app.engine('handlebars', handlebars({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// for parsing JSON received in message body
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// for logging to console
var logger = require('morgan');
app.use(logger('dev'));

// for bcryptjs password encryption
var bcrypt = require('bcryptjs');
// Create a password salt
var salt = bcrypt.genSaltSync(10);

// set up authentication using passport
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');

// for working with file/directory paths to store user signature
var path = require('path');

require('./config/passport')(passport);

//required for passport
app.use(session({
  secret: 'keyboard dog',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge : 60000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(flash());

// allow express to use static files in public directory
app.use(express.static('public'));

// ------Temporary Route for Admin page: No Login Needed------------
var admin = require('./admin');
app.use('/', admin);

// routes
app.get('/', function (req, res) {
  res.render('home.handlebars');
});

app.get('/login', function(req, res) {
  res.render('login.handlebars', { message: req.flash('message') });
});

app.post('/login',
  passport.authenticate('local-login', {failureRedirect : '/login', failureFlash : true }),
  function(req, res) {
    var user = JSON.parse(req.user);
    if (user.admin_flag == 'Y') {
      res.redirect('/admin');
    }
    else {
      res.redirect('/account');
    }
});

app.get('/signup', function(req, res) {
  res.render('signup.handlebars');
});

app.post('/signup', function (req, res) {

  // generate random salt
  var salt = bcrypt.genSaltSync(10);
  // hash password
  var hash = bcrypt.hashSync(req.body.password, salt);
  // set admin flag to "N" (not admin) by default
  var adminFlag = "N";

  // store path to user signature image ("user_data/username.png")
  var sigPath = 'user_data/' + req.body.username + '.png'
  path.join(__dirname, 'sigPath');
  // get signature data from form, prep for decoding
  var base64data = req.body.sigData.split(',')[1];
  // decode signature data and save image to specified path
  var base64 = require('base64-min');
  base64.decodeToFile(base64data, sigPath) ;

  // build SQL to insert new user entry into user_profile table
  var query = "insert into user_profile " +
    "(username, password, firstname, lastname, signature, admin_flag, created_ts)" +
    " values ( ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP );";

  // execute SQL to insert new user entry into user_profile table
  pool.query(query, [
    req.body.username,
    hash,
    req.body.firstname,
    req.body.lastname,
    sigPath,
    adminFlag
  ], function(err, dbres) {
    if (err) {
      if (err.code == '23505') {
        res.status(409);
        res.send("Username already in use.");
        console.log(err);
      }
      else {
        res.status(500);
        res.send("Error! Something isn't right. Confirm the database is up.");
        console.log(err);
      }
    } else {
        req.flash('message', 'Account created successfully. Log in now!');
        res.render('login.handlebars', { message: req.flash('message') });
      }
    });
});

app.get('/account', isLoggedIn, function (req, res) {
  res.render('account.handlebars');
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated, continue
  if (req.isAuthenticated()) {
    return next();
  }
  //if they are not, redirect them to homepage
  res.redirect('/');
}

// launch server, listen for incoming connections
var port = process.env.PORT || 3000;
app.listen(port, function(err) {
  console.log('server running on port ' + port);
});
