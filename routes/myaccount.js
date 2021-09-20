var express = require('express');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var crypto = require('crypto');
var base32 = require('thirty-two');
var qrcode = require('qrcode');
var totp = require('notp').totp;
var db = require('../db');

var router = express.Router();

/* GET users listing. */
router.get('/',
  ensureLoggedIn(),
  function(req, res, next) {
    db.get('SELECT rowid AS id, username, name FROM users WHERE rowid = ?', [ req.user.id ], function(err, row) {
      if (err) { return next(err); }
    
      // TODO: Handle undefined row.
    
      var user = {
        id: row.id.toString(),
        username: row.username,
        displayName: row.name
      };
      res.render('profile', { user: user });
    });
  });
  
router.get('/authenticators',
  ensureLoggedIn(),
  function(req, res, next) {
    db.all('SELECT rowid as id, * FROM otp_credentials WHERE user_id = ?', [ req.user.id ], function(err, rows) {
      if (err) { return next(err); }
      
      res.locals.otpAuthenticators = [];
      
      rows.forEach(function(row, i) {
        // TODO: Better names
        var otpAuthenticator = {
          id: row.id,
          name: 'OTP Authenticator ' + i,
        };
        
        res.locals.otpAuthenticators.push(otpAuthenticator);
      });
      
      next();
    });
  },
  function(req, res, next) {
    res.render('myaccount/authenticators', { user: req.user });
  });

router.get('/authenticators/new',
  ensureLoggedIn(),
  function(req, res, next) {
    var key = crypto.randomBytes(10);
    var encodedKey = base32.encode(key);
    
    res.locals.key = encodedKey;
    
    // generate QR code for scanning into Google Authenticator
    // reference: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
    var otpUrl = 'otpauth://totp/' + req.user.username
              + '?secret=' + encodedKey + '&period=' + 30;
    
    qrcode.toDataURL(otpUrl, function(err, url) {
      if (err) { return next(err); }
      res.locals.qrImageData = url;
      next();
    });
  },
  function(req, res, next) {
    res.render('myaccount/authenticators/new', { user: req.user });
  });

router.post('/authenticators',
  ensureLoggedIn(),
  function(req, res, next) {
    console.log('NEW AUTHENTICATOR!');
    console.log(req.body);
    
    var secret = base32.decode(req.body.secret);
    console.log(secret);
    
    var ok = totp.verify(req.body.code, secret);
    console.log('OK: ' + ok);
    // TODO: fail if not ok
    
    
    db.run('INSERT INTO otp_credentials (secret, user_id) VALUES (?, ?)', [
      secret,
      req.user.id
    ], function(err) {
      console.log(err);
      
      if (err) { return next(err); }
      return next();
    });
  },
  function(req, res, next) {
    res.redirect('/myaccount/authenticators');
  });

module.exports = router;
