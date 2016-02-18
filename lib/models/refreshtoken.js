var mongoose = require('mongoose');
var uuid = require('node-uuid');

var RefreshTokenModel = function() {
  var refreshTokenSchema = mongoose.Schema({
    userId: {type: String},
    token: {type: String, default: uuid.v4()},
    createdAt: {type: Date, default: Date.now},
    consumed: {type: Boolean, default: false}
  });

  return mongoose.model('RefreshToken', refreshTokenSchema);
};

module.exports = new RefreshTokenModel();
