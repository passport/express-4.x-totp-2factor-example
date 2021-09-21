var express = require('express');
var passport = require('passport');

var router = express.Router();

/* GET users listing. */
router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post('/login/password', passport.authenticate('local', {
  successRedirect: '/login/otp', // TODO: make this contextual on the session
  failureRedirect: '/login',
  failureMessage: true
}));

router.get('/login/otp', function(req, res, next) {
  res.render('login/otp');
});

router.post('/login/otp/2', 
  // TODO: ensure authenticated
  passport.authenticate('totp', { failureRedirect: '/login/otp/2', failureFlash: true }),
  function(req, res) {
    //req.session.secondFactor = 'totp';
    res.redirect('/');
  });

router.get('/logout', function(req, res, next) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
