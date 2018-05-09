/**
 * 路由的封装类
 * Created by dengzhirong on 2017/3/20.
 */

let _ = require('lodash'),
  Config = require('../config'),
  Util = require('../util/util'),
  ResHandler = require('../util/resHandler'),
  restify = require('restify');

class Router {
  constructor(option) {
    option = _.defaults(option, {path: ''});
    this.option = option;
    this.routes = [];
    this.initMethods();
  }

  setOptions(props) {
      for(let key in props) {
          this.option[key] = props[key];
      }
  }

  initMethods() {
      let self = this;
      let methods = ['get', 'del', 'post', 'put'];
      _.forEach(methods, (m) => {
          self[m] = function (url, handler, option) {
              self.routes.push({
                  method: m,
                  url: url,
                  handler: handler,
                  option: _.defaults({
                    throttle_burst: self.option.throttle_burst,
                    throttle_rate: self.option.throttle_rate
                  }, option)
              })
          }
      });
  }

  mount(server) {
    let self = this;
    _.forEach(this.routes, function (r) {
      let routeOption = r.option || {};
      if(_.isEmpty(routeOption)) {
        server[r.method](self.option.path + r.url, r.handler);
      } else {
        if(!Config.TEST_CFG.debug && _.isNumber(routeOption.throttle_rate)) {
            // 设置请求throttle
            let rateLimit = restify.throttle({
                burst: routeOption.throttle_burst || 100,  // the amount of requests to burst to
                rate: routeOption.throttle_rate || 50,  // Steady state number of requests/second to allow
                ip:true  // Do throttling on source IP
            });
            server[r.method](self.option.path + r.url,
                rateLimit,
                function (req, res, next) {
                    reqHandler(r, routeOption, req, res, next);
                });
        } else {
            server[r.method](self.option.path + r.url, function (req, res, next) {
                reqHandler(r, routeOption, req, res, next);
            });
        }
      }
    });
  }
}

function reqHandler(r, routeOption, req, res, next) {
    let allow_ips = routeOption.allow_ips;
    let allow_origins = routeOption.allow_origins;

    // 设置跨域（TODO: For DEBUG）
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!Config.TEST_CFG.debug && !_.isEmpty(allow_ips)) {
        // 判断当前IP是否允许访问
        if (Util.isIpsAllowed(req, allow_ips)) {
            res.send(ResHandler.errorHandler({code: -2, msg: '非法请求', errorType: 'IpDenied'}));
        } else {
            r.handler(req, res, next);
        }
    } else if (!Config.TEST_CFG.debug && !_.isEmpty(allow_origins)) {
        // 判断当前域名是否可允许访问
        let isOriginAllowed = Util.setOriginAllow(allow_origins, req, res);
        if (isOriginAllowed) {
            r.handler(req, res, next);
        } else {
            res.send(ResHandler.errorHandler({code: -2, msg: '非法请求', errorType: 'OriginDenied'}));
        }
    } else {
        r.handler(req, res, next);
    }
}

module.exports = Router;