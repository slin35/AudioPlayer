// Create a validator that draws its session from |req|, and reports
// errors on |res|
var Validator = function(req, res) {
   this.errors = [];   // Array of error objects having tag and params
   this.session = req.session;
   this.res = res;
};

// List of errors, and their corresponding resource string tags
Validator.Tags = {
   noLogin: "noLogin",              // No active session/login
   noPermission: "noPermission",    // Login lacks permission.
   missingField: "missingField",    // Field missing. Params[0] is field name
   badValue: "badValue",            // Bad field value.  Params[0] is field name
   notFound: "notFound",            // Entity not present in DB
   badLogin: "badLogin",            // Email/password combination invalid
   dupEmail: "dupEmail",            // Email duplicates an existing email
   noTerms: "noTerms",              // Acceptance of terms is required.
   forbiddenRole: "forbiddenRole",  // Cannot set to this role
   noOldPwd: "noOldPwd",            // Password change requires old password
   dupTitle: "dupTitle",            // Title duplicates an existing cnv title
   queryFailed: "queryFailed",
   forbiddenField: "forbiddenField",
   oldPwdMismatch: "oldPwdMismatch"
};

// Check |test|.  If false, add an error with tag and possibly empty array
// of qualifying parameters, e.g. name of missing field if tag is
// Tags.missingField.
//
// Regardless, check if any errors have accumulated, and if so, close the
// response with a 400 and a list of accumulated errors, and throw
//  this validator as an error to |cb|, if present.  Thus,
// |check| may be used as an "anchor test" after other tests have run w/o
// immediately reacting to accumulated errors (e.g. checkFields and chain)
// and it may be relied upon to close a response with an appropriate error
// list and call an error handler (e.g. a waterfall default function),
// leaving the caller to cover the "good" case only.
Validator.prototype.check = function(test, tag, params, cb) {
   if (!test)
      this.errors.push({tag: tag, params: params});
   
   if (this.errors.length) {
      if (this.res) {
         if (this.errors[0].tag === Validator.Tags.noPermission)
            this.res.status(403).end();
         else
            this.res.status(400).json(this.errors);
         this.res = null;   // Preclude repeated closings
      }
      if (cb)
         cb(this);
   }
   return !this.errors.length;
};

Validator.prototype.checkPwdMismatch = function(body, pwd, tag, cb) {
   if ('password' in body) {
      if (this.session.isAdmin())
         return true;
      return this.check(body.oldPassword == pwd, tag, null, cb);
   }
   return true;
}

// Somewhat like |check|, but designed to allow several chained checks
// in a row, finalized by a check call.
Validator.prototype.chain = function(test, tag, params) {
   if (!test) {
      this.errors.push({tag: tag, params: params});
   }
   return this;
};

Validator.prototype.checkAdmin = function(cb) {
   return this.check(this.session && this.session.isAdmin(),
    Validator.Tags.noPermission, null, cb);
};

// Validate that AU is the specified person or is an admin
Validator.prototype.checkPrsOK = function(prsId, cb) {
   return this.check(this.session &&
    (this.session.isAdmin() || this.session.prsId == prsId),
    Validator.Tags.noPermission, null, cb);
};

Validator.prototype.checkNoOldPwd = function(body, tag) {
   if ('password' in body) {
      if (('oldPassword' in body) || this.session.isAdmin()) {
         return this;
      }
      else
         this.errors.push({tag: tag, params: null});
   }
   return this;
}

Validator.prototype.checkRoleValue = function(body, tag, params) {
   if ('role' in body) {
      if (body.role == 1) {
         if (!this.session.isAdmin()) {
            this.errors.push({tag: tag, params: params});
         }
      }
      else if (body.role != 0) {
         this.errors.push({tag: tag, params: params});
      }
   }
   return this;
}

// Check presence of truthy property in |obj| for all fields in fieldList
Validator.prototype.hasFields = function(obj, fieldList, cb) {
   var self = this;

   fieldList.forEach(function(name) {
    self.chain(obj.hasOwnProperty(name), Validator.Tags.missingField, [name])
    .chain(!(obj[name] === "" || obj[name] === null), 
    Validator.Tags.missingField, [name]);
   });

   return this.check(true, null, null, cb);
};

Validator.prototype.hasOnlyFields = function(obj, fieldList) {
   var keys = Object.keys(obj);
   var flag = false;
   
   for (var key in keys) {
      for (var field in fieldList) {
         if (key == field) {
            flag = true;
         }
      }
      if (flag == false)
         return false;
      if (keys.length == 0)
         return false;
   }
   return true;
}


Validator.prototype.checkFieldsForUpdate = function(obj, fieldList) {
   var keys = Object.keys(obj);
   var flag = 0;

   if (keys.length == 0)
      return true;
   for (var key in keys) {
      for (var field in fieldList) {
         if (keys[key] == fieldList[field])
            flag = true;
      }
      if (flag == false){
         this.chain(false, Validator.Tags.forbiddenField, [keys[key]]);
      }
      flag = false;
   }
   return true;
}



Validator.prototype.bodyIsEmpty = function(obj, fieldList) {
   if (Object.keys(obj).length == 0)
      return true;
   return false;
}

module.exports = Validator;
