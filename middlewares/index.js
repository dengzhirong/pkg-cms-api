/**
 * 挂载全部的中间件
 * Created by dengzhirong on 2017/3/20.
 */

let MiddleWareManager = {};

MiddleWareManager.mountAll = function mountAll(app) {
  require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if(file !== 'index.js') {
      let middleware = require('./' + file);
      app.use(middleware);
    }
  });
};

module.exports = MiddleWareManager;