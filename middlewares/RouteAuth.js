/**
 * Api的访问权限验证
 * Created by dengzhirong on 2018/4/27.
 */
const Config = require('../config');
const LoginModel = require('../models/LoginLogModel');
const UserModel = require('../models/UserModel');
const AppModel = require('../models/AppModel');
const RouteAuthConfig = require('../data/router_auth_config');

const {loginAuthRoutes, AccessByOwnAuthRoutes, CustomCanAccessRoutes,
    ManagerCanEditSelfRoutes, OnlyManagerCanAccessRoutes} = RouteAuthConfig;
const RES_COMMON_CODES = Config.RES_COMMON_CODES;

function RouteAuth(req, res, next) {
    let routePath = req.route.path;
    let params = req.params || {};

    // 1. 验证是否登录、用户是否存在
    if(!loginAuthRoutes[routePath]) {
        return next();
    }
    return LoginModel.checkLoginForce(req, res).then(userInfo => {

        // 2. 判断是否是管理员
        let userId = userInfo.Id;
        res.userId = userId; // 将用户登录信息注入res
        res.userInfo = userInfo;
        let isManager = userInfo.GroupId == UserModel.GroupNameMap.Manager.id;
        res.$cmsIsManager = isManager;

        if(isManager) {
            // 4. 管理员不可操作与自己或其他管理员相关的接口
            if(!ManagerCanEditSelfRoutes[routePath]) {
               return next();
            }
            let _userId = params.id;
            if(!_userId || isNaN(_userId)) {
                return res.send({code: RES_COMMON_CODES.fail, msg: '用户不存在'});
            }
            return UserModel.getDetail(_userId, '*').then(_userInfo => {
                if(_userInfo.Id == userId || _userInfo.GroupId == UserModel.GroupNameMap.Manager.id) {
                    return res.send({code: RES_COMMON_CODES.fail, msg: '不可以操作自己'});
                }
                return next();
            });
        } else {
            // 5. 只能管理员操作的接口
            if(OnlyManagerCanAccessRoutes[routePath]) {
                return res.send({code: RES_COMMON_CODES.fail, msg: '仅管理员可访问'});
            }
        }

        // 6. 客户能访问的路由
        console.log('===========~~~~~');
        console.log('GroupId: ', userInfo.GroupId, UserModel.GroupNameMap.Custom.id);
        if(!userInfo.GroupId || userInfo.GroupId == UserModel.GroupNameMap.Custom.id) {
            if(CustomCanAccessRoutes[routePath]) {
                return next();
            }
            return res.send({code: RES_COMMON_CODES.fail, msg: '客户无访问权限'});
        }

        // 3. 仅可自己操作的路由
        let isAppOwnRoute = !!AccessByOwnAuthRoutes.app[routePath];
        let isUserOwnRoute = !!AccessByOwnAuthRoutes.user[routePath];
        if(!isAppOwnRoute && !isUserOwnRoute) {
            return next();
        } else if(isAppOwnRoute) { // 3.1 App相关接口，需要根据app id获取AuthorId，判断AuthorId是否为本人
            let appId = params.id;
            if(!appId || isNaN(appId)) {
                return res.send({code: RES_COMMON_CODES.fail, msg: 'app不存在'});
            }
            return AppModel.getDetail(parseInt(appId), 'admin').then(appInfo => {
                let authorId = appInfo.authorID;
                if(userId !== authorId) {
                    return res.send({code: RES_COMMON_CODES.fail, msg: '无访问权限'});
                } else {
                    return next();
                }
            });
        }  else if(isUserOwnRoute) { // 3.2 用户相关接口，需要根据id判断是否是本人
            let _userId = params.id;
            if(!_userId || isNaN(_userId)) {
                return res.send({code: RES_COMMON_CODES.fail, msg: '用户不存在'});
            }
            return UserModel.getDetail(_userId, '*').then(userInfo => {
                if(userInfo.Id != userId) {
                    return res.send({code: RES_COMMON_CODES.fail, msg: '无访问权限'});
                } else {
                    return next();
                }
            });
        }
        next();
    }).catch((err={}) => {
        res.send({code: err.code || RES_COMMON_CODES.fail || -1, msg: err.msg || '请求失败'});
    });
}

module.exports = RouteAuth;