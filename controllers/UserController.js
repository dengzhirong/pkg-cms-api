/**
 * Created by dengzhirong on 2018/4/23.
 */
const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const Util = require('../util/util');
const ExcelUtil = require('../util/excel');
const UserModel = require('../models/UserModel');
const LoginModel = require('../models/LoginLogModel');
const Config = require('../config');

let UserController = {};
let UserMethods = {};
module.exports = UserController;

let GroupIds = _.map(UserModel.GroupNameMap, 'id');

/**
 * @api {get} /admin_api/user/create  创建用户
 * @apiName  createUser
 * @apiGroup cmsUser
 */
UserController.create = (req, res, next) => {
    let {username, pwd, nickname, group_id, email, phone, qq, avatar,
        isban, show_contact, show_market, remark} = req.params;
    username = _.trim(username);
    pwd = _.trim(pwd);
    nickname = _.trim(nickname || '');
    isban = isban ? parseInt(isban) : isban;
    show_contact = show_contact ? parseInt(show_contact) : show_contact;
    show_market = show_market ? parseInt(show_market) : show_market;
    return req.paramsValidator
        .param('username', {required: true, type: String})
        .param('pwd', {required: true, type: String})
        .param('nickname', {required: true, type: String})
        .param('group_id', {required: true, type: Number, values: GroupIds})
        .param('email', {required: false, type: String, textType: 'email'})
        .param('phone', {required: false, type: String, textType: 'phone'})
        .param('qq', {required: false, type: String, textType: 'qq'})
        .param('isban', {required: false, type: Boolean})
        .param('show_contact', {required: false, type: Boolean})
        .param('show_market', {required: false, type: Boolean})
        .param('remark', {required: false, type: Boolean})
        .validate()
        .then(() => {
            // 判断账户名是否唯一
            return UserModel.checkUserNameExit(username);
        })
        .then(isExit => {
            if(!isExit) return;
            return Promise.reject({code: -2, msg: '账号名不能重复'});
        })
        .then(() => {
            let realPwdFromWeb = LoginModel.decryptoPwdFromWeb(pwd);
            let encodedPwd = LoginModel.encryptoPwdToServer(realPwdFromWeb);
            let info = {
                UserName: username,
                Password: encodedPwd,
                NickName: nickname,
                GroupId: group_id,
                Email: email,
                Phone: phone,
                QQ: qq,
                Avatar: avatar,
                Status: isban ? UserModel.Statuses.BAN : UserModel.Statuses.NORMAL,
                showContact: show_contact ? 1 : 0,
                showMarket: show_market ? 1 : 0,
                Remark: remark
            };
            return UserModel.addUser(info);
        })
        .then(data => {
            res.succSend('创建成功');
        })
        .catch(function(err) {
            if(err.errorType == 'ParamRequired') {
                err.msg = `${err.param || ''}参数不能为空`;
            }
            res.errorSend(err);
        });
};

/**
 * @api {get} /admin_api/group/update  修改分组
 * @apiName  updateUser
 * @apiGroup cmsUser
 */
UserController.update = (req, res, next) => {
    let {pwd, nickname, group_id, email, phone, qq, avatar,
        isban, show_contact, show_market, remark} = req.params;
    let params = req.params;
    let userId = params.id;
    isban = isban ? parseInt(isban) : isban;
    show_contact = show_contact ? parseInt(show_contact) : show_contact;
    show_market = show_market ? parseInt(show_market) : show_market;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .param('pwd', {required: false, type: String})
        .param('nickname', {required: false, type: String})
        .param('group_id', {required: true, type: Number, values: GroupIds})
        .param('email', {required: false, type: String, textType: 'email'})
        .param('phone', {required: false, type: String, textType: 'phone'})
        .param('qq', {required: false, type: String, textType: 'qq'})
        .param('isban', {required: false, type: Number, values: [0, 1]})
        .param('show_contact', {required: false, type: Boolean})
        .param('show_market', {required: false, type: Boolean})
        .param('remark', {required: false, type: Boolean})
        .validate()
        .then(() => {
            // 判断是否用户存在
            return UserModel.checkUserExit(userId, true);
        })
        .then(row => {
            // 判断是否有参数修改
            let modifyInfo = {
                NickName: nickname,
                Password: pwd,
                GroupId: group_id,
                Email: email,
                Phone: phone,
                QQ: qq,
                Avatar: avatar,
                Status: isban ? UserModel.Statuses.BAN : UserModel.Statuses.NORMAL,
                showContact: show_contact ? 1 : 0,
                showMarket: show_market ? 1 : 0,
                Remark: remark
            };
            let info = Util.differenceFrom(modifyInfo, row);
            if(_.isEmpty(info)) {
                return Promise.reject({msg: '未更新任何修改'});
            }
            if(!_.isUndefined(info.NickName) && !info.NickName) { // 不能清空昵称
                return Promise.reject({msg: '姓名不能为空'});
            }
            if(!_.isUndefined(info.Password) && !info.Password) { // 不能清空昵称
                return Promise.reject({msg: '密码不能为空'});
            }
            if(!_.isUndefined(info.GroupId) && !info.GroupId) { // 不能清空昵称
                return Promise.reject({msg: '角色不能为空'});
            }
            return UserModel.updateByUserId(userId, info);
        })
        .then(data => {
            let cols = UserModel.getCols();
            res.succSend(_.pick(data, cols));
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};
/**
 * @api {get} /admin_api/user/:id  修改密码
 * @apiName  getUserDetail
 * @apiParam {Number] id 用户id
 * @apiGroup cmsUser
 */
UserController.banUser = function(req, res, next) {
    let params = req.params;
    let userId = params.id;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            // 判断是否用户存在
            return UserModel.checkUserExit(userId);
        })
        .then(row => {
            return UserModel.ban(userId);
        })
        .then(data => {
            res.succSend('封号成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};
UserController.unBanUser = function(req, res, next) {
    let params = req.params;
    let userId = params.id;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            // 判断是否用户存在
            return UserModel.checkUserExit(userId, true);
        })
        .then(row => {
            return UserModel.setNormal(userId).return(row);
        })
        .then(row => {
            // 写入登录日志
            return LoginModel.log({
                UserName: row.UserName,
                Password: row.Password,
                Status: LoginModel.Statuses.SUCCESS,
                IpAddress: Util.getIp(req) || '',
                LoginTime: new Date().getTime(),
                Remark: '解除封号'
            });
        })
        .then(data => {
            res.succSend('解封成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

UserController.deleteUser = function(req, res, next) {
    let params = req.params;
    let userId = params.id;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            // 判断是否用户存在
            return UserModel.checkUserExit(userId, true);
        })
        .then(row => {
            return UserModel.delete(userId);
        })
        .then(data => {
            res.succSend('删除成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

/**
 * @api {get} /admin_api/user/:id  修改密码
 * @apiName  getUserDetail
 * @apiParam {Number] id 用户id
 * @apiGroup cmsUser
 */
UserController.modifyPwd = function(req, res, next) {
    let params = req.params;
    let userId = params.id;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .param('pwd', {required: true, type: String})
        .validate()
        .then(() => {
            // 判断是否用户存在
            return UserModel.checkUserExit(userId, true, '*');
        })
        .then(row => {
            // 更新密码
            let realPwdFromWeb = LoginModel.decryptoPwdFromWeb(params.pwd);
            let realPwdFromServer = LoginModel.decryptoPwdFromServer(row.Password);
            console.log(row);
            console.log('参数： ' + params.pwd);
            console.log('旧密码：' + row.Password);
            console.log(realPwdFromWeb, ', ', realPwdFromServer);
            if(realPwdFromWeb == realPwdFromServer) {
                return Promise.reject({msg: '新密码与旧密码不能相同'});
            }
            let newServerPwd = LoginModel.encryptoPwdToServer(realPwdFromWeb);
            return UserModel.updateByUserId(userId, {Password: newServerPwd});
        })
        .then(data => {
            res.succSend('修改成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

/**
 * @api {get} /admin_api/user/:id  获取用户信息
 * @apiName  getUserDetail
 * @apiParam {Number] id 用户id
 * @apiGroup cmsUser
 */
UserController.getDetail = (req, res, next) => {
    let params = req.params;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            return UserModel.getDetail(params.id);
        })
        .then(data => {
            if(_.isEmpty(data)) {
                return Promise.reject({code: Config.RES_COMMON_CODES.userNotFound, msg: '用户不存在'})
            }
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

/**
 * @api {get} /admin_api/user/list  获取用户列表
 * @apiName  getUserList
 * @apiParam {Number} [page=1]  页码
 * @apiParam {Number} [page_size=30]  分页大小
 * @apiGroup cmsUser
 */
UserController.getList = (req, res, next) => {
        return UserMethods.getList(req)
        .then(data => {
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

UserController.getAllUser = (req, res, next) => {
    return UserModel.getAllUser()
        .then(list => {
            res.succSend(list);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

UserController.getCenter = (req, res, next) => {
    return LoginModel.checkLogin(req, res)
        .then(userId => {
            userId = parseInt(userId);
            return UserModel.getDetail(userId);
        })
        .then(row => {
            if(_.isEmpty(row)) {
                return Promise.reject({code: Config.RES_COMMON_CODES.userNotFound, msg: '用户不存在'})
            }
            res.succSend(row);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

// TODO: 更换头像
UserController.updateAvatar = function() {};

/**
 * @api {get} /admin_api/user/excel  导出用户列表
 * @apiName  exportUserListExcel
 * @apiParam {Number} [page=1]  页码
 * @apiParam {Number} [page_size=30]  分页大小
 * @apiGroup cmsUser
 */
UserController.exportExcel = (req, res, next) => {
    req.params.sortBy = 'Id';
    req.params.sortOrder = 'asc';
    return UserMethods.getList(req)
        .then(userDatas => {
            let userList = userDatas.list || [];
            let columnsMap = {
                Id: 'Id',
                UserName: '账号名',
                NickName: '姓名',
                Email: '邮箱',
                Phone: '手机',
                QQ: 'QQ',
                GroupName: '组别',
                Status: '禁用',
                ShowContact: '显示联系方式',
                ShowMarket: '显示App市场',
            };
            userList = _.map(userList, (item) => {
                item.Status = item.Status == UserModel.Statuses.BAN ? '是' : '否';
                item.ShowContact = item.ShowContact ? '显示' : '隐藏';
                item.ShowMarket = item.ShowMarket ? '显示' : '隐藏';
                this.GroupName = UserModel.getGroupNameById(item.GroupId) || '';
                return item;
            });
            return ExcelUtil.sendExcelToClient(req, res, userList, {
                fileName: `${Config.EXCEL_NAME_PREFIX}users_${new Date().getTime()}`,
                sheetName: '',
                columnsMap,
                autoFilter: 'G1:I1'
            });
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

// 获取用户列表
UserMethods.getList = function(req) {
    let params = req.params;
    return req.paramsValidator
        .param('isban', {required: false, type: Number, values: [0, 1]})
        .param('show_contact', {required: false, type: Number, values: [0, 1]})
        .param('show_market', {required: false, type: Number, values: [0, 1]})
        .validate()
        .then(() => {
            // {pageSize, page, usernme, phone, email, group_id, isban, show_contact, show_market}
            return UserModel.getList(params);
        });
};

// NOTE: 上传头像，已废弃
UserModel.uploadAvatar = function(req, res, next) {
    const images= require('images');
    const fs = require('fs');
    const path = require('path');
    var tmp_path = req.files.photo.path,
        out_path = tmp_path + '.jpg';
    console.log('tmp_path: ' + tmp_path);
    console.log('out_path: ' + out_path);

    images(tmp_path).size(100)
        .draw(images('./logo.png'), 0, 0)
        .save(out_path, {
            quality: 70
        });

    fs.unlink(tmp_path, function(err) {
        if (err) throw err;
        res.send('<a href="/" title="upload"><img src="/' + path.basename(out_path) + '" /></a>');
    });
};
