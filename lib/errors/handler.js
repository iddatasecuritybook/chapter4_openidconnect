/**
 * OAuthError Handler
 *
 * @param {Error} err the error to be thrown
 * @param {Object} res the response object
 */
function handleError(err, res) {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');

  if (err.code === 'invalid_client') {
    var header = 'Bearer realm="book", error="invalid_token",' +
      'error_description="No access token provided"';
    res.set('WWW-Authenticate', header);
  }
  res.status(err.status).send({
    error: err.code,
    description: err.message
  });
}

module.exports = handleError;
