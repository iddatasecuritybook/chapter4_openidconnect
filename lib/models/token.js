var mongoose = require('mongoose');
var uuid = require('node-uuid');

var TokenModel = function() {
  var tokenSchema = mongoose.Schema({
    refreshToken: {type: String, unique: true},
    idToken: {type: String, unique: true},
    accessToken: {type: String, default: uuid.v4()},
    expiresIn: {type: String, default: '10800'},
    tokenType: {type: String, default: 'bearer'},
    createdAt: {type: Date, default: Date.now, expires: '3m'},
    consumed: {type: Boolean, default: false},
    userId: {type: String}
  });

  return mongoose.model('Token', tokenSchema);
};

module.exports = new TokenModel();
