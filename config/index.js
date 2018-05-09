/**
 * 运行环境配置
 * Created by dengzhirong on 2018/4/22.
 */
const ENV_NAME_MAP = {
    dev: 'dev', // 测试环境
    pro: 'pro', // 生产环境
    test: 'test', // 测试环境

};

const ENV_NAME = process.env.NODE_ENV || ENV_NAME_MAP.dev; // 运行环境 NOTE:上线前请修改为pro

const _ = require('lodash');
const CONFIG_COMMON = require('./config.common');
const CONFIG_ENV = require(`./config.env.${ENV_NAME}`);

module.exports = _.extend(
    {
        APP_NAME: 'pkg-cms', // app名

        TABLE_CFG: { // 数据库表
            user: 'user', // 用户表
            loginLog: 'login_log', // 登录日志表
            group: 'group', // 分组表
            app: 'app', // app信息表
            setting: 'setting' // 系统信息配置表
        },

        LOG_PATH: './log',
        LOG_NAMESPACE: 'pkg_cms_',

        COOKIE_KEYS: { // 图形验证码code
            loginImgCode: 'CMS_LOGIN_IMG_CODE',
            loginSessionToken: 'CMS_SESSION_TOKEN',
        },

        TOKEN_SALT: { // token的加密密钥
            loginImgCode: '@#$@!', // 登录图形验证码的密钥
            loginSessionToken: '@q2$&*(&^!@?_)(*|}{%$#@*', // 登录session token
        },

        PASSWORD_SALT: { // 密码加密密钥
            web: '@#()&%@!_+:"Q<>?@#', // 前端密钥
            server: '@*&#@(?)+_!@pwd' // 服务器端密钥
        },

        RES_COMMON_CODES: { // 接口返回的code值
            success: 1, // 请求成功
            fail: -1,   // 请求失败（普通）

            noLogin: -21,      // 未登录
            noPermission: -22, // 无访问权限
            userNotFound: -23, // 用户不存在
            userIsBan: -24, // 用户已被禁用
        }
    },

    CONFIG_COMMON,
    CONFIG_ENV,
    {
        ENV_NAME,
        ENV_NAME_MAP,
    },
);