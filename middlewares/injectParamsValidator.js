/**
 * 将参数验证注入req
 */

let ParamsValidator = require('../util/paramsValidator');

function injectParamsValidator(req, res, next) {
    req.paramsValidator = ParamsValidator.from(req.params);

    next();
}

module.exports = injectParamsValidator;