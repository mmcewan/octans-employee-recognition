// app.js
var express = require('express');
var app = express();

var port = 8080;

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

// routes
app.get('/', function (req, res) {
  res.render('home.handlebars');
});

app.get('/login', function(req, res) {
  res.render('login.handlebars', { message: req.flash('message') });
});

// app.post('/login',
//   passport.authenticate('local-login', {
//     successRedirect: '/account',
//     failureRedirect: '/login',
//     failureFlash: true
// }));

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
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(req.body.password, salt);
  var admin_flag = "Y";

  var query = "insert into user_profile " +
    "(username, password, firstname, lastname, signature, admin_flag, created_ts)" +
    " values ( ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP );";

  pool.query(query, [
    req.body.username,
    hash,
    req.body.firstname,
    req.body.lastname,
    req.body.signature,
    admin_flag
  ], function(err, dbres) {
    if (err) {
      if (err.code == '23505') {
        res.status(409);
        res.send("Username already in use");
        console.log(err);
      }
      else {
        res.status(500);
        res.send("Error!");
        console.log(err);
      }
    } else {
        res.status(200);
        res.send("Success!");
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
app.listen(port, function(err) {
  console.log('server running on port ' + port);
});
