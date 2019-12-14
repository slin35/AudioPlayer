var Express = require('express');
var Tags = require('../Validator.js').Tags;
var {Session, router} = require('../Session.js');
var router = Express.Router({caseSensitive: true});
var async = require('async');

router.baseURL = '/Ssns';

router.get('/', function(req, res) {
   var body = [], ssn, vld = req.validator;

   async.waterfall([
   function(cb) {
      if (vld.checkAdmin(cb)) {Session.getAllIds().forEach(
         id => {
         ssn = Session.findById(id);
         if (ssn.role != null)
            body.push({id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime});
         });
         cb("ok", body);
      }
   }],
   function(err, body) {
      if (err == "ok")
         res.status(200).json(body);
      req.cnn.release();
   });

});

router.post('/', function(req, res) {
   var ssn;
   var vld = req.validator;
   var body = req.body;

   async.waterfall([
      function(cb) {
         if (vld.chain(('email' in body), Tags.badLogin, ['email'])
          .check(('password' in body), Tags.badLogin, ['password'], cb))
          req.cnn.chkQry('select * from Person where email = ?', 
          [req.body.email], cb);
      },
      function(result, fileds, cb) {
         if (vld.check(result.length, Tags.notFound, null)
          && vld.check(result[0].password === req.body.password, Tags.badLogin)) {
            req.ssn = new Session(result[0], res);
            res.location(router.baseURL + '/' + req.ssn.id).status(200).end();
         }
         cb();
      }
   ],
   function(err) {
      req.cnn.release();
   })
});

router.delete('/:id', function(req, res) {
   var vld = req.validator;
   var id = req.params.id;
   var ssn = Session.findById(id);

   if (vld.checkPrsOK(ssn.prsId)) {
      req.session.resetSession(id);
      res.status(200).end();
   }
   else {
      res.status(403).end();
   }

   req.cnn.release(); 
});

router.get('/:id', function(req, res) {
   var vld = req.validator;
   var ssn = Session.findById(req.params.id);

   if (vld.check(ssn, Tags.notFound) && vld.checkPrsOK(ssn.prsId)) {
      res.status(200).json({id: ssn.id, prsId: ssn.prsId,
       loginTime: ssn.loginTime});
   }
   req.cnn.release();

});

module.exports = router;
