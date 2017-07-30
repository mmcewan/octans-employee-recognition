// app.js
var express = require('express');
var app = express();


//packages related to pdf generation and mailing
var nodemailer = require('nodemailer');
var xoauth2 = require('xoauth2');
var path = require('path');
//const path = require('path');
var fs = require('fs');
var latex = require('latex');

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
  passport.authenticate('local-login', { failureRedirect : '/login', failureFlash : true }),
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

  cloudinary.uploader.upload(req.body.sigData, function(result) {
    console.log(result);
  }, { public_id: req.body.username });

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

app.get('/myawards', isLoggedIn, function (req, res, next) {
  var context = {};
  var query = "select up.firstname, up.lastname, atype.description, a.comment, a.award_date, a.id"
  + " from award a"
  + " inner join user_profile up on up.id = a.sender_id"
  + " inner join user_profile up2 on up2.id = a.recepient_id"
  + " inner join award_type atype on atype.id = a.award_type"
  + " where up2.username = '" + req.user + "';";

    pool.query(query, function(err, rows, field) {
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

    pool.query(query, function(err, rows, field) {
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
    pool.query(query, function(err, rows, field) {
      if(err) {
        next(err);
        return;
      }
      context.message = "Award deleted.";
      res.render('account.handlebars', context);
    })
  }
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/session_info', isLoggedIn, function (req, res) {
  res.send(req.user);
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
  res.render('createaward.handlebars');
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
pool.query("select id, firstname, lastname, email_address from user_profile;", function (err, dbres){
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
var amessage = req.body.amessage;
var adate = getCurrentDate();
var aemail;
var atype = req.body.atype;
var receiverid = req.body.areceiver;
var giverid = req.user;

var giverQueryString = "select id, firstname, lastname, signature from user_profile " +
                    " where username = ?";
  pool.query(giverQueryString, [req.user], function(err, dbres) {
    if (err)  {
      res.status(500);
      res.send("SERVER ERROR");
      console.log(err);
    } else if (dbres.length != 1) {
      res.status(402);
      res.send("GIVER USER NOT FOUND");
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
      		res.send("SERVER ERROR");
      		console.log(err);
    		}
    		else if (dbres.length != 1) {
      		res.status(402);
      		res.send("RECEIVER USER NOT FOUND");
    		}
		    else
		    	{
		    	aemail = dbres[0].email_address;
		    	areceiver =  dbres[0].firstname + " " + dbres[0].lastname;
		    	recordaward(giverid, receiverid, atype, amessage, adate);

		    	var typequeryString = "select id, description from award_type " +
                    " where id = ?";
  			    		pool.query(typequeryString, [atype], function(err, dbres) {
		    	if (err)  {
		    		res.status(500);
		    		res.send("SERVER ERROR");
      				console.log(err);
    			}
    			else if (dbres.length != 1) {
      				res.status(402);
      				res.send("AWARD NOT FOUND");
    				}
		    	else
		    		{
		    		var typename = dbres[0].description;
		    		
		    		//get image from cloudinary data store with this http call, based on this thread: https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
		    		var http = require('http');
		    		var sigfilepath = path.join(__dirname, 'cert_resources', 'file.jpg');
		    		var file = fs.createWriteStream(sigfilepath);
					var get_cloud_image = http.get(asignature, function(response) {
  						response.pipe(file);
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
						var latexStrings = ["\\documentclass[tikz, 20pt]{extarticle}", "\\usepackage{color}", "\\usepackage{tikz}", "\\usepackage[landscape,left=2cm,right=2cm,top=2cm,bottom=2cm]{geometry}", "\\usepackage[T1]{fontenc}", "\\usepackage{setspace}", "\\usepackage{graphicx}", "\\usepackage{eso-pic}", "\\newcommand \\BackgroundPic{\\put(0,0){\\parbox[b][\\paperheight]{\\paperwidth}{\\vfill \\centering \\includegraphics[height = \\paperheight, width = \\paperwidth]{" + backgroundfile +"} \\vfill}}}",  "\\begin{document}", "\\AddToShipoutPicture{\\BackgroundPic}", "\\pagenumbering{gobble}", "\\noindent", "\\centering \\Huge \\color{red} Octans Group Company " + "\\begin{tikzpicture}[remember picture,overlay]\\node[sep=0pt]{\\includegraphics[width=2cm, height=2cm]{" + logofile + "}} \\end{tikzpicture} \\vskip0.8em \\normalsize Corvallis, OR\\vskip0.8em \\large \\color{black} Achievement award in recognition of \\vskip0.8em \\Huge \\color{red}" + typename + "\\vskip0.6em  \\large \\color{black}Presented to " + areceiver + "\\vskip0.8em  \\normalsize \\color{black}" + amessage + "\\vskip0.8em  \\normalsize \\color{black} Recognized by \\color{black}" + agiver + ": \\begin{tikzpicture}[remember picture,overlay]\\node[inner sep=0pt] at (0,0){\\includegraphics[width=2.5cm, height=2.5cm]{" + sigfilepath + "}} \\end{tikzpicture} , on " + adate + ". \\end{document}" ];
						var outputfilepath = path.join(__dirname, 'pdf_temp', 'output.pdf');
						var outputfile = fs.createWriteStream(outputfilepath);
						var latexstream = latex(latexStrings).pipe(outputfile);
						latexstream.on('finish', function(){
		    		
		    			var file = fs.createReadStream(outputfilepath);
		    			var stat = fs.statSync(outputfilepath);
		    			res.setHeader('Content-Length', stat.size);
		    			res.setHeader('Content-Type', 'application/pdf');
		    			res.setHeader('Content-Disposition', 'attachment; filename=award.pdf');
		    			file.pipe(res);
		    			file.on('finish', function(){
							fs.unlinkSync(outputfilepath);
							fs.unlinkSync(sigfilepath);});
							});
							
							});
						}
					});
		    	}
			});	
		}
	});
});


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

  /*
  var message = {
    from: 'octansosu@gmail.com',
    to: aemail,
    subject: "Contratulation, you have received an award!",
    text: amessage,
    attachments: [
        {
            filename: 'output.pdf',
            path: './pdf_temp/output.pdf'
        }]};

  var smtpTransport = nodemailer.createTransport(
        {
        service: "gmail",
        auth: {
          type: "OAuth2",
            user         : "octansosu",
            clientId: "786988129141-itqerrohjv99fiqk47vctg0132kqhaeq.apps.googleusercontent.com",
            clientSecret: "efk5-I22oRg3MWN0e95ZrL90",
            refreshToken : "1/3_8LW7zocr5EMYemekC68W-IFBO2W26enLJgLySmoH4",
            accessToken  : "ya29.GluGBF45d5ws0x1Y0oG_0fwstBuJOvqnwbKJoAmAQiidFuD-IcVQ9jR1bChPLMh37ZLS6x7MHqos000pgmhCVUKYVHSJlChXKkZeN_TpVluShSS_145vt7bO7bZS"
        }
      });

  smtpTransport.sendMail(message);
*/

  //res.status(200);
    // res.send("SUCCESS");


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
