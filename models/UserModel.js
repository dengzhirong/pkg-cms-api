/**
 * 用户相关的Model
 * Created by dengzhirong on 2018/4/22.
 */
const crypto = require('crypto'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Config = require('../config'),
    Logger = require('../util/logger'),
    BaseModelClass = require('../util/db'),
    LoginModel = require('../models/LoginLogModel');

let UserModel = new BaseModelClass( Config.TABLE_CFG.user, 'Id' );
let UserCommonCols = [
    'Id', 'UserName', 'NickName', 'GroupId', 'Avatar',
    'Email', 'Phone', 'QQ',
    'ShowContact', 'ShowMarket', 'Status'
];
UserModel.Statuses = { // 用户状态
    NORMAL: 0,  // 正常
    DELETE: -1, // 已删除
    BAN: -2     // 已禁用
};
UserModel.GroupNameMap = { // 角色
    Manager: {id: 1, name: '管理员'},
    Develop: {id: 2, name: '开发'},
    Custom: {id: 3, name: '客户'}
};
module.exports = UserModel;

UserModel.getCols = function() {
    return UserCommonCols;
};

UserModel.getGroupNameById = function(groupId) {
    let group = _.find(UserModel.GroupNameMap, {id: groupId}) || {};
    return group.name;
};

// 创建用户
UserModel.addUser = function(info) {
    info = _.defaults(info, {
        CreateTime: new Date().getTime()
    });
    return this.create(info);
};

// 修改用户信息
UserModel.updateUser = function(condition, info) {
    info = _.defaults(info);
    return this.updateByCondition(condition, info);
};

// 通过Id更新用户信息
UserModel.updateByUserId = function(id, info) {
    info = _.defaults(info);
    return this.updateById(id, info);
};

// 设置用户状态
UserModel.setStatus = function(id, status) {
    let info = {
        Status: status
    };
    return UserModel.updateByUserId(id, info);
};
UserModel.setStatusByUserName = function(username, status) {
    let info = {
        Status: status
    };
    return UserModel.updateByCondition({UserName: username}, info);
};

// 删除用户
UserModel.delete = function(id) {
    return this.setStatus(id, this.Statuses.DELETE);
};

// 禁用用户
UserModel.ban = function(id) {
    return this.setStatus(id, this.Statuses.BAN);
};
UserModel.banUserName = function(username) {
    return this.setStatusByUserName(username, this.Statuses.BAN);
};

// 解禁用户
UserModel.setNormal = function(id) {
    return this.setStatus(id, this.Statuses.NORMAL);
};

// 记录用户最近的登录时间
UserModel.logLoginTime = function(id) {
    let info = {
        LoginTime: new Date().getTime()
    };
    return UserModel.updateByUserId(id, info);
};

// 查询用户具体信息
UserModel.getDetail = function(id, cols) {
    cols = cols || UserCommonCols;
    return UserModel.findNormalById(id, cols);
};
UserModel.getDetailForce = function(id, cols) {
    cols = cols || UserCommonCols;
    return UserModel.findById(id, cols);
};

UserModel.checkUserExitByName = function(name) {
    let cols = ['Id', 'Status', 'Password'];
    return this.findOne({
        UserName: name
    }, cols).then(row => {
        if(_.isEmpty(row) || row.Status == UserModel.Statuses.DELETE) {
            return Promise.reject({code: Config.RES_COMMON_CODES.userNotFound, msg: '用户不存在'});
        } else if(row.Status == UserModel.Statuses.BAN) {
            return Promise.reject({code: Config.RES_COMMON_CODES.userIsBan, msg: '该用户已禁用，请联系管理员解禁'});
        } else {
            return row;
        }
    });
};
UserModel.checkUserNameExit = function(username) {
    return this.findOne({
        UserName: username
    }).then(row => {
        return !_.isEmpty(row);
    })
};
UserModel.checkUserExit = function(userId, force, cols) {
    // 判断是否用户存在
    let getDetailFn = force ? UserModel.getDetailForce : UserModel.getDetail;
    return getDetailFn(userId, cols).then(row => {
        if(_.isEmpty(row)) {
            return Promise.reject({code: Config.RES_COMMON_CODES.userNotFound, msg: '用户不存在'});
        }
        return row;
    });
};

// 获取用户列表
// {pageSize, page, usernme, phone, email, group_id, isban, show_contact, show_market}
UserModel.getList = function(filterOpt) {
    let {pageSize, page, sortBy, sortOrder,
        usernme, phone, email, group_id,
        show_contact, show_market, isban} = filterOpt;
    let pagination = {
        pageSize: pageSize || 10,
        page: page
    };
    let cols = UserCommonCols.concat(['CreateTime', 'LoginTime', 'Password']);
    sortBy = sortBy || 'CreateTime';
    sortOrder = sortOrder || 'desc';


    let query = this.scope().select(cols);
    if(usernme) {
        query = query.where('UserName', 'like', `%${usernme}%`)
            .orWhere('NickName', 'like', `%${usernme}%`);
    }
    if(phone) {
        query = query.where('Phone', 'like',`%${phone}%`);
    }
    if(email) {
        query = query.where('Email', 'like',`%${email}%`);
    }
    if(group_id) {
        query = query.where('GroupId', group_id);
    }
    if(!_.isNaN(show_contact) && !_.isUndefined(show_contact) && show_contact !== '') {
        query = query.where('ShowContact', show_contact);
    }
    if(!_.isNaN(show_market) && !_.isUndefined(show_market) && show_market !== '') {
        query = query.where('ShowMarket', show_market);
    }
    if(_.isNaN(isban) || _.isUndefined(isban) || isban == '') {
        query = query.whereNot('Status', UserModel.Statuses.DELETE);
    } else if(isban === 1) {
        query = query.where('Status', UserModel.Statuses.BAN);
    } else if(isban === 0) {
        query = query.where('Status', UserModel.Statuses.NORMAL);
    }

    query = query.orderBy(sortBy, sortOrder);

    let queryOfPageCount = _.cloneDeep(query);

    return Promise.props({
        page: page,
        count: this.pageTotalCountByQuery(queryOfPageCount, 10),
        list: this.queryWithPagination(query, pagination)
    });
};

UserModel.getAllUser = function() {
    let cols = ['Id', 'UserName', 'GroupId', 'NickName'];
    return this.find({
        // GroupId: [groupId, UserModel.GroupNameMap.Manager.id],
        Status: UserModel.Statuses.NORMAL
    }, {cols});
};

UserModel.findUserByIds = function(ids, cols) {
    cols = cols || ['Id', 'UserName', 'NickName'];
    console.log(cols);
    return this.findByIds(ids, cols);
};

// TODO: 导出用户列表到Excel
UserModel.exportExcel = function(opts) {
    return this.getList(opts).then(() => {
        // 写入excel
    });
};