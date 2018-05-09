/**
 * 登录日志相关的Model
 * Created by dengzhirong on 2018/4/22.
 */
const _ = require('lodash'),
    Config = require('../config'),
    Promise = require('bluebird'),
    Logger = require('../util/logger'),
    BaseModelClass = require('../util/db'),
    CryptoJS = require("crypto-js"),
    UserModel = require('../models/UserModel'),
    Token = require('../util/token'),
    Util = require('../util/util');

let LoginModel = new BaseModelClass( Config.TABLE_CFG.loginLog, 'Id' );

LoginModel.Statuses = { // app状态
    SUCCESS: 0,  // 登录成功
    FAIL: -1, // 登录失败
};

LoginModel.ResCodes = { // http请求的返回码
    errorPwd: -2, // 密码错误
    errorImgCode: -3, // 验证码错误
};

LoginModel.MaxErrorPwdTimes = 9; // 最多连续输错10次密码

module.exports = LoginModel;

// 添加登录日志
LoginModel.log = function(info) {
    info = _.defaults(info, {
        LoginTime: new Date().getTime()
    });
    return this.insert(info);
};

// 用户连续十次输错密码，则禁用
LoginModel.banMaxErrorPwdTimes = function(userName) {
    // 查询十条登录记录，看是否都失败
    return this.find(
        { UserName: userName },
        {
            cols: ['Status', 'Id'],
            limit: this.MaxErrorPwdTimes
        }
    ).then(rows => {
        return _.filter(rows || [], { Status: this.Statuses.FAIL });
    }).then(rows => {
        let notBan = rows.length <= this.MaxErrorPwdTimes;
        if(notBan) return;
        return UserModel.banUserName(userName).then(() => {
            return Promise.reject({code: Config.RES_COMMON_CODES.userIsBan, msg: '该用户已被封号，请联系管理员解封'});
        });
    });
};

LoginModel.encrypto = (str, secret) => { // 加密
    try {
        return CryptoJS.AES.encrypt(str, secret).toString();
    } catch(e) {
        return Promise.reject({msg: '密码解析出错'});
    }
};
LoginModel.decrypto = (encoded, secret) => { // 解密
    try {
        return CryptoJS.AES.decrypt(encoded.toString(), secret).toString(CryptoJS.enc.Utf8);
    } catch(e) {
        return Promise.reject({msg: '密码解析出错'});
    }
};
LoginModel.decryptoPwdFromWeb = (encoded) => { // 解密web端的密码
    // let salt = Config.PASSWORD_SALT.web;
    // return LoginModel.decrypto(encoded, salt);
    return encoded;
};
LoginModel.decryptoPwdFromServer = (encoded) => { // 解密web端的密码
    // let salt = Config.PASSWORD_SALT.server;
    // return LoginModel.decrypto(encoded, salt);
    return encoded;
};
LoginModel.encryptoPwdToServer = (pwd) => { // 加密客户端的密码
    // let salt = Config.PASSWORD_SALT.server;
    // return LoginModel.encrypto(pwd, salt);
    return pwd;
};
LoginModel.encryptoPwdFromWebToServer = (encoded) => { // 加密客户端的密码
    // let realPwd = LoginModel.decryptoPwdFromWeb(encoded);
    // return LoginModel.encryptoPwdToServer(realPwd);
    return encoded;
};
LoginModel.encryptoImgCode = (pwd) => { // 加密图形验证码
    let salt = Config.TOKEN_SALT.loginImgCode;
    return LoginModel.encrypto(pwd, salt);
};
LoginModel.decryptoImgCode = (encoded) => { // 解密图形验证码
    let salt = Config.TOKEN_SALT.loginImgCode;
    return LoginModel.decrypto(encoded, salt);
};

LoginModel.encryptoLoginCookie = (userId) => { // 加密登录Session
    let salt = Config.TOKEN_SALT.loginSessionToken;
    let expire = new Date().getTime() + 600 * 1000;
    return Token.encode(userId, expire, salt);
};
LoginModel.decryptoLoginCookie = (encoded) => { // 解密登录Session
    let salt = Config.TOKEN_SALT.loginSessionToken;
    console.log(encoded, salt);
    return Token.decode(encoded, salt);
};

LoginModel.setLoginTokenToWeb = function(req, res, userId='', maxAge) {
    if(!userId) return;
    let cookieKey = Config.COOKIE_KEYS.loginSessionToken;
    let loginToken = LoginModel.encryptoLoginCookie(userId.toString());
    Util.setCookie(req, res, {
        key: cookieKey,
        value: loginToken
    }, {
        maxAge: maxAge || 1200 // cookie缓存时间。单位为s
    });
};

LoginModel.checkLogin = function(req, res) {
    let cookieKey = Config.COOKIE_KEYS.loginSessionToken;
    let loginSessionToken = req.cookies[cookieKey] || '';
    let userId;
    if(!loginSessionToken) {
        return Promise.reject({code: Config.RES_COMMON_CODES.noLogin, msg: '登录失败'});
    }
    return LoginModel.decryptoLoginCookie(loginSessionToken).then(decoded => {
        userId = decoded.id;
        if(!userId) {
            return Promise.reject({code: Config.RES_COMMON_CODES.noLogin, msg: '登录失败'});
        }
        LoginModel.setLoginTokenToWeb(req, res, userId);
        return userId;
    });
};

LoginModel.checkLoginForce = function(req, res) {
    return LoginModel.checkLogin(req, res)
        .then(userId => {
            userId = parseInt(userId);
            return UserModel.getDetail(userId);
        })
        .then(row => {
            if(_.isEmpty(row)) {
                return Promise.reject({code: Config.RES_COMMON_CODES.userNotFound, msg: '用户不存在'})
            }
            return row;
        })
};