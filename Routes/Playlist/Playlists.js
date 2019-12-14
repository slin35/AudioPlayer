var Express = require('express');
var Tags = require('../Validator.js').Tags;
var router = Express.Router({caseSensitive: true});
var async = require('async');

router.baseURL = '/Playlists';

router.get('/', function(req, res) {
   var owner = req.query.owner;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role == null) {
         cb("unauthorized");
      }
      else {
         if (owner)
            req.cnn.chkQry("select id, title, ownerId, \
             UNIX_TIMESTAMP(whenMade) as whenMade, numLikes from \
             Playlist where ownerId = ?", [owner], cb);
         else 
            req.cnn.chkQry("select id, title, ownerId, \
             UNIX_TIMESTAMP(whenMade) as whenMade, numLikes from \
             Playlist", null, cb);
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

router.post('/', function(req, res) {
   var vld = req.validator;
   var body = req.body;

   async.waterfall([
   function(cb) {
      if (vld.hasOnlyFields(body, ["title"]) &&
       vld.check(('title' in body) && body.title, Tags.missingField, 
       ["title"], cb) &&
       vld.check(body.title.length < 80, Tags.badValue, ["title"], cb)) {

         req.cnn.chkQry("select * from Playlist where title = ?", 
          [body.title], cb);
      } 
   },
   function(existingPlaylist, fields, cb) {
      if (!req.session.prsId)
         cb("notok");
      else
         if (vld.check(!existingPlaylist.length, Tags.dupTitle, null, cb)) {
            body.ownerId = req.session.prsId;
            body.whenMade = new Date();
            req.cnn.chkQry("insert into Playlist set ?", [body], cb);
         }
   },
   function(insRes, fields, cb) {
      res.location(router.baseURL + '/' + insRes.insertId).end();
      cb();
   }],
   function(err) {
      if (err == "notok")
         res.status(400).end();
      req.cnn.release();
   });

});

router.get('/:pId', function(req, res) {
   var vld = req.validator;
   var pId = req.params.pId;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role == null)
         cb("unauthorized");
      else
         req.cnn.chkQry("select id, title, ownerId, \
          UNIX_TIMESTAMP(whenMade) as whenMade, numLikes from \
          Playlist where id = ?", [pId], cb);
   },
   function(result, fields, cb) {
      if (vld.check(result.length, Tags.notFound, null, cb)) {
         cb("ok", result);
      }
   }],
   function(err, result) {
      if (err == "unauthorized")
         res.status(401).end();
      if (err == "ok")
         res.json(result[0]);
      req.cnn.release();
   });

});

router.put('/:pId', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var pId = req.params.pId;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role == null)
         cb("unauthorized");
      else if (!vld.hasOnlyFields(body, ["title"]))
         cb("bad");
      else{
         req.cnn.chkQry('select * from Playlist where id = ?', [pId], cb);
      }
   },
   function(playlists, fields, cb) {
      if (vld.chain(('title' in body) && body.title, Tags.missingField, ["title"])
       .check(playlists.length, Tags.notFound, null, cb) &&
       vld.checkPrsOK(playlists[0].ownerId, cb))
         req.cnn.chkQry('select * from Playlist where id <> ? && title = ?', 
          [pId, body.title], cb);
   },
   function(sameTtl, fields, cb) {
      if (vld.check(!sameTtl.length, Tags.dupTitle, null, cb))
         req.cnn.chkQry("update Playlist set title = ? where id = ?", 
          [body.title, pId], cb);
   }],
   function(err) {
      if (err == "unauthorized")
         res.status(401).end();
      else if (err == "bad")
         res.status(400).end();
      else 
         res.status(200).end();

      req.cnn.release();
   });

});

router.delete('/:pId', function(req, res) {
   var vld = req.validator;
   var pId = req.params.pId;
   var cnvId = req.params.cnvId;

   async.waterfall([
   function(cb) {
      req.cnn.chkQry('select * from Playlist where id = ?', [pId], cb);
   },
   function(playlists, fields, cb) {
      if (vld.check(playlists.length, Tags.notFound, null, cb) &&
       vld.checkPrsOK(playlists[0].ownerId, cb))
         req.cnn.chkQry('delete from Playlist where id = ?', [pId], cb);
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      req.cnn.release();
 
   });

});

router.get('/:pId/Songs', function(req, res) {
   var vld = req.validator;
   var pId = req.params.pId;
   var num = req.query.num;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role === null)
         cb("unauthorized");
      else {
         req.cnn.chkQry("select * from Playlist where id = ? ", [pId], cb);
      }
   },
   function(playlists, fields, cb) {
      if (vld.check(playlists.length, Tags.notFound, null, cb)) {
         if (num == 0 || num) {
            
             req.cnn.chkQry("select DISTINCT s.id, s.title, s.link, s.artist, \
              s.genre from Playlist p, Song s, Playlist_Song b where \
              b.sId = s.id and b.pId = p.id and b.pId = ? \
              LIMIT " + num, [pId], cb);
         }
         else {
             req.cnn.chkQry("select DISTINCT s.id, s.title, s.link, s.artist, \
              s.genre from Playlist p, Song s, Playlist_Song b where \
              b.sId = s.id and b.pId = p.id and b.pId = ? ", [pId], cb);
         }
      }
   },
   function(result, fields, cb) {
      if (result.length) {
         cb("ok", result);
      }
      else 
         cb("cool");   
   }],
   function(err, result) {
      if (err == "unauthorized")
         res.status(401).end();
      if (err == "ok") {
         res.status(200).json(result).end();
      }
      if (err == "cool")
         res.status(200).json([]);
         
      req.cnn.release();
   });

});

router.post('/:pId/Songs', function(req, res) {
   var vld = req.validator;
   var body = req.body;
   var pId = req.params.pId;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role === null)
         cb("unauthorized");
      else {
         req.cnn.chkQry("select * from Playlist where id = ?", [pId], cb);
      }
   },
   function(result, filed, cb){
      if (vld.checkPrsOK(result[0].ownerId, cb) && vld.hasOnlyFields(body, ["sId"]) 
       && vld.check(('sId' in body) && body.sId, Tags.missingField, ["sId"], cb)) {
          body.pId = pId;
          req.cnn.chkQry("insert into Playlist_Song set ?", [body], cb);
       }
   },
   function(result, filed, cb){
      cb(result);
   }],
   function(err) {
      if (err == "unauthorized")
         res.status(401).end();
      else 
         res.status(200).end();
      req.cnn.release();
   });

});


router.post('/:pId/Likes', function(req, res) {
   var vld = req.validator;
   var body = {};
   var pId = req.params.pId;

   body.pId = pId;
   body.prsId = req.session.prsId;
   body.firstName = req.session.firstName;
   body.lastName = req.session.lastName;
   body.email = req.session.email;

   async.waterfall([
   function(cb) {
      req.cnn.chkQry("select * from Likes where lastName = ? and \
       firstName = ? and pId = ? and prsId = ?",
       [body.lastName, body.firstName, body.pId, body.prsId], cb);
   },
   function(result, fields, cb) {
      if (result.length) {      
         res.status(200).end();
         cb("noresult", null, cb);
      }
      else {
         req.cnn.chkQry("insert into Likes set ?", [body], cb);      
      }
   },
   function(insRes, fields, cb) {
      if (insRes == "noresult")
         cb("bad");
      else {
         res.location(router.baseURL + '/' + insRes.insertId + '/Likes').end();
         req.cnn.chkQry("update Playlist set numLikes = numLikes + 1 \
          where id = ?", [pId], cb);
      }   
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      
      req.cnn.release();
   });
});

router.delete('/:pId/Likes', function(req, res) {
   var vld = req.validator;
   var body = {};
   var pId = req.params.pId;
   var prsId = req.session.prsId;

   body.pId = pId;
   body.prsId = req.session.prsId;
   body.firstName = req.session.firstName;
   body.lastName = req.session.lastName;
   body.email = req.session.email;

   async.waterfall([
   function(cb) {
      req.cnn.chkQry("select * from Likes where lastName = ? and \
       firstName = ? and pId = ? and prsId = ?",
       [body.lastName, body.firstName, body.pId, body.prsId], cb);
   },
   function(result, fields, cb) {
      if (!result.length) {      
         res.status(200).end();
         cb("noresult", null, cb);
      }
      else {
         req.cnn.chkQry("delete from Likes where prsId = ? and pId = ?", [prsId, pId], cb);      
      }
   },
   function(insRes, fields, cb) {
      if (insRes == "noresult")
         cb("bad");
      else {
         req.cnn.chkQry("update Playlist set numLikes = numLikes - 1 \
          where id = ?", [pId], cb);
      }   
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      
      req.cnn.release();
   });
});

router.get('/:pId/Likes', function(req, res) {
   var vld = req.validator;
   var pId = req.params.pId;

   async.waterfall([
   function(cb) {
      if (!req.session || req.session.role === null)
         cb("unauthorized");
      else {
         req.cnn.chkQry("select * from Playlist where id = ? ", [pId], cb);
      }
   },
   function(playlists, fields, cb) {
      if (vld.check(playlists.length, Tags.notFound, null, cb)) {
         req.cnn.chkQry("select DISTINCT prsId, lastName, firstName, email \
          from Likes where pId = ?", [pId], cb);
      }
   },
   function(result, fields, cb) {
      if (result.length) {
         cb("ok", result);
      }
      else 
         cb("cool");   
   }],
   function(err, result) {
      if (err == "unauthorized")
         res.status(401).end();
      if (err == "ok") {
         res.status(200).json(result).end();
      }
      if (err == "cool")
         res.status(200).json([]);
         
      req.cnn.release();
   });

});


router.delete('/:pId/Songs/:sId', function(req, res) {
   var vld = req.validator;
   var pId = req.params.pId;
   var sId = req.params.sId;


   async.waterfall([
   function(cb) {
      req.cnn.chkQry('select * from Playlist where id = ?', [pId], cb);
   },
   function(playlists, fields, cb) {
      if (vld.check(playlists.length, Tags.notFound, null, cb) &&
       vld.checkPrsOK(playlists[0].ownerId, cb))
         req.cnn.chkQry('delete from Playlist_Song where sId = ? and \
         pId = ?', [sId, pId], cb);
   }],
   function(err) {
      if (!err)
         res.status(200).end();
      req.cnn.release();
 
   });

});


module.exports = router;
