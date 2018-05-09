/**
 * 参数验证函数
 */

let Promise = require('bluebird'),
  _ = require('lodash');

let WholeRules = {
  RequiredAny: "RequiredAny",
};

let REGEXP_TPYE = {
  url: /^https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?(\/((\.)?(\?)?=?&?[a-zA-Z0-9_-](\?)?)*)*$/,
  qq: /^[1-9][0-9]{4,}$/,
  phone: /^(0|86|17951)?(13[0-9]|15[012356789]|18[0-9]|14[57]|17[678])[0-9]{8}$/,
  email: /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/,
};

function ParamsValidator(params) {
  this.params = params;
  this.singlePropRules = {};
  this.wholeRules = {};
}


ParamsValidator.from = function(params) {
  return new ParamsValidator(params);
};


ParamsValidator.prototype.param = function(prop, rule) {
  let required = true;
  if(rule && rule.default) {
    required = false;
  }
  let curRule= {type: String, required: required};
  _.merge(curRule, rule);
  this.singlePropRules[prop] = this.singlePropRules[prop] || [];
  this.singlePropRules[prop].push(curRule);
  return this;
};

ParamsValidator.prototype.required = function(prop) {
  return this.param(prop, {});
};

ParamsValidator.prototype.requiredAny = function(propList) {
  this.wholeRules[WholeRules.RequiredAny] = propList;
  return this;
};

ParamsValidator.prototype.handleWholeRules = function() {
  let self = this;
  return new Promise(function(resolve, reject) {
    _.forEach(self.wholeRules, function(value, ruleKey) {
      if(ruleKey === WholeRules.RequiredAny) {
        let notContainsAnyProps = _.isEmpty(_.intersection(_.keys(
          _.pickBy(self.params, function(val, key) {
            return !_.isEmpty(_.trim(val));
          })
        ), value));
        if(notContainsAnyProps) {
          reject({errorType:'ParamRequired', needOneOfParams: value});
        }
      }
    });
    resolve(true);
  });
};

function validateStringType(resolve, reject, checkProp, checkValue, rule) {
  if(rule.maxlen && checkValue.length > rule.maxlen) {
    reject({errorType: "ParamTooLong", param: checkProp, maxlen: rule.maxlen, paramValue: checkValue});
  }
  if(rule.minlen && checkValue.length < rule.minlen) {
    reject({errorType: "ParamTooShort", param: checkProp, minlen: rule.minlen, paramValue: checkValue});
  }
  if(rule.startsWith && !checkValue.startsWith(rule.startsWith)) {
    reject({errorType: "ParamNotMatch", param: checkProp, mustStartsWith: rule.startsWith});
  }
  if(rule.textType) {
    let textType = rule.textType;
    let regexp = REGEXP_TPYE[textType];
    if(regexp) {
        if(!regexp.test(checkValue)) {
            reject({errorType: "ParamNot" + _.capitalize(textType), param: checkProp, value: checkValue});
        }
    }
  }
  if(rule.values) {
    if(!_.includes(rule.values, checkValue)) {
      reject({errorType: "ParamInvalid", param: checkProp, permitValues: rule.values});
    }
  }
}

function validateNumberType(resolve, reject, checkProp, checkValue, rule, context) {
  if(checkValue) {
    parseValue = parseInt(checkValue);
    if(Number.isNaN(parseValue)) {
      reject({errorType: "ParamIsNotNumber", param: checkProp, paramValue: checkValue});
    } else {
      context.params[checkProp] = checkValue = parseValue;
    }
  }
  if((rule.min || rule.min == 0) && checkValue < rule.min) {
    reject({errorType: "ParamTooMin", param: checkProp, minValue: rule.min});
  }
  if(rule.max && checkValue > rule.max) {
    reject({errorType: "ParamTooMax", param: checkProp, maxValue: rule.max});
  }

  if(rule.values) {
    if(!_.includes(rule.values, checkValue)) {
      reject({errorType: "ParamInvalid", param: checkProp, permitValues: rule.values});
    }
  }
}

function validateArrayType(resolve, reject, checkProp, checkValue, rule, context) {
  checkValue = _.filter(checkValue, s => !!_.trim(s));
  let isSubSet = function(arr1, arr2) {
    return arr1.length === _.intersection(arr1, arr2).length;
  };
  if(!_.isArray(checkValue)) {
    reject({errorType: "ParamTypeArray", param: checkProp, needType: "Array"});
  }
  if(_.isEmpty(checkValue)) {
    reject({errorType: "ParamRequired", param: checkProp});
  }
  if(rule.maxSize && checkValue.length > rule.maxSize) {
    reject({errorType: "ParamArraySizeTooLarge", param: checkProp, maxSize: rule.maxSize});
  }
  if(rule.minSize && checkValue.length < rule.minSize) {
    reject({errorType: "ParamArraySizeTooSmall", param: checkProp, minSize: rule.minSize});
  }
  if(rule.subSet && !isSubSet(checkValue, rule.subSet)) {
    reject({errorType: "ParamInvalid", param: checkProp, mustSubSet: rule.subSet});
  }
  if(rule.textType) {
      let textType = rule.textType;
      let regexp = REGEXP_TPYE[textType];
      if(regexp) {
          let isValid = _.every(checkValue, function(value) {
              return regexp.test(value);
          });
          if(!isValid) {
              reject({errorType: "ParamNot" + _.capitalize(textType), param: checkProp, value: checkValue});
          }
      }
  }
  if(rule.each) {
    let ruleForEach = rule.each;
    if(ruleForEach.type === Number) {
      context.params[checkProp] = _.map(checkValue, function(item) {
        return parseInt(item, 10);
      });
    }
  }
}


function validateJsonArrayType(resolve, reject, checkProp, checkValue, rule, context) {
  let newCheckValue;
  try {
    newCheckValue = JSON.parse(checkValue);
    context.params[checkProp] = newCheckValue;
  } catch (err) {
    reject({errorType: "ParamNotJson", param: checkProp});
  }
  if(!_.isArray(newCheckValue)) {
    reject({errorType: "ParamNotJsonArray", param: checkProp});
  } else {
    validateArrayType(resolve, reject, checkProp, newCheckValue, rule, context)
  }
}

ParamsValidator.prototype.handleSingleRules= function() {
  let self = this;
  let checkValue;

  return new Promise(function(resolve, reject) {
    _.forEach(self.singlePropRules, function(rules, checkProp) {
      _.forEach(rules, function(rule) {
        checkValue= self.params[checkProp];
        if(_.isString(checkValue)) {
          checkValue = checkValue.trim();
          self.params[checkProp] = checkValue;
        }
        if(!self.params[checkProp] && rule.default) {
          self.params[checkProp] = rule.default;
        }
        if(checkValue) {
          if(rule.type === String) {
            validateStringType(resolve, reject, checkProp, checkValue, rule);
          } else if(rule.type === Number) {
            validateNumberType(resolve, reject, checkProp, checkValue, rule, self);
          } else if(rule.type === Array) {
            validateArrayType(resolve, reject, checkProp, checkValue, rule, self);
          }
        } else {
          if(rule.required) {
            reject({errorType: "ParamRequired", param: checkProp});
          }
        }
      });
    });
    resolve(true);
  });
};

ParamsValidator.prototype.validate = function() {
  let self = this;
  return self.handleWholeRules()
    .then(function() {
      return self.handleSingleRules();
    });
};

module.exports = ParamsValidator;