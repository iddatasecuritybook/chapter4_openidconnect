var mongoose = require('mongoose');
var uuid = require('node-uuid');

var AuthCodeModel = function() {
  var authCodeSchema = mongoose.Schema({
    code: {type: String, default: uuid.v4()},
    createdAt: {type: Date, default: Date.now, expires: '10m'},
    consumed: {type: Boolean, default: false},
    clientId: {type: String},
    userId: {type: String},
    redirectUri: {type: String}
  });

  return mongoose.model('AuthCode', authCodeSchema);
};

module.exports = new AuthCodeModel();
