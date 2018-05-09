/**
 * Created by dengzhirong on 2018/4/23.
 */
const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const Util = require('../util/util');
const Captchapng = require('../util/captchapng');
const Config = require('../config');
const LoginModel = require('../models/LoginLogModel');
const UserModel = require('../models/UserModel');

let LoginController = {},
    LoginMethods = {};
module.exports = LoginController;

/**
 * @api {get} /admin_api/logout  退出登录
 * @apiName  logout
 * @apiGroup cmsLogin
 */
LoginController.logout = (req, res, next) => {
    Util.removeCookie(req, res, Config.COOKIE_KEYS.loginImgCode);
    Util.removeCookie(req, res, Config.COOKIE_KEYS.loginSessionToken);
    res.succSend('已退出');
};

/**
 * @api {get} /admin_api/login  退出登录
 * @apiName  login
 * @apiParam {String} username 账户名
 * @apiParam {String} pwd 密码（已加密）
 * @apiParam {String} code 验证码
 * @apiGroup cmsLogin
 */
LoginController.login = (req, res, next) => {
    let { username, pwd, code, codekey } = req.params;
    let loginStatus = LoginModel.Statuses.FAIL;
    let isPwdWrong, userInfo;
    username = _.trim(username);
    pwd = _.trim(pwd);
    code = _.trim(code);

    return req.paramsValidator
        .param('username', {required: true, type: String})
        .param('pwd', {required: true, type: String})
        .param('code', {required: true, type: String})
        .validate()
        .then(() => {
            // 判断验证码是否错误
            if(Config.TEST_CFG.skip_login_debug || req.params.isTest) return;

            return LoginMethods.checkLoginImgCode(req, res, code, codekey);
        })
        .then(() => {
            // 判断用户是否存在
            return UserModel.checkUserExitByName(username, pwd);
        })
        .then(row => {
            userInfo = row;
            // 连续错误输入密码超过10次，则禁用
            return LoginModel.banMaxErrorPwdTimes(username);
        })
        .then(() => {
            // 写登录日志
            try {
                let pwdFromWeb = LoginModel.decryptoPwdFromWeb(pwd);
                let pwdFromServer = LoginModel.decryptoPwdFromServer(userInfo.Password);
                isPwdWrong = pwdFromWeb != pwdFromServer;
                loginStatus = isPwdWrong ? loginStatus : LoginModel.Statuses.SUCCESS;
                console.log(userInfo.Password, `原密码: ${pwdFromServer}, 登录密码: ${pwdFromWeb}`);
            } catch(e) {
                return Promise.reject({code: LoginModel.ResCodes.errorPwd, msg: '密码输入错误，请重新输入'});
            }
        })
        .then(() => {
            if(isPwdWrong) {
                return Promise.reject({code: LoginModel.ResCodes.errorPwd, msg: '密码输入错误，请重新输入'});
            }
        })
        .then(() => {
            // 写入日志
            return Promise.props({
                logLoginTime: UserModel.logLoginTime(userInfo.Id),
                loginRecord: LoginModel.log({
                    UserName: username,
                    Password: pwd,
                    Status: loginStatus,
                    IpAddress: Util.getIp(req) || '',
                    LoginTime: new Date().getTime(),
                    Remark: isPwdWrong ? '密码错误' : ''
                })
            });
        })
        .then(() => {
            // 写入登录成功的cookie
            LoginModel.setLoginTokenToWeb(req, res, userInfo.Id);
            res.succSend('登录成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

/**
 * @api {get} /admin_api/checklogin  判断是否登录
 * @apiName  checklogin
 * @apiGroup cmsLogin
 */
LoginController.checkLogin = (req, res, next) => {
    return LoginModel.checkLoginForce(req, res)
        .then(row => {
            res.succSend(row);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

// 获取图形验证码
LoginController.getCheckCode = function(req, res, next) {
    let {width, height} = req.params;
    const codeLen = 4;
    return req.paramsValidator
        .param('width', {required: false, type: Number})
        .param('height', {required: false, type: Number})
        .validate()
        .then(() => {
            let codeInfo = Captchapng.genCaptchaPng({
                width, height,
                size: codeLen
            }, false) || {};

            if(!codeInfo || !codeInfo.text || !codeInfo.data) {
                return Promise.reject({code: LoginModel.ResCodes.errorImgCode, msg: '验证码获取失败'});
            }

            // 将验证码写入cookie
            let encodedCode = LoginModel.encryptoImgCode(codeInfo.text);
            Util.setCookie(req, res, {
                key: Config.COOKIE_KEYS.loginImgCode,
                value: encodedCode
            });

            res.succSend({img: codeInfo.data, key: encodedCode});
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

// 判断验证码是否错误
LoginMethods.checkLoginImgCode = function(req, res, code, codekey) {
    // let codeFromCookie = codekey || req.cookies[Config.COOKIE_KEYS.loginImgCode];
    // Util.removeCookie(req, res, Config.COOKIE_KEYS.loginImgCode);
    if(!codekey) {
        return Promise.reject({code: LoginModel.ResCodes.errorImgCode, msg: '验证码失效，请重新输入'});
    }
    try {
        let decodedCode = LoginModel.decryptoImgCode(codekey);
        if(code.toLowerCase() != decodedCode.toLowerCase()) {
            return Promise.reject({code: LoginModel.ResCodes.errorImgCode, msg: '验证码输入错误，请重新输入'});
        }
    } catch(e) {
        return Promise.reject({code: LoginModel.ResCodes.errorImgCode, msg: '验证码失效，请重新输入'});
    }
};