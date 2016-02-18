var mongoose = require('mongoose');
var uuid = require('node-uuid');

var IdTokenModel = function() {
  var idTokenSchema = mongoose.Schema({
    createdAt: {type: Date, default: Date.now, expires: '1m'},
    iat: {type: String, default: Math.floor(new Date() / 1000)},
    exp: {type: String, default: Math.floor(new Date() / 1000) + 180},
    sub: {type: String, default: uuid.v4(), maxlength: 255},
    iss: {type: String},
    aud: {type: String},
    userId: {type: String}
  });

  return mongoose.model('IdToken', idTokenSchema);
};

module.exports = new IdTokenModel();
