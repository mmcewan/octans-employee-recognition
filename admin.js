// Basic admin user functionalities (add/edit/delete normal users and admin users)

var express = require('express');
var router = new express.Router();
var path = require('path');

// database
var mysql = require('mysql');
var dbconfig = require('./config/database.json');
var pool = new mysql.createPool(dbconfig);

// password
var bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);


router.get('/admin', function(req,res,next) {
	res.render('admin');
});

router.get('/report1', function(req,res,next) {
	//var context = {};
	var num_edu = 0, num_inno = 0, num_ins = 0, num_team = 0, num_ty = 0;
	
	q = "SELECT award_type.description FROM `award_type`" +
		"INNER JOIN `award` ON award.award_type = award_type.id";
		
	pool.query(q, function(err, rows, field) {
		if(err) {
			next(err);
			return;
		}
		for (var p in rows) {
			switch(rows[p].description) {
				case "Educational": num_edu++; break;
				case "Innovative": num_inno++; break;
				case "Inspiring": num_ins++; break;
				case "Teamwork": num_team++; break;
				case "Thank you": num_ty++; break;
			}
		}
		var context = {num_edu, num_inno, num_ins, num_team, num_ty};
		res.render('report1.pug', context);
	});
});


router.post('/admin', function(req,res,next) {
	var context = {};

	// Add new user/admin
	if (req.body["add-new"]) {
		res.render('admin-new');
	}
	
	// Insert new user to database
	if (req.body["insert"]) {
		var hash = bcrypt.hashSync(req.body.password, salt);
		
		pool.query("INSERT INTO `user_profile` (username, password, firstname, lastname, email_address, signature, admin_flag, created_ts)" +
					" VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
					[req.body.username, hash, req.body.firstname, req.body.lastname, req.body.email, req.body.signature, req.body.admin_flag], 
					function(err,result){
			if(err){
				if (err.code == '23505') {
					res.status(409);
					res.send("Username already in use.");
					console.log(err);
				}
				else {
					res.status(500);
					res.send("Error! Something broke...");
					console.log(err);
				}
			}	
			req.flash('message', 'New account created successfully!');
			res.render('admin', { message: req.flash('message') });
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
			//context.signature
			context.admin_flag = rows[0].admin_flag;
			res.render('admin-update', context);
		});
	}
	
	// Update the edited account data to database
	if (req.body["update"]) {
		var admin_flag = req.body.admin_flag;
		
		pool.query("UPDATE `user_profile` SET username=?, firstname=?, lastname=?, email_address=?, admin_flag=? WHERE id=?",
					[req.body.username, req.body.firstname, req.body.lastname, req.body.email, req.body.admin_flag, req.body.id], 
					function(err, result) {
			if(err) {
				next(err);
				return;
			}		
		});
		// Does not reflect update on the screen as soon as I wanted
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
	
	// Delete account
	if (req.body["delete"]) {
		var admin_flag = req.body.admin_flag;
		
		pool.query("DELETE FROM `user_profile` WHERE id=?", [req.body.id], function(err, rows, fields) {
			if(err) {
				next(err);
				return;
			}
		});
		// Does not reflect update on the screen as soon as I wanted
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
});


module.exports = router;
