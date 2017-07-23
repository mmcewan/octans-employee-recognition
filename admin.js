// Basic admin user functionalities (add/edit/delete normal users and admin users)

var express = require('express');
var router = new express.Router();

var mysql = require('mysql');
var dbconfig = require('./config/database.json');
var pool = new mysql.createPool(dbconfig);

var bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);

router.get('/admin', function(req,res,next) {
	res.render('admin');
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
	
	// Displays users for management
	if (req.body["users"]) {
		pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'N'", function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			context.user = [];
			for (var p in rows) {
				context.user.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
									"lastname":rows[p].lastname, "email":rows[p].email_address, 
									"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
			}
			res.render('admin', context);
		});
	}

	// Displays admins for management
	if (req.body["admins"]) {
		pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'Y'", function(err, rows, field) {
			if(err) {
				next(err);
				return;
			}
			context.admin = [];
			for (var p in rows) {
				context.admin.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
									"lastname":rows[p].lastname, "email":rows[p].email_address, 
									"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
			}
			res.render('admin', context);
		});
	}
	
	// Allow admin to edit user/admin information 
	if (req.body["edit"]) {
		pool.query("SELECT * FROM `user_profile` WHERE id=?", [req.body.id], function(err, rows, fields) {
			if(err) {
				next(err);
				return;
			}
			context.id = rows[0].id;
			context.username = rows[0].username;
			//context.password  
			context.firstname = rows[0].firstname;
			context.lastname = rows[0].lastname;
			context.email = rows[0].email_address;
			//context.signature
			context.admin_flag = rows[0].admin_flag;
			res.render('admin-update', context);
		});
	}
	
	// Update the edited user/admin data to database
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
		if (admin_flag == 'N') {
			pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'N'", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.user = [];
				for (var p in rows) {
					context.user.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
										"lastname":rows[p].lastname, "email":rows[p].email_address, 
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else {
			pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'Y'", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.admin = [];
				for (var p in rows) {
					context.admin.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
										"lastname":rows[p].lastname, "email":rows[p].email_address, 
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
	}
	
	// Delete user/admin
	if (req.body["delete"]) {
		var admin_flag = req.body.admin_flag;
		
		pool.query("DELETE FROM `user_profile` WHERE id=?", [req.body.id], function(err, rows, fields) {
			if(err) {
				next(err);
				return;
			}
		});
		if (admin_flag == 'N') {
			pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'N'", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.user = [];
				for (var p in rows) {
					context.user.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
										"lastname":rows[p].lastname, "email":rows[p].email_address, 
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
		else {
			pool.query("SELECT * FROM `user_profile` WHERE admin_flag = 'Y'", function(err, rows, field) {
				if(err) {
					next(err);
					return;
				}
				context.admin = [];
				for (var p in rows) {
					context.admin.push({"id":rows[p].id, "username":rows[p].username, "firstname":rows[p].firstname, 
										"lastname":rows[p].lastname, "email":rows[p].email_address, 
										"admin_flag":rows[p].admin_flag, "timestamp":rows[p].created_ts});
				}
				res.render('admin', context);
			});
		}
	}
	
	
	/*	
	if (req.body["reports") {
		
	}
	*/
});


module.exports = router;
