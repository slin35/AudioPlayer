var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');

var router = Express.Router({caseSensitive: true});

router.baseURL = '/Prss';

router.get('/', function(req, res) {
   var emailPrefix = req.query.email;
   var sessionEmailPrefix = req.session.email.split("@")[0];

   if (emailPrefix)
      emailPrefix = req.query.email.split("@")[0];
   else 
      emailPrefix = req.session.email.split("@")[0];

   async.waterfall([
   function(cb) {
      var query = "select email, id from Person where email like '" + 
       emailPrefix + "%'";

      req.cnn.chkQry(query, null, cb);
   },
   function(prsArr, fields, cb) {
      if (req.session.isAdmin()) {
         cb("ok", prsArr);
      }
      else {
         var filterd = prsArr.filter(
          function(ele) {return ele.id == req.session.prsId});

         cb("ok", filterd);
      }
   }],
   function(err, result) {
      res.status(200).json(result);
      req.cnn.release();
   });
});

router.post('/', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var admin = req.session && req.session.isAdmin();
   var cnn = req.cnn;

   if (admin && !body.password)
      body.password = "*"; 


   async.waterfall([
   function(cb) {
      if (vld.hasFields(body, ["email", "firstName", "lastName", "password", "role"], cb) 
       && vld.hasOnlyFields(body, ["email", "lastName", "firstName", "lastName",
       "password", "role", "termsAccepted"])
       && vld.chain(body.role === 0 || admin, Tags.forbiddenRole)
       .chain(body.termsAccepted || admin, Tags.noTerms)
       .check(body.role == 1 || body.role == 0, Tags.badValue, ["role"], cb)) {
         cnn.chkQry('select * from Person where email = ?', [body.email], cb)
      }
   },
   function(existingPrss, fields, cb) {
      if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
         if (admin) {
            if (!body.termsAccepted) {
               body.termsAccepted = null;
            }
            else 
               body.termsAccepted = new Date();
         }
         else 
            body.termsAccepted = new Date();

         cnn.chkQry('insert into Person set ?', [body], cb);
      }
   },
   function(result, fields, cb) {
      res.location(router.baseURL + '/' + result.insertId).end();
      cb();
   }],
   function(err) {
      cnn.release();
   });
});

router.put('/:id', function(req, res) {
   var vld = req.validator;
   var ssn = req.session;
   var body = req.body;
   var admin = req.session && req.session.isAdmin();

   async.waterfall([
   function(cb) {
      if (vld.checkPrsOK(req.params.id, cb) 
       && vld.checkFieldsForUpdate(body, ["firstName", "lastName", 
       "password", "oldPassword", "role"])
       && vld.checkRoleValue(body, Tags.badValue, ["role"])
       .checkNoOldPwd(body, Tags.noOldPwd)
       .check(!('password' in body) || body.password, Tags.badValue, 
       ['password'], cb)) {
         req.cnn.chkQry("select * from Person where id = ?", 
          [req.params.id], cb);
      }
   },
   function(result, fields, cb) {
      if (vld.check(result.length, Tags.notFound, null, cb) &&
       vld.checkPwdMismatch(body, result[0].password, Tags.oldPwdMismatch, cb)) {
         delete body.oldPassword;
         if (vld.bodyIsEmpty(body))
            cb(null, null, cb);
         else 
            req.cnn.chkQry("update Person set ? where id = ?", 
               [body, req.params.id], cb);          
      }
   },
   function(updateRes, fields, cb) {
      res.status(200).end();
      cb(); 
   }],
   function(err) {
      req.cnn.release();
   });
});


router.get('/:id', function(req, res) {
   var vld = req.validator;
   var id = req.params;
   if (!id)
      id = req.session.prsId;

   async.waterfall([
   function(cb) {
      if (req.session.role == null)
         cb("unauthorized");
      else {
         if (vld.checkPrsOK(req.params.id, cb))
            req.cnn.chkQry('select id, firstName, lastName, email, \
             UNIX_TIMESTAMP(termsAccepted) as termsAccepted, role \
             from Person where id = ?', [req.params.id], cb);
      }  
   },
   function(prsArr, fields, cb) {
      for (var i = 0; i < prsArr.length; i++)
         delete prsArr[i]['password'];

      if (vld.check(prsArr.length, Tags.notFound, null, cb)) {
         res.json(prsArr);
         cb();
      }
   }],
   function(err) {
      if (err == "unauthorized")
         res.status(401).end();

      req.cnn.release();
   });
});


router.delete('/:id', function(req, res) {
   var vld = req.validator;

   async.waterfall([
   function(cb) {
      if (vld.checkAdmin(cb)) {
         req.cnn.query('DELETE from Person where id = ?', [req.params.id], cb);
      }
   },
   function(result, fields, cb) {
      if (vld.check(result.affectedRows, Tags.notFound, null, cb)) {
         cb();
      }
   }],
   function(err) {
      res.status(200).end();
      req.cnn.release();
   });
   
});

module.exports = router;
