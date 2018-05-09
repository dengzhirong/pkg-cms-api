/**
 * Customize Common Errors
 */
let Util = require('util');
let inherits = Util.inherits;
let Errors = {};

function CustomError() {}
Util.inherits(CustomError, Error);

//make error object can call JSON.stringify
Object.defineProperty(CustomError.prototype, 'toJSON', {
  value: function () {
    let alt = {};

    Object.getOwnPropertyNames(this).forEach(function (key) {
      alt[key] = this[key];
    }, this);

    return alt;
  },
  configurable: true,
  writable: true
});

Errors.CustomError = CustomError;

/**
 * ENTITY_NOT_FOUND
 * @param {string} entityTable
 * @param {string} entityId
 * @returns {Object} entityNotFound
 */
Errors.EntityNotFound = function EntityNotFound(entityTable, entityId) {
  this.entityTable = entityTable;
  this.entityId = entityId;
  Error.captureStackTrace(this, Errors.ENTITY_NOT_FOUND);
};

Object.keys(Errors).forEach(function(key) {
  errorType = Errors[key];
  if(errorType !== CustomError) {
    inherits(errorType, CustomError);
  }
});

Errors.isCustomError = function(err) {
  return err instanceof CustomError;
};

module.exports = Errors;