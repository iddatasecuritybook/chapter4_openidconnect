var express = require('express');
var router = express.Router();

// Require models
var RefreshToken = require('../lib/models/refreshtoken');
var Token = require('../lib/models/token');
var IdToken = require('../lib/models/idtoken');
var AuthCode = require('../lib/models/authcode');
var Client = require('../lib/models/client');

// Require custom error
var OAuthError = require('../lib/errors/oautherror');
var errorHandler = require('../lib/errors/handler');

// Require middleware
var authorize = require('../lib/middleware/authorize');

/* GET 1. Issue Authorization Codes */
router.get('/authorize', function(req, res, next) {
  var responseType = req.query.response_type;
  var clientId = req.query.client_id;
  var redirectUri = req.query.redirect_uri;
  var scope = req.query.scope;
  var state = req.query.state;

  if (!responseType) {
    next(new OAuthError('invalid_request',
      'Missing parameter: response_type'));
  }

  if (responseType !== 'code') {
    // cancel the request
    next(new OAuthError('unsupported_response_type',
      'Response type not supported'));
  }

  if (!clientId) {
    // cancel the request
    next(new OAuthError('invalid_request',
      'Missing parameter: client_id'));
  }

  if (!scope) {
    // it is required to provide a scope for openid connect
    next(new OAuthError('invalid_request',
      'Missing parameter: scope'));
  }

  if (scope.indexOf('openid') < 0) {
    // the scope needs to be at least 'openid'
    next(new OAuthError('invalid_scope',
      'Provided scope is invalid, unknown, or malformed'));
  }

  Client.findOne({
    clientId: clientId
  }, function(err, client) {
    if (err) {
      next(new OAuthError('invalid_client',
        'Invalid client provided, client malformed or client unknown', err));
    }

    if (!client) {
      next(new OAuthError('invalid_client',
        'Invalid client provided, client malformed or client unknown'));
    }

    if (redirectUri !== client.redirectUri) {
      next(new OAuthError('invalid_client',
        'Invalid client provided, client malformed or client unknown'));
    }

    if (scope !== client.scope) {
      next(new OAuthError('invalid_scope',
        'Scope is missing or not well-defined'));
    }

    var authCode = new AuthCode({
      clientId: clientId,
      userId: client.userId,
      redirectUri: redirectUri
    });
    authCode.save();

    var response = {
      state: state,
      code: authCode.code
    };

    if (redirectUri) {
      var redirect = redirectUri +
        '?code=' + response.code +
        (state === undefined ? '' : '&state=' + state);
      res.redirect(redirect);
    } else {
      res.json(response);
    }
  });
});

/* POST 2. Issue Access Token */
router.post('/token', function(req, res) {
  var grantType = req.body.grant_type;
  var refreshToken = req.body.refresh_token;
  var authCode = req.body.code;
  var redirectUri = req.body.redirect_uri;
  var clientId = req.body.client_id;

  if (!grantType) {
    return errorHandler(new OAuthError('invalid_request',
      'Missing parameter: grant_type'), res);
  }

  if (grantType === 'authorization_code') {
    AuthCode.findOne({
      code: authCode
    }, function(err, code) {
      if (err) {
        return errorHandler(new OAuthError('invalid_request',
          'Parameter malformed or invalid', err), res);
      }

      if (!code) {
        return errorHandler(new OAuthError('invalid_request',
          'Parameter malformed or invalid'), res);
      }

      if (code.consumed) {
        return errorHandler(new OAuthError('invalid_grant',
          'Authorization Code expired'), res);
      }

      code.consumed = true;
      code.save();

      if (code.redirectUri !== redirectUri) {
        return errorHandler(new OAuthError('invalid_grant',
          'Redirect URI does not match'), res);
      }

      Client.findOne({
        clientId: clientId
      }, function(error, client) {
        if (error) {
          return errorHandler(new OAuthError('invalid_client',
            'Invalid client provided, client malformed or client unknown',
            error), res);
        }

        if (!client) {
          return errorHandler(new OAuthError('invalid_client',
            'Invalid client provided, client malformed or client unknown'),
            res);
        }

        var _refreshToken = new RefreshToken({
          userId: code.userId
        });
        _refreshToken.save();

        var _token;
        var response;
        if (client.scope && (client.scope.indexOf('openid') >= 0)) {
          // OpenID Connect request
          var _idToken = new IdToken({
            iss: client.redirectUri,
            aud: client.clientId,
            userId: code.userId
          });
          _idToken.save();

          _token = new Token({
            refreshToken: _refreshToken.token,
            idToken: _idToken.sub,
            userId: code.userId
          });
          _token.save();

          // send the new token to the consumer
          response = {
            access_token: _token.accessToken,
            refresh_token: _token.refreshToken,
            id_token: _idToken.sub,
            expires_in: _token.expiresIn,
            token_type: _token.tokenType
          };

          res.json(response);
        } else {
          _token = new Token({
            refreshToken: _refreshToken.token,
            userId: code.userId
          });
          _token.save();

          // send the new token to the consumer
          response = {
            access_token: _token.accessToken,
            refresh_token: _token.refreshToken,
            expires_in: _token.expiresIn,
            token_type: _token.tokenType
          };

          res.json(response);
        }
      });
    });
  } else if (grantType === 'refresh_token') {
    if (!refreshToken) {
      return errorHandler(new OAuthError('invalid_request',
        'Missing parameter: refresh_token'), res);
    }

    RefreshToken.findOne({
      token: refreshToken
    }, function(err, token) {
      if (err) {
        return errorHandler(new OAuthError('invalid_grant',
          'Refresh Token invalid, malformed or expired',
          err), res);
      }

      if (!token) {
        return errorHandler(new OAuthError('invalid_grant',
          'Refresh Token invalid, malformed or expired'), res);
      }

      // consume all previous refresh tokens
      RefreshToken.update({
        userId: token.userId,
        consumed: false
      }, {
        $set: {consumed: true}
      });

      var _refreshToken = new RefreshToken({
        userId: token.userId
      });
      _refreshToken.save();

      var _token = new Token({
        refreshToken: _refreshToken.token,
        userId: token.userId
      });
      _token.save();

      var response = {
        access_token: _token.accessToken,
        refresh_token: _token.refreshToken,
        expires_in: _token.expiresIn,
        token_type: _token.tokenType
      };

      // issue the new token to the consumer
      res.json(response);
    });
  } else {
    return errorHandler(new OAuthError('unsupported_grant_type',
      'Grant type not supported'), res);
  }
});

/* GET 3. Provide Access To Protected Resource */
router.get('/userinfo', authorize, function(req, res) {
  res.send('Protected resource');
});

/* GET Test route to create a new Client  */
router.get('/', function(req, res, next) {
  var client = new Client({
    name: 'Test',
    userId: 1,
    scope: 'openid',
    redirectUri: 'http://localhost:5000/callback'
  });
  client.save(function(err) {
    if (err) {
      next(new Error('Client name exists already'));
    } else {
      res.json(client);
    }
  });
});

module.exports = router;
