// config/passport.js

var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');

var mysql = require('mysql');
var dbconfig = require('./database.json');
var pool = new mysql.createPool(dbconfig);

module.exports = function(passport) {

// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  // user to deserialize the user
  passport.deserializeUser(function(id, done) {
    var query = "select username, password from user_profile where username = ?;";
    pool.query(query,[ id ], function(err, dbres) {
      done(err, dbres[0].username);
    });
  });

  passport.use('local-login', new LocalStrategy({
  },
    function(username, password, done) {
      var query = "select username, password from user_profile where username = ?;";
      pool.query(query, [username], function (err, dbres) {
        if (err) {
          return done(err);
        }
        if (dbres.length == 0) {
          return done(null, false, req.flash('loginMessage:', 'No user found.'));
        }
        if (!bcrypt.compareSync(password, dbres[0].password)) {
          return done(null, false, req.flash('loginMessage:', 'Oops! Wrong password.'));
        }
        return done(null, dbres[0].username);
      });
    }));
};
