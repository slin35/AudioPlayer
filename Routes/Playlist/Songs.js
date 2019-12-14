var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({caseSensitive: true});
var async = require('async');

router.baseURL = '/Songs';

router.get('/', function(req, res) {
   var genre = req.query.genre;
   var title = req.query.title;
   var artist = req.query.artist;
   var query;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role == null) {
         cb("unauthorized");
      }
      else {
         if (title && genre && artist){
            query = "select id, title, artist, genre, link \
             from Song where artist = ? and and genre = ? title \
             like '" + title +"%'";

             req.cnn.chkQry(query, [artist, genre], cb);
         }
         else if (genre && title) {
            query = "select id, title, artist, genre, link \
             from Song where genre = ? and title like '" + title + "%'";

             req.cnn.chkQry(query, [genre], cb);
         }
         else if (genre && artist) {
            req.cnn.chkQry("select id, title, artist, genre, link \
             from Song where genre = ? and artist = ? ", [genre, artist], cb);
         }
         else if (title && artist) {
            query = "select id, title, artist, genre, link \
             from Song where artist = ? and title like '" + title + "%'";

             req.cnn.chkQry(query, [artist], cb);
         }
         else if (genre) 
            req.cnn.chkQry("select id, title, artist, genre, link \
             from Song where genre = ?", [genre], cb);
         else if (title) {
            query = "select id, title, artist, genre, link \
             from Song where title like '" + title + "%'";

            req.cnn.chkQry(query, null, cb);
         }
         else if (artist)
            req.cnn.chkQry("select id, title, artist, genre, link \
             from Song where artist = ?", [artist], cb);
         else 
            req.cnn.chkQry("select id, title, artist, genre, link \
             from Song", null, cb);
      }
   },
   function(result, fields, cb) {
      if (result) {
         cb("ok", result);
      }
   }],
   function(err, result) {
      if (err == "unauthorized")
         res.status(401).end();
      else 
         res.status(200).json(result);
      req.cnn.release();
   });  

});

router.get('/:sId', function(req, res) {
   var vld = req.validator;
   var sId = req.params.sId;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role == null)
         cb("unauthorized");
      else {
         req.cnn.chkQry("select id, title, artist, genre, link \
          from Song where id = ? ", [sId], cb);
      }
   },
   function(result, fields, cb) {
      if (vld.check(result.length, Tags.notFound, null, cb)) {
         cb("ok", result[0]);
      }
   }],
   function(err, result) {
      if (err == "unauthorized")
         res.status(401).end();
      if (err == "ok")
         res.json(result);

      req.cnn.release();
   });

});

module.exports = router;