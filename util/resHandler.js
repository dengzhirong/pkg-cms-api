/**
 * http Response的处理函数
 * Created by dengzhirong on 2017/3/20.
 */

let Errors = require('./errors'),
    Util = require('./util'),
    env = process.env.NODE_ENV,
    logger = require('./logger'),
    TEST_CFG = require('../config').TEST_CFG,
    Config = require('../config');

// 请求失败的处理函数
let errorHandler = (err, req, res) => {
  let errorRes = {
    code: err.code || Config.RES_COMMON_CODES.fail || -1
  };
  errorRes.msg = err.msg || "请求失败!";
  if(TEST_CFG.debug || TEST_CFG.response_debug) {
    errorRes.error = err;
    errorRes.error.errorType = err.errorType || err.constructor.name;
  }
  Util.log(err);

  logger.resError(req, res, err);

  if(Errors.isCustomError(err)) {
    if(!TEST_CFG.debug) {
      //print err.stack when run in DEBUG mode
      delete err.stack;
    }
  }
  return errorRes;
};

// 请求成功的处理函数
let successHandler = (data, req, res) => {
  if(data instanceof Error) {
    return errorHandler(data, req, res);
  }

  let { code, msg } = data;
  let successRes = {};
  if (data && code && msg) {
    successRes = data;
  } else {
    successRes = {
      code: code === undefined ? (Config.RES_COMMON_CODES.success || 1) : code,
      msg,
      data
    };
  }

  return successRes;
};

exports.errorHandler = errorHandler;
exports.successHandler = successHandler;