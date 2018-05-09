/**
 * Token通用类
 * Created by dengzhirong on 2017/11/08.
 */
const Promise = require('bluebird'),
    JWT = require('jwt-simple'),
    Config = require('../config'),
    _ = require('lodash');

let BaseToken = {};

module.exports = BaseToken;

const secret = Config.JWT_TOKEN_SECRET;
const HEADER =  JWT.encode('', secret).split('.')[0] + '.';

// 编码
BaseToken.encode = function(tokenBody, expires, _secret=secret) {
    if(expires) {
        tokenBody = !!_.isObject(tokenBody) ? tokenBody : { id: tokenBody };
        tokenBody = _.extend(tokenBody, {
            'exp': expires // 过期时间戳
        });
    }
    let sKey = JWT.encode(tokenBody, _secret, 'HS256');
    sKey = sKey.replace(HEADER, '');
    return sKey;
};

// 解码
BaseToken.decode = function(sKey, _secret=secret) {
    return Promise.resolve()
        .then(() => {
            let realSKey = HEADER + sKey;
            let decoded;
            try {
                decoded = JWT.decode(realSKey, _secret, false, 'HS256');
                return decoded;
            } catch (err) {
                return Promise.reject({errorType: 'InvalidToken', msg: 'InvalidToken'});    // 非法skey
            }
        })
        .then(decoded => {
            if(decoded.exp && decoded.exp < Date.now()) {
                return Promise.reject({errorType: 'ExpiredToken', msg: 'Token已失效'});    // 过期Token
            }
            return decoded;
        });
};