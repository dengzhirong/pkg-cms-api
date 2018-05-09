/**
 * app相关的Model
 * Created by dengzhirong on 2018/4/22.
 */
const Promise = require('bluebird'),
    _ = require('lodash'),
    Config = require('../config'),
    Logger = require('../util/logger'),
    BaseModelClass = require('../util/db'),
    UserModel = require('../models/UserModel');

let AppModel = new BaseModelClass( Config.TABLE_CFG.app, 'Id' );

AppModel.Statuses = { // app状态
    NORMAL: 0,  // 正在测试中
    DELETE: -1, // 已删除
};

module.exports = AppModel;

AppModel.getCols = function(type) {
    let cols;
    switch(type) {
        case 'admin':
            cols = '*';
            break;
        case 'user':
            cols = ['Id', 'Name', 'AppId', 'ShowWeb', 'Url', 'IsUpdate', 'UpdateUrl', 'Type',
                'PushKey', 'Remark', 'CustId', 'AuthorId'];
            break;
        case 'public':
        default:
            cols = ['AppId', 'ShowWeb', 'Url', 'IsUpdate', 'UpdateUrl', 'PushKey', 'Remark'];
            break;
    }
    return cols;
};

// 创建app
AppModel.createApp = function(info) {
    info = _.defaults(info, {
        CreateTime: new Date().getTime()
    });
    return this.create(info);
};

// 修改app信息
AppModel.updateApp = function(condition, info) {
    info = _.defaults(info, {
        UpdateTime: new Date().getTime()
    });
    return this.updateByCondition(condition, info);
};

// 通过Id更新用户信息
AppModel.updateAppById = function(id, info) {
    info = _.defaults(info, {
        UpdateTime: new Date().getTime()
    });
    return this.updateById(id, info);
};

// 批量更新用户信息
AppModel.updateAppByIds = function(ids, info) {
    info = _.defaults(info, {
        UpdateTime: new Date().getTime()
    });
    return this.updateByIds(ids, info);
};

// 设置app状态
AppModel.setStatus = function(id, status) {
    let info = {
        Status: status,
        UpdateTime: new Date().getTime()
    };
    return this.updateById(id, info);
};

// 删除app
AppModel.deleteApp = function(id) {
    return this.setStatus(id, this.Statuses.DELETE);
};

// 查询app具体信息
AppModel.getDetail = function(id, userType='public') {
    let cols = AppModel.getCols(userType);
    return this.findNormalById(id, cols);
};
AppModel.getDetailByAppId = function(appId, userType='public') {
    let cols = AppModel.getCols(userType);
    return this.findOne({
        AppId: appId,
        Status: AppModel.Statuses.NORMAL
    }, cols);
};
// 判断AppId是否已存在
AppModel.checkAppIdExit = function(appId) {
    return this.findOne({
        AppId: appId,
        Status: AppModel.Statuses.NORMAL
    }).then(row => {
        let isExit =  !_.isEmpty(row);
        if(!isExit) return;
        return Promise.reject({msg: 'AppId不能重复'});
    })
};

// 判断App是否存在
AppModel.checkAppExit = function(id, userType) {
    return AppModel.getDetail(id, userType).then(row => {
        if(_.isEmpty(row)) {
            return Promise.reject({msg: 'App不存在'});
        }
        return row;
    });
};

// 查询app列表
AppModel.getList = function(filterOpt, myUserInfo, cols='*') {
    let {page, pageSize, appName, appId, type, showWeb, authorId, custId, isPublish, startDate, endDate} = filterOpt;
    let myUserId = myUserInfo.Id;
    let isManager = myUserInfo.GroupId == UserModel.GroupNameMap.Manager.id;
    let pagination = {
        pageSize: pageSize || 10,
        page: page
    };
    let sortBy = 'CreateTime',
        sortOrder = 'desc';

    let query = this.scope().select(cols);
    if(filterOpt.appName) {
        query = query.where('Name', 'like', `%${appName}%`);
    }
    if(appId) {
        query = query.where('AppId', 'like',`%${appId}%`);
    }
    if(!_.isUndefined(filterOpt.status)) {
        query = query.where('Status', status);
    } else {
        query = query.whereNot('Status', AppModel.Statuses.DELETE);
    }
    if(_.includes(['android', 'ios'], type)) {
        query = query.where('Type', type);
    }
    if(_.includes([0, 1], showWeb)) {
        query = query.where('ShowWeb', showWeb);
    }
    if(_.includes([0, 1], isPublish)) {
        query = query.where('IsPublish', isPublish ? 1 : 0);
    }
    if(isManager) {
        if(authorId) {
            query = query.where('AuthorId', authorId);
        }
        if(custId) {
            query = query.where('CustId', custId);
        }
    } else {
        query = query.where('AuthorId', myUserId).orWhere('CustId', myUserId);
    }

    if(startDate && endDate) {
        query = query.whereBetween('CreateTime', [startDate, endDate]);
    } else if(startDate) {
        query = query.where('CreateTime', '>', startDate);
    } else if(endDate) {
        query = query.where('CreateTime', '<', endDate);
    }

    query = query.orderBy(sortBy, sortOrder);

    let queryOfPageCount = _.cloneDeep(query);

    return Promise.props({
        page,
        count: this.pageTotalCountByQuery(queryOfPageCount, pagination.pageSize),
        list: this.queryWithPagination(query, pagination)
    });
};

// 查询app列表
AppModel.getListOfMarket = function(filterOpt, cols='*') {
    let {page, pageSize, appName, appId, type} = filterOpt;
    let pagination = {
        pageSize: pageSize || 10,
        page: page
    };
    cols = ['Id', 'Name', 'AppId', 'ShowWeb', 'Url', 'Type', 'Remark', 'AuthorId', 'AppPreviewUrl', 'CustId'];
    let sortBy = 'CreateTime',
        sortOrder = 'desc';

    let query = this.scope().select(cols);
    if(filterOpt.appName) {
        query = query.where('Name', 'like', `%${appName}%`);
    }
    if(appId) {
        query = query.where('AppId', 'like',`%${appId}%`);
    }
    if(type) {
        query = query.where('Type', type);
    }
    query = query.where('Status', AppModel.Statuses.NORMAL);
    query = query.where('IsPublish', 1).whereNull('CustId');

    query = query.orderBy(sortBy, sortOrder);
    let queryOfPageCount = _.cloneDeep(query);
    return Promise.props({
        page,
        count: this.pageTotalCountByQuery(queryOfPageCount, pagination.pageSize),
        list: this.queryWithPagination(query, pagination)
    });
};

// 导出app列表到Excel
AppModel.exportExcel = function(opts) {
    return this.getList(opts).then(() => {
        // 写入excel
    });
};