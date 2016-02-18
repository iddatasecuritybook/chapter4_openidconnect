var Token = require('../models/token');
var OAuthError = require('../errors/oautherror');

var authorize = function(req, res, next) {
  var accessToken;

  // check the authorization header
  if (req.headers.authorization) {
    // validate the authorization header
    var parts = req.headers.authorization.split(' ');

    if (parts.length < 2) {
      // no access token got provided - cancel
      next(new OAuthError('invalid_client',
        'No client authentication provided'));
    }

    accessToken = parts[1];
  } else {
    // access token URI query parameter or entity body
    accessToken = req.query.access_token || req.body.access_token;
  }

  if (!accessToken) {
    // no access token got provided - cancel
    next(new OAuthError('invalid_request', 'Access Token missing'));
  }

  Token.findOne({
    accessToken: accessToken
  }, function(err, token) {
    // Same as in above example
    if (err) {
      // handle the error
      next(new OAuthError('invalid_token', 'Access Token invalid', err));
    }

    if (!token) {
      // no token found - cancel
      console.log('no token found');
      next(new OAuthError('invalid_token', 'Access Token invalid'));
    }

    if (token.consumed) {
      // the token got consumed already - cancel
      next(new OAuthError('invalid_token', 'Access Token expired'));
    }

    // consume all tokens - including the one used
    Token.update({
      userId: token.userId,
      consumed: false
    }, {
      $set: {consumed: true}
    });

    // ready to access protected resources
    next();
  });
};

module.exports = authorize;
