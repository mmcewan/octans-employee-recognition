// app.js
var express = require('express');
var app = express();


//packages related to pdf generation and mailing
var nodemailer = require('nodemailer');
var path = require('path');
var fs = require('fs');
var latex = require('latex');

// packages related to password recovery
var async = require('async');
var crypto = require('crypto');

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

// package required for storing user signature images
var cloudinary = require('cloudinary');

//should this move to config file?
cloudinary.config({
  cloud_name: 'hvij0ogeg',
  api_key: '537714322554922',
  api_secret: 'TjuHD6aNtP1CtmvKhKo9ev6sW7U'
});

// set up authentication using passport
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');

require('./config/passport')(passport);

//required for passport
app.use(session({
  secret: 'keyboard dog',
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge : 600000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// allow express to use static files in public directory
app.use(express.static('public'));

// routes
app.get('/',
	function (req, res) {
	if(req.isAuthenticated()){
    if (session.admin == 'Y') {
      res.redirect('/admin');
    }
    else {
      res.redirect('/account');
    }
  }
  else {
    res.render('home.handlebars');
  }
});

app.get('/login', function(req, res) {
  res.render('login.handlebars', { message: req.flash('message') });
});

app.post('/login',
  passport.authenticate('local-login', { failureRedirect : '/login', failureFlash : true }),
  function(req, res) {
    var user = JSON.parse(req.user);
    if (user.admin_flag == 'Y') {
    	session.admin = "Y";
      res.redirect('/admin');
    }
    else {
    	session.admin = "N";
      res.redirect('/account');
    }
});

app.get('/signup', function(req, res) {
  res.render('signup.handlebars');
});

app.post('/signup', function (req, res) {
  // hash password
  var hash = bcrypt.hashSync(req.body.password, salt);

  cloudinary.uploader.upload(req.body.sigData, function(result) {
    console.log(result);
  }, { public_id: req.body.username });

  // set admin flag to "N" (not admin) by default
  var adminFlag = "N";

  // build SQL to insert new user entry into user_profile table
  var query = "insert into user_profile " +
    "(username, password, firstname, lastname, email_address, signature, admin_flag, created_ts)" +
    " values ( ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP );";

  // execute SQL to insert new user entry into user_profile table
  pool.query(query, [
    req.body.username,
    hash,
    req.body.firstname,
    req.body.lastname,
    req.body.email,
    cloudinary.url(req.body.username),
    adminFlag
  ], function(err, dbres) {
    if (err) {
      if (err.code == 'ER_DUP_ENTRY') {
        req.flash('message', 'Username already in use. Please try again.');
        res.render('signup.handlebars', { message: req.flash('message') });
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
  if (session.admin == 'N') {
    res.render('account.handlebars');
  }
  else {
    req.flash('message', 'Please log in as a non-admin user to access that page.');
    res.render('login.handlebars', { message: req.flash('message') });
  }
});


app.get('/admin', isLoggedIn, function(req,res) {
  if (session.admin == 'Y') {
    res.render('admin');
  }
  else {
    req.flash('message', 'Sorry, you must be an admin user to access that page.');
    res.render('login.handlebars', { message: req.flash('message') });
  }
});

app.get('/myawards', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "select up.firstname, up.lastname, atype.description, a.comment, a.award_date, a.id"
  + " from award a"
  + " inner join user_profile up on up.id = a.sender_id"
  + " inner join user_profile up2 on up2.id = a.recepient_id"
  + " inner join award_type atype on atype.id = a.award_type"
  + " where up2.username = '" + req.user + "';";

    pool.query(query, function(err, rows, fields) {
      if(err) {
        next(err);
        return;
      }
      if (rows.length > 0) {
        context.myawards = rows;
      } else {
        context.message = "No awards received.";
      }
      res.render('account.handlebars', context);
    })
});

app.get('/awardsgiven', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "select up2.firstname, up2.lastname, atype.description, a.comment, a.award_date, a.id"
  + " from award a"
  + " inner join user_profile up on up.id = a.sender_id"
  + " inner join user_profile up2 on up2.id = a.recepient_id"
  + " inner join award_type atype on atype.id = a.award_type"
  + " where up.username = '" + req.user + "';";

    pool.query(query, function(err, rows, fields) {
      if(err) {
        next(err);
        return;
      }
      if (rows.length > 0) {
        context.awardsgiven = rows;
      } else {
        context.message = "No awards given.";
      }
      res.render('account.handlebars', context);
    })
});

app.post('/awardsgiven', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "delete from award where id = " + req.body.id + ";";
  console.log(query);
  if (req.body["delete"]) {
    pool.query(query, function(err, rows, fields) {
      if(err) {
        next(err);
        return;
      }
      context.message = "Award deleted.";
      res.render('account.handlebars', context);
    })
  }
});

app.get('/updateProfile', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "select id, username, firstname, lastname, email_address"
  + " from user_profile"
  + " where username = '" + req.user + "';";

    pool.query(query, function(err, rows, fields) {
      if(err) {
        next(err);
        return;
      }
      context.id = rows[0].id;
      context.username = rows[0].username;
      context.firstname = rows[0].firstname;
      context.lastname = rows[0].lastname;
      context.email_address = rows[0].email_address;
      res.render('updateProfile.handlebars', context);
    })
});

app.post('/updateProfile', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "update user_profile"
  + " set firstname = ?, lastname = ?, email_address = ?"
  + " where id = ? ;";

    pool.query(query, [
      req.body.firstname,
      req.body.lastname,
      req.body.email,
      req.body.id
    ], function(err, rows, fields) {
      if(err) {
        next(err);
        return;
      }
      context.message = "Your profile has been updated."
      res.render('account.handlebars', context);
    })
});

app.get('/forgot', function(req, res) {
  res.render('forgot.handlebars', { message: req.flash('message') });
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      var selUser = "select id from user_profile where email_address = ? ;"
      pool.query(selUser, [ req.body.email ], function(err, rows, fields) {
        if(err) {
          next(err);
          return;
        }
        if (!rows.length > 0) {
          req.flash('message', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }
        var email  = req.body.email;
        var tokenExpire = Date.now() + 3600000; // 1 hour
        console.log(tokenExpire);

        var updUser = "update user_profile"
        + " set resetPasswordToken = ?, resetPasswordExpires = ?"
        + " where email_address = ? ;"

        pool.query(updUser,[token, tokenExpire, email], function(err, rows, fields) {
          if(err) {
            next(err);
            return;
          }
          done(err, token, email);
        });
      });
    },
    function(token, email, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "octansosu",
          clientId: "786988129141-itqerrohjv99fiqk47vctg0132kqhaeq.apps.googleusercontent.com",
          clientSecret: "efk5-I22oRg3MWN0e95ZrL90",
          refreshToken : "1/fO50uE99BsxSDqyRTutCaqs45f5nNG9cIwzG8vLZ30E"
          //accessToken not needed if refreshToken provided
          //accessToken : "ya29.GluYBN_sqLOeg_diZ5-VZTvamNRrh1DQeXLV8gdBDu3XfPCAeoOQrCkhzCPsW68RBOZsMgmM9tOaw0xZ0tJILygemEJyacE2NkgAMbEEnULH3F9mn9Fwwv1DlTdj",
          //expires: 3600
        }
      });
      var msg = {
        from: 'octansosu@gmail.com',
        to: email,
        subject: "Octans Employee Recognition Password Reset",
        text: "You are receiving this because you (or someone else) has requested the reset of the password for your account.\n\n" +
          "Please click on the following link to complete the reset process.\n\n" +
          "http://" + req.headers.host + "/reset/" + token + "\n\n" +
          "If you did not request this, please ignore this email and your password will remain unchanged.\n"
      };
      
      smtpTransport.sendMail(msg, function(err) {
        req.flash('message', 'An e-mail has been sent to ' + email + ' with further instructions.');
        done(err, 'done');
      });

    }
  ], function(err) {
    if(err) {
      return next(err);
    }
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  var query = "select username from user_profile where resetPasswordToken = ? and resetPasswordExpires > ? ;"
  var token = req.params.token;
  var tokenExpire = Date.now();
  pool.query(query,[token, tokenExpire], function(err, rows, fields) {
    if(err) {
      next(err);
      return;
    }
    if (!rows.length > 0) {
      req.flash('message', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset.handlebars');
  });
});

app.post('/reset/:token', function(req, res, next) {
  async.waterfall([
    function(done) {
      var query = "select username, email_address from user_profile where resetPasswordToken = ? and resetPasswordExpires > ? ;"
      var token = req.params.token;
      var tokenExpire = Date.now();
      pool.query(query,[token, tokenExpire], function(err, rows, fields) {
        if(err) {
          next(err);
          return;
        }
        if (!rows.length > 0) {
          req.flash('message', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        var username = rows[0].username;
        var email = rows[0].email_address;

        // hash new password
        var hash = bcrypt.hashSync(req.body.password, salt);
        done(err, username, email, hash);
      });
    },
    function(username, email, hash, done) {
        var updPwd = "update user_profile"
        + " set password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL"
        + " where username = ? ;"
        pool.query(updPwd,[hash, username], function(err, rows, fields) {
          if(err) {
            next(err);
            return;
          }
          done(err, email);
        });
    },
    function(email, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "octansosu",
          clientId: "786988129141-itqerrohjv99fiqk47vctg0132kqhaeq.apps.googleusercontent.com",
          clientSecret: "efk5-I22oRg3MWN0e95ZrL90",
          refreshToken : "1/fO50uE99BsxSDqyRTutCaqs45f5nNG9cIwzG8vLZ30E"
          //accessToken not needed if refreshToken provided
          //accessToken : "ya29.GluYBN_sqLOeg_diZ5-VZTvamNRrh1DQeXLV8gdBDu3XfPCAeoOQrCkhzCPsW68RBOZsMgmM9tOaw0xZ0tJILygemEJyacE2NkgAMbEEnULH3F9mn9Fwwv1DlTdj",
          //expires: 3600
        }
      });
      var msg = {
        from: 'octansosu@gmail.com',
        to: email,
        subject: "Octans Employee Recognition Password Has Been Changed",
        text: "This email confirms that the password for " + email + "has just been changed.\n\n"
      };
      smtpTransport.sendMail(msg, function(err) {
        req.flash('message', 'Success! Your password has been changed.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if(err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/session_info', isLoggedIn, function (req, res) {
  res.send(req.user);
});

app.get('/logged_status', function (req, res) {
  res.send(req.isAuthenticated());
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

/*
 route to render page with new award form
*/
app.get('/makeaward', isLoggedIn, function(req, res, next){
  if (session.admin == 'N') {
    res.render('createaward.handlebars');
  }
  else {
    req.flash('message', 'Please log in as a non-admin user to access that page.');
    res.render('login.handlebars', { message: req.flash('message') });
  }
});

/*
  route to return list of award types
*/
app.get('/awards/list', isLoggedIn, function(req, res, next){
pool.query("select id, description from award_type;", function (err, dbres){
    if (err) {
      res.status(500);
      res.send("DB ERROR");
      console.log(err);
    } else {
      res.setHeader("Content-Type", "Application/JSON");
      res.status(200);
      res.send(dbres);
    }
  });
});

/*
  route to return list of users
*/
app.get('/users/list', isLoggedIn, function(req, res, next){
pool.query("select id, firstname, lastname, email_address, admin_flag from user_profile;", function (err, dbres){
    if (err) {
      res.status(500);
      res.send("DB ERROR");
      console.log(err);
    } else {
      res.setHeader("Content-Type", "Application/JSON");
      res.status(200);
      res.send(dbres);
    }
  });
});

/*
  route to create new award PDF from provided details (agiver, areceiver, atitle, amessage, adate, atype, aemail).
*/
app.post('/new_award', isLoggedIn, function(req, res, next) {

var agiver;
var areceiver;
var asignature;
var aemail;

var atime;
var adate = getCurrentDate();
if(req.body.adate && req.body.adate != ""){
	adate = req.body.adate;
	}
var adatetime = adate;
if(req.body.atime && req.body.atime != ""){
	atime = req.body.atime;
	adatetime = adatetime + " " + atime + ":00";}

var amessage = req.body.amessage;

var atype = req.body.atype;
var receiverid = req.body.areceiver;
var giverid = req.user;

var giverQueryString = "select id, firstname, lastname, signature from user_profile " +
                    " where username = ?";
  pool.query(giverQueryString, [req.user], function(err, dbres) {
    if (err)  {
      res.status(500);
      res.send("Server database error.");
      console.log(err);
    } else if (dbres.length != 1) {
      res.status(402);
      res.send("Sending user not found.");
    }
    else
    	{
    	asignature = dbres[0].signature;
    	agiver = dbres[0].firstname + " " + dbres[0].lastname;
    	giverid = dbres[0].id;

    	var receiverqueryString = "select id, email_address, firstname, lastname from user_profile " +
                    " where id = ?";
  		pool.query(receiverqueryString, [receiverid], function(err, dbres) {
    		if (err)  {
      		res.status(500);
      		res.send("Server database error.");
      		console.log(err);
    		}
    		else if (dbres.length != 1) {
      		res.status(402);
      		res.send("Recipient user not found");
    		}
		    else
		    	{
		    	aemail = dbres[0].email_address;
		    	areceiver =  dbres[0].firstname + " " + dbres[0].lastname;
		    	recordaward(giverid, receiverid, atype, amessage, adatetime);

		    	var typequeryString = "select id, description from award_type " +
                    " where id = ?";
  			    pool.query(typequeryString, [atype], function(err, dbres) {
		    	if (err)  {
		    		res.status(500);
		    		res.send("Server database error.");
      				console.log(err);
    			}
    			else if (dbres.length != 1) {
      				res.status(402);
      				res.send("Server database error.");
    				}
		    	else
		    		{
		    		var typename = dbres[0].description;
		    		if(!aemail || aemail == "")
		    			aemail = "octansosu@gmail.com";
		    		if(!asignature || asignature == ""){
		    				var backgroundfile = path.join(__dirname, 'cert_resources', 'background1.jpg');
							var logofile = path.join(__dirname, 'cert_resources', 'logo.png');
							if(atype == 1)
								backgroundfile = path.join(__dirname, 'cert_resources', 'background1.jpg');
							else if(atype == 2)
								backgroundfile = path.join(__dirname, 'cert_resources', 'background2.jpg');
							else if(atype == 3)
								backgroundfile = path.join(__dirname, 'cert_resources', 'background3.jpg');
							else if(atype == 4)
								backgroundfile = path.join(__dirname, 'cert_resources', 'background4.jpg');
							else if(atype == 5)
								backgroundfile = path.join(__dirname, 'cert_resources', 'background5.jpg');
							var latexStrings = ["\\documentclass[tikz, 20pt]{extarticle}", "\\usepackage{color}", "\\usepackage{tikz}", "\\usepackage[landscape,left=2cm,right=2cm,top=2cm,bottom=2cm]{geometry}", "\\usepackage[T1]{fontenc}", "\\usepackage{setspace}", "\\usepackage{graphicx}", "\\usepackage{eso-pic}", "\\newcommand \\BackgroundPic{\\put(0,0){\\parbox[b][\\paperheight]{\\paperwidth}{\\vfill \\centering \\includegraphics[height = \\paperheight, width = \\paperwidth]{" + backgroundfile +"} \\vfill}}}",  "\\begin{document}", "\\AddToShipoutPicture{\\BackgroundPic}", "\\pagenumbering{gobble}", "\\noindent", "\\centering \\Huge \\color{red} Octans Group Company " + "\\begin{tikzpicture}[remember picture,overlay]\\node[sep=0pt]{\\includegraphics[width=2cm, height=2cm]{" + logofile + "}} \\end{tikzpicture} \\vskip0.8em \\normalsize Corvallis, OR\\vskip0.8em \\large \\color{black} Achievement award in recognition of \\vskip0.8em \\Huge \\color{red}" + typename + "\\vskip0.6em  \\large \\color{black}Presented to " + areceiver + "\\vskip0.8em  \\normalsize \\color{black}" + amessage + "\\vskip1.0em  \\normalsize \\color{black} Recognized by \\color{black}" + agiver + " on " + adate + ". \\vskip1.0em \\end{document}" ];
							var outputfilepath = path.join(__dirname, 'pdf_temp', 'output.pdf');
							var outputfile = fs.createWriteStream(outputfilepath);
							outputfile.on('open', function(){
								var latexstream = latex(latexStrings).pipe(outputfile);
								latexstream.on('finish', function(){
								var message = {
									from: 'octansosu@gmail.com',
									to: aemail,
									subject: "Congratulations, you have received an award!",
									text: "Congrats, someone has created an award for you through the Octans Employee Recognition System. Please download the attached PDF to view your award.",
									attachments: [
										{
										filename: 'award.pdf',
										path: outputfilepath
										}]};
								var smtpTransport = nodemailer.createTransport(
								{
								service: "gmail",
								auth: {

									//should move this to a config file
									type: "OAuth2",
									user         : "octansosu",
									clientId: "786988129141-itqerrohjv99fiqk47vctg0132kqhaeq.apps.googleusercontent.com",
									clientSecret: "efk5-I22oRg3MWN0e95ZrL90",
									refreshToken : "1/fO50uE99BsxSDqyRTutCaqs45f5nNG9cIwzG8vLZ30E"

									//accessToken not needed if refreshToken provided
									//accessToken : "ya29.GluYBN_sqLOeg_diZ5-VZTvamNRrh1DQeXLV8gdBDu3XfPCAeoOQrCkhzCPsW68RBOZsMgmM9tOaw0xZ0tJILygemEJyacE2NkgAMbEEnULH3F9mn9Fwwv1DlTdj",
									//expires: 3600
									}
								});	
								// verify connection configuration and send email
								smtpTransport.verify(function(error, success) {
   									if (error) {
   										
   										fs.unlinkSync(outputfilepath);
        								
        								console.log(error);

        								res.status(406);
      									res.send("Email server error.");
   										}
   									else {
        								smtpTransport.sendMail(message, function(error, info){
        								if(error){
        									console.log(error);
        									res.status(407);
	      									res.send("Error sending email.");}
	      								else{
        									fs.unlinkSync(outputfilepath);
											res.status(200);
      										res.send("Success! An award has been sent to " + aemail);}
   											});
   										}
									});
								});
							});
						}
		    		else{
		    			//get image from cloudinary data store with this http call, based on this thread: https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
		    			var http = require('http');
						var sigfilepath = path.join(__dirname, 'cert_resources', 'file.jpg');
						var sigfile = fs.createWriteStream(sigfilepath);
						sigfile.on('open', function(){
							var get_cloud_image = http.get(asignature, function(response) {
								response.pipe(sigfile);
								var backgroundfile = path.join(__dirname, 'cert_resources', 'background1.jpg');
								var logofile = path.join(__dirname, 'cert_resources', 'logo.png');
								if(atype == 1)
									backgroundfile = path.join(__dirname, 'cert_resources', 'background1.jpg');
								else if(atype == 2)
									backgroundfile = path.join(__dirname, 'cert_resources', 'background2.jpg');
								else if(atype == 3)
									backgroundfile = path.join(__dirname, 'cert_resources', 'background3.jpg');
								else if(atype == 4)
									backgroundfile = path.join(__dirname, 'cert_resources', 'background4.jpg');
								else if(atype == 5)
									backgroundfile = path.join(__dirname, 'cert_resources', 'background5.jpg');
								var latexStrings = ["\\documentclass[tikz, 20pt]{extarticle}", "\\usepackage{color}", "\\usepackage{tikz}", "\\usepackage[landscape,left=2cm,right=2cm,top=2cm,bottom=2cm]{geometry}", "\\usepackage[T1]{fontenc}", "\\usepackage{setspace}", "\\usepackage{graphicx}", "\\usepackage{eso-pic}", "\\newcommand \\BackgroundPic{\\put(0,0){\\parbox[b][\\paperheight]{\\paperwidth}{\\vfill \\centering \\includegraphics[height = \\paperheight, width = \\paperwidth]{" + backgroundfile +"} \\vfill}}}",  "\\begin{document}", "\\AddToShipoutPicture{\\BackgroundPic}", "\\pagenumbering{gobble}", "\\noindent", "\\centering \\Huge \\color{red} Octans Group Company " + "\\begin{tikzpicture}[remember picture,overlay]\\node[sep=0pt]{\\includegraphics[width=2cm, height=2cm]{" + logofile + "}} \\end{tikzpicture} \\vskip0.8em \\normalsize Corvallis, OR\\vskip0.8em \\large \\color{black} Achievement award in recognition of \\vskip0.8em \\Huge \\color{red}" + typename + "\\vskip0.6em  \\large \\color{black}Presented to " + areceiver + "\\vskip0.8em  \\normalsize \\color{black}" + amessage + "\\vskip1.0em  \\normalsize \\color{black} Recognized by \\color{black}" + agiver + " on " + adate + ". \\vskip1.0em Signed: \\begin{tikzpicture}[remember picture,overlay]\\node[inner sep=0pt] at (2,0){\\includegraphics[width=2.5cm, height=2.5cm]{" + sigfilepath + "}} \\end{tikzpicture} \\end{document}" ];
								var outputfilepath = path.join(__dirname, 'pdf_temp', 'output.pdf');
								var outputfile = fs.createWriteStream(outputfilepath);
								outputfile.on('open', function(){
									var latexstream = latex(latexStrings).pipe(outputfile);
									latexstream.on('finish', function(){
									var message = {
										from: 'octansosu@gmail.com',
										to: aemail,
										subject: "Congratulations, you have received an award!",
										text: "Congrats, someone has created an award for you through the Octans Employee Recognition System. Please download the attached PDF to view your award.",
										attachments: [
											{
											filename: 'award.pdf',
											path: outputfilepath
											}]};
									var smtpTransport = nodemailer.createTransport(
									{
									service: "gmail",
									auth: {

										//should move this to a config file
										type: "OAuth2",
										user         : "octansosu",
										clientId: "786988129141-itqerrohjv99fiqk47vctg0132kqhaeq.apps.googleusercontent.com",
										clientSecret: "efk5-I22oRg3MWN0e95ZrL90",
										refreshToken : "1/fO50uE99BsxSDqyRTutCaqs45f5nNG9cIwzG8vLZ30E"

										//accessToken not needed if refreshToken provided
										//accessToken : "ya29.GluYBN_sqLOeg_diZ5-VZTvamNRrh1DQeXLV8gdBDu3XfPCAeoOQrCkhzCPsW68RBOZsMgmM9tOaw0xZ0tJILygemEJyacE2NkgAMbEEnULH3F9mn9Fwwv1DlTdj",
										//expires: 3600
										}
									});	
									// verify connection configuration and send email
									smtpTransport.verify(function(error, success) {
										if (error) {
										
											fs.unlinkSync(outputfilepath);
											fs.unlinkSync(sigfilepath);
										
											console.log(error);

											res.status(406);
											res.send("Email server error.");
											}
										else {
											smtpTransport.sendMail(message, function(error, info){
											if(error){
												console.log(error);
												res.status(407);
												res.send("Error sending email.");}
											else{
												fs.unlinkSync(outputfilepath);
												fs.unlinkSync(sigfilepath);
												res.status(200);
												res.send("Success! An award has been sent to " + aemail);}
												});
											}
										});
									});
								});
							});
						});}
					}
				});
			}
		});
		}
	});
});


// admin functions
app.post('/admin', function(req,res,next) {
	var context = {};

	// Add new user account
	if (req.body["add-newuser"]) {
		res.render('user-new');
	}
	
	// Insert new user account to database
	if (req.body["insert-user"]) {
		var hash = bcrypt.hashSync(req.body.password, salt);
		
		cloudinary.uploader.upload(req.body.sigData, function(result) {
			console.log(result);
		}, { public_id: req.body.username });
		  
		var admin_flag = "N";

		pool.query("INSERT INTO `user_profile` (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts)" +
					" VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
					[req.body.username, hash, req.body.firstname, req.body.lastname, req.body.email, cloudinary.url(req.body.username), admin_flag],
					function(err,result){
			if (err) {
			    if (err.code == 'ER_DUP_ENTRY') {
					req.flash('message', 'Username already in use. Please try again.');
					res.render('user-new', { message: req.flash('message') });
					console.log(err);
			    }
				else {
					res.status(500);
					res.send("Error! Something isn't right. Confirm the database is up.");
					console.log(err);
				}
			} 
			else {
				req.flash('message', 'New user account created successfully!');
				res.render('admin', { message: req.flash('message') });
			}
		});
	}
	
	// Add new admin account
	if (req.body["add-newadmin"]) {
		res.render('admin-new');
	}

	// Insert new admin account to database
	if (req.body["insert-admin"]) {
		var hash = bcrypt.hashSync(req.body.password, salt);
		
		var admin_flag = "Y";
		
		pool.query("INSERT INTO `user_profile` (username, password, firstname, lastname, email_address, admin_flag, created_ts)" +
					" VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
					[req.body.username, hash, req.body.firstname, req.body.lastname, req.body.email, admin_flag],
					function(err,result){
			if (err) {
			    if (err.code == 'ER_DUP_ENTRY') {
					req.flash('message', 'Username already in use. Please try again.');
					res.render('admin-new', { message: req.flash('message') });
					console.log(err);
			    }
				else {
					res.status(500);
					res.send("Error! Something isn't right. Confirm the database is up.");
					console.log(err);
				}
			} 
			else {
				req.flash('message', 'New admin account created successfully!');
				res.render('admin', { message: req.flash('message') });
			}
		});
	}

	// Displays accounts for management
	if (req.body["accounts"]) {
		pool.query("SELECT * FROM `user_profile`", function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			context.account = [];
			for (var p in rows) {
				context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
									"lastname":rows[p].lastname, "email":rows[p].email_address,
									"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
			}
			res.render('admin', context);
		});
	}

	// Allow admin to edit account information
	if (req.body["edit"]) {
		pool.query("SELECT * FROM `user_profile` WHERE id=?", [req.body.id], function(err, rows, fields) {
			if(err) {
				next(err);
				return;
			}
			context.id = rows[0].id;
			context.username = rows[0].username;
			context.firstname = rows[0].firstname;
			context.lastname = rows[0].lastname;
			context.email = rows[0].email_address;
			res.render('admin-update', context);
		});
	}

	// Update the edited account data to database
	if (req.body["update"]) {
		var admin_flag = req.body.admin_flag;

		pool.query("UPDATE `user_profile` SET username=?, firstname=?, lastname=?, email_address=? WHERE id=?",
					[req.body.username, req.body.firstname, req.body.lastname, req.body.email, req.body.id],
					function(err, result) {
			if(err) {
				next(err);
				return;
			}
		req.flash('message', 'Account has been successfully updated!');
		res.render('admin', { message: req.flash('message') });
		});
	}

	// Delete account
	if (req.body["delete"]) {
		var admin_flag = req.body.admin_flag;
        console.log("Username = " + req.body.username);

		pool.query("DELETE FROM `user_profile` WHERE id=?", [req.body.id], function(err, rows, fields) {
			if(err) {
				next(err);
				return;
			}

    cloudinary.uploader.destroy(req.body.username, function(result) {
      console.log(result);
    });
		req.flash('message', 'Account has been successfully deleted!');
		res.render('admin', { message: req.flash('message') });
		});
	}

	if (req.body["sortby"]) {
		var selected = req.body.selectpicker;
		if (selected == "username") {
			pool.query("SELECT * FROM `user_profile` ORDER BY username ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else if (selected == "firstname") {
			pool.query("SELECT * FROM `user_profile` ORDER BY firstname ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else if (selected == "lastname") {
			pool.query("SELECT * FROM `user_profile` ORDER BY lastname ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else if (selected == "email_address") {
			pool.query("SELECT * FROM `user_profile` ORDER BY email_address ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else if (selected == "admin_flag") {
			pool.query("SELECT * FROM `user_profile` ORDER BY admin_flag ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else if (selected="creation_time") {
			pool.query("SELECT * FROM `user_profile` ORDER BY created_ts ASC", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else {
			pool.query("SELECT * FROM `user_profile`", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.account = [];
				for (var p in rows) {
					context.account.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname,
										"lastname":rows[p].lastname, "email":rows[p].email_address,
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
	}


	if (req.body["reports"]) {
		var num_users = 0;
		var num_awards = 0;

		pool.query("SELECT * FROM `user_profile`", function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			for (var p in rows) {
				num_users++;
			}
			pool.query("SELECT * FROM `award`", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				for (var p in rows) {
					num_awards++;
				}
				context.report = [];
				context.report.push({"num_users":num_users, "num_awards":num_awards});
				res.render('admin', context);
			});
		});
	}

	// handler for awardschart submit
	if (req.body["awardschart"]) {
		var num_edu = 0, num_inno = 0, num_ins = 0, num_team = 0, num_ty = 0;

		var q = "SELECT award_type.description FROM `award_type` \
				INNER JOIN `award` ON award.award_type = award_type.id";

		pool.query(q, function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			for (var p in rows) {
				switch(rows[p].description) {
					case "Education": num_edu++; break;
					case "Innovation": num_inno++; break;
					case "Inspiration": num_ins++; break;
					case "Teamwork": num_team++; break;
					case "Appreciation": num_ty++; break;
				}
			}
			var data, csv;
			var award_data = [
				{"Award Type": "Education", "Amount": num_edu},
				{"Award Type": "Innovation", "Amount": num_inno},
				{"Award Type": "Inspiration", "Amount": num_ins},
				{"Award Type": "Teamwork", "Amount": num_team},
				{"Award Type": "Appreciation", "Amount": num_ty},
			];
			csv = convertArrayToCSV({data: award_data});
			data = encodeURI(csv);

			context = {data, num_edu, num_inno, num_ins, num_team, num_ty};
			res.render('admin', context); 
		});
	}
	
	if (req.body["awardschart2"]) {
		var q = "SELECT user_profile.username, COUNT(award.id) AS awardCount FROM user_profile \
				INNER JOIN award ON award.sender_id = user_profile.id GROUP BY user_profile.username";
		
		pool.query(q, function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			
			var data2, csv;
			var award_data = [];
			for (var p in rows) {
				award_data.push({"User": rows[p].username, "Awards": rows[p].awardCount});
			}
			
			csv = convertArrayToCSV({data2: award_data});
			data2 = encodeURI(csv);
			context = {data2, award_data};
			res.render('admin', context);
		});
	}
	
});

// Helper function
function convertArrayToCSV(args) {
	var result, ctr, keys, columnDelimiter, lineDelimiter, data;

    data = args.data || args.data2 || null;
    if (data == null || !data.length) {
        return null;
    }

    columnDelimiter = args.columnDelimiter || ',';
    lineDelimiter = args.lineDelimiter || '\n';
    keys = Object.keys(data[0]);

    result = '';
    result += keys.join(columnDelimiter);
    result += lineDelimiter;

    data.forEach(function(item) {
        ctr = 0;
        keys.forEach(function(key) {
            if (ctr > 0) result += columnDelimiter;
            result += item[key];
            ctr++;
        });
        result += lineDelimiter;
    });
    return result;
}


/* function to record award in database */
function recordaward(giverid, receiverid, atype, amessage, adate){

	var awardinsertqueryString = "insert into award " +
    	"(sender_id, recepient_id, award_type, comment, award_date)" +
	    " values ( ?, ?, ?, ?, ?);";

  		pool.query(awardinsertqueryString, [giverid, receiverid, atype, amessage, adate], function(err, dbres) {
    		if (err)  {
	      		console.log(err);
    		}
    	});
    }

/*returns current date in mm/dd/yyyy format
*/
    function getCurrentDate(){
      	var today = new Date();
		var dd = today.getDate();
		var mm = today.getMonth()+1; //January is 0!
		var yyyy = today.getFullYear();

		if(dd<10) {
    		dd = '0'+dd
			}

		if(mm<10) {
    		mm = '0'+mm
			}

		today = yyyy + '.' + mm  + '.' + dd;
		return today;
	}
