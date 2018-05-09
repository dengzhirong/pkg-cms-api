/**
 * 将send处理函数绑定到 http Response
 */

let ResHandler = require('../util/resHandler');

function bindResHandler(req, res, next) {
    res.succSend = function(data) {
      return res.send( ResHandler.successHandler(data, req, res) );
    };

    res.errorSend = function(err) {
      return res.send( ResHandler.errorHandler(err, req, res) );
    };

    next();
}

module.exports = bindResHandler;