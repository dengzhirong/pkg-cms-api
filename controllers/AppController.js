/**
 * Created by dengzhirong on 2018/4/23.
 */
const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const Util = require('../util/util');
const ExcelUtil = require('../util/excel');
const AppModel = require('../models/AppModel');
const UserModel = require('../models/UserModel');
const LoginModel = require('../models/LoginLogModel');
const Config = require('../config');

let AppController = {};
let AppMethods = {};
module.exports = AppController;

AppController.create = (req, res, next) => {
    let {appName, appId, type, previewUrl, showWeb, url, custId, isPublish,
        isUpdate, updateUrl, pushKey, remark} = req.params;
    appName = _.trim(appName);
    appId = _.trim(appId);
    let authorId;
    return req.paramsValidator
        .param('appName', {required: true, type: String})
        .param('appId', {required: true, type: String})
        .param('type', {required: false, type: String, values: ['android', 'ios']})
        .param('showWeb', {required: false, type: Number, values: [0, 1]})
        .param('isUpdate', {required: false, type: Number, values: [0, 1]})
        .param('isPublish', {required: false, type: Number, values: [0, 1]})
        .validate()
        .then(() => {
            // 判断是否登录
            return LoginModel.checkLogin(req, res);
        })
        .then((userId) => {
            // 检查用户是否存在
            return UserModel.checkUserExit(userId);
        })
        .then(row => {
            authorId = row.Id;
        })
        .then(() => {
            // 判断appId是否存在
            return AppModel.checkAppIdExit(appId);
        })
        .then(() => {
            let info = {
                Name: appName,
                AppId: appId,
                ShowWeb: showWeb || 0,
                Url: url,
                IsUpdate: isUpdate || 0,
                UpdateUrl: updateUrl,
                Remark: remark,
                Type: type,
                PushKey: pushKey,
                AppPreviewUrl: previewUrl,
                AuthorId: authorId,
                CustId: custId || null,
                IsPublish: isPublish == '' ? null : isPublish
            };
            return AppModel.createApp(info);
        })
        .then(data => {
            res.succSend(data);
        })
        .catch(function(err) {
            if(err.errorType == 'ParamRequired') {
                err.msg = `${err.param || ''}参数不能为空`;
            }
            res.errorSend(err);
        });
};

AppController.update = (req, res, next) => {
    let params = req.params;
    let {id, appName, appId, type, previewUrl, showWeb, isPublish,
        url, isUpdate, updateUrl, pushKey, remark, custId} = req.params;
    appName = _.trim(appName);
    appId = _.trim(appId);
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .param('type', {required: false, type: String, values: ['android', 'ios']})
        .param('showWeb', {required: false, type: Number, values: [0, 1]})
        .param('isUpdate', {required: false, type: Number, values: [0, 1]})
        .param('isPublish', {required: false, type: Number, values: [0, 1]})
        .validate()
        .then(() => {
            // 判断App是否存在
            return AppModel.checkAppExit(id, 'admin');
        })
        .then(row => {
            // 判断是否有参数修改
            let modifyInfo = {
                ShowWeb: showWeb == '' ? null : showWeb,
                Url: url,
                IsUpdate: isUpdate == '' ? null : isUpdate,
                UpdateUrl: updateUrl,
                Remark: remark,
                Type: type,
                PushKey: pushKey,
                AppPreviewUrl: previewUrl,
                IsPublish: isPublish == '' ? null : isPublish
            };
            if(appName) modifyInfo.Name = appName;
            if(appId) modifyInfo.AppId = appId;
            let info = Util.differenceFrom(modifyInfo, row);
            if(!_.isUndefined(custId) && !_.isNull(custId)) info.CustId = custId || null;
            if(_.isEmpty(info)) {
                return Promise.reject({msg: '未更新任何修改'});
            }

            return Promise.resolve(() => {
                if(!info.AppId)  return false;
                return AppModel.checkAppIdExit(appId); // 检查AppId是否唯一
            }).then(() => {
                return AppModel.updateAppById(id, info);
            });
        })
        .then(data => {
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.updateByIds = (req, res, next) => {
    let params = req.params;
    let {type, previewUrl, showWeb, ids, isPublish,
        url, isUpdate, updateUrl, pushKey, remark, custId} = req.params;
    return req.paramsValidator
        .param('ids', {required: true, type: String})
        .param('type', {required: false, type: String, values: ['android', 'ios']})
        .param('showWeb', {required: false, type: Number, values: [0, 1]})
        .param('isUpdate', {required: false, type: Number, values: [0, 1]})
        .param('isPublish', {required: false, type: Number, values: [0, 1]})
        .validate()
        .then(() => {
            // 判断是否有参数修改
            let modifyInfo = {
                ShowWeb: showWeb == '' ? null : showWeb,
                Url: url,
                IsUpdate: isUpdate == '' ? null : isUpdate,
                UpdateUrl: updateUrl,
                Remark: remark,
                Type: type,
                PushKey: pushKey,
                AppPreviewUrl: previewUrl,
                IsPublish: isPublish == '' ? null : isPublish
            };
            let info = Util.differenceFrom(modifyInfo, {});
            if(!_.isUndefined(custId) && !_.isNull(custId)) info.CustId = custId || null;
            if(_.isEmpty(info)) {
                return Promise.reject({msg: '未更新任何修改'});
            }

            ids = ids || '';
            let _ids = _.uniq( _.compact(ids.split(',') || []) );
            if(_ids.length < 1) {
                return Promise.reject({msg: '请选择app'});
            }
            return AppModel.updateAppByIds(_ids, info);
        })
        .then(data => {
            res.succSend('批量修改成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.updatePublish = function(req, res, next) {
    let {id, isPublish} = req.params;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .param('isPublish', {required: false, type: Number, values: [0, 1]})
        .validate()
        .then(() => {
            // 判断appId是否存在
            return AppModel.checkAppIdExit(id);
        })
        .then(row => {
            isPublish = isPublish ? 1 : 0;
            return AppModel.updateAppById(id, {
                IsPublish: isPublish
            });
        })
        .then(data => {
            res.succSend('发布成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.delete = function(req, res, next) {
    let params = req.params;
    let id = params.id;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            // 判断appId是否存在
            return AppModel.checkAppIdExit(id);
        })
        .then(row => {
            return AppModel.deleteApp(id);
        })
        .then(data => {
            res.succSend('删除成功');
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.getDetailOfOnline = (req, res, next) => {
    let params = req.params;
    return req.paramsValidator
        .param('id', {required: true, type: Number})
        .validate()
        .then(() => {
            return AppModel.getDetail(params.id);
        })
        .then(data => {
            if(_.isEmpty(data)) {
                return Promise.reject({msg: 'App不存在'})
            }
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.getDetailOfPublic = (req, res, next) => {
    let params = req.params;
    let appId = params.appid;
    const NotFoundResponse = {
        success: false,
        msg: "没有找到appid对应的配置"
    };
    if(!appId) {
        return res.send(NotFoundResponse);
    }
    return AppModel.getDetailByAppId(appId, 'public')
        .then(data => {
            if(_.isEmpty(data)) {
                return res.send(NotFoundResponse);
            }
            data.ShowWeb = (data.ShowWeb || 0).toString();
            data.IsUpdate = (data.IsUpdate || 0).toString();
            data.Del = "0";
            console.log(data);
            return res.send({
                success: true,
                AppConfig: data
            });
        })
        .catch(function(err) {
            res.send({
                success: false,
                msg: err.msg || NotFoundResponse.msg || '请求失败'
            });
        });
};

AppController.getList = (req, res, next) => {
    // page, pageSize, appName, appId, type, showWeb, authorId, startDate, endDate
    return AppMethods.getList(req, res.userInfo)
        .then(data => {
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};
AppController.getListOfMarket = (req, res, next) => {
    // page, pageSize, appName, appId, type
    return AppMethods.getListOfMarket(req)
        .then(data => {
            res.succSend(data);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

// 获取App列表
AppMethods.getList = function(req, myUserInfo) {
    let params = req.params;
    return req.paramsValidator
        .param('type', {required: false, type: String, values: ['android', 'ios']})
        .param('showWeb', {required: false, type: Number, values: [0, 1]})
        .param('isUpdate', {required: false, type: Number, values: [0, 1]})
        .param('isPublish', {required: false, type: Number, values: [0, 1]})
        .param('page', {required: false, type: Number})
        .param('pageSize', {required: false, type: Number})
        .validate()
        .then(() => {
            return AppModel.getList(params, myUserInfo);
        })
        .then(appLists => {
            return AppMethods.formatAppListData(appLists);
        });
};
AppMethods.getListOfMarket = function(req) {
    let params = req.params;
    return AppModel.getListOfMarket(params)
        .then(appLists => {
            return AppMethods.formatAppListData(appLists);
        });
};

AppMethods.formatAppListData = function(appLists) {
    let list = appLists.list || []; // 更新查询用户的昵称/UserName
    if(list.length < 1) {
        return appLists;
    }
    let userIds = _.concat( _.map(list, 'AuthorId'), _.map(list, 'CustId') );
    userIds = _.uniq(_.compact( userIds )) || [];
    if(userIds.length < 1) {
        return appLists;
    }
    return UserModel.findUserByIds(userIds).then(userRows => {
        _.each(list, (item, index) => {
            let authorInfo = _.find(userRows, {Id: item.AuthorId} || []) || {};
            let custInfo = _.find(userRows, {Id: item.CustId} || []) || {};
            item.AuthorName = authorInfo.NickName || authorInfo.UserName || item.AuthorId || '';
            item.CustName = custInfo.NickName || custInfo.UserName || item.CustId || '';
        });
        appLists.list = list;
    }).then(() => {
        return appLists;
    });
};

AppController.exportMarketExcel = function(req, res, next) {
    req.params.sortBy = 'Id';
    req.params.sortOrder = 'asc';
    return AppMethods.getListOfMarket(req)
        .then(appDatas => {
            let fileName = `${Config.EXCEL_NAME_PREFIX}AppMarket_${new Date().getTime()}`;
            let columnsMap = {
                    Name: '包名',
                    AppId: 'AppId',
                    Type: '机型',
                    ShowWeb: '是否跳转',
                    IsUpdate: '是否强制更新',
                    Url: '跳转地址',
                    UpdateUrl: '强更地址',
                    PushKey: '极光推送Key',
                    AppPreviewUrl: 'App预览地址',
                };
            AppMethods.sendExcel(appDatas.list, req, res, fileName, columnsMap);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppController.exportExcel = (req, res, next) => {
    req.params.sortBy = 'Id';
    req.params.sortOrder = 'desc';
    return AppMethods.getList(req, res.userInfo)
        .then(appDatas => {
            let fileName = `${Config.EXCEL_NAME_PREFIX}Apps_${new Date().getTime()}`;
            AppMethods.sendExcel(appDatas.list, req, res, fileName);
        })
        .catch(function(err) {
            res.errorSend(err);
        });
};

AppMethods.sendExcel = function(list=[], req, res, fileName, columnsMap) {
    columnsMap = columnsMap || {
        Name: '包名',
        AppId: 'AppId',
        Type: '机型',
        ShowWeb: '是否跳转',
        IsUpdate: '是否强制更新',
        IsPublish: '是否发布到App市场',
        Url: '跳转地址',
        UpdateUrl: '强更地址',
        PushKey: '极光推送Key',
        AppPreviewUrl: 'App预览地址',
        AuthorName: '创建者',
        CustName: '所属客户',
        Remark: '备注',
        CreateTime: '创建时间',
        UpdateTime: '最近修改时间'
    };
    list = _.map(list, (item) => {
        item.ShowWeb = item.ShowWeb ? '跳转' : '不跳转';
        item.IsUpdate = item.IsUpdate ? '是' : '否';
        item.IsPublish = item.IsPublish ? '已发布' : '否';
        item.CreateTime = item.CreateTime ? moment(new Date(item.CreateTime)).format('YYYY-MM-DD HH:mm:ss') : '';
        item.UpdateTime = item.UpdateTime ? moment(new Date(item.UpdateTime)).format('YYYY-MM-DD HH:mm:ss') : '';
        return item;
    });
    return ExcelUtil.sendExcelToClient(req, res, list, {
        fileName: fileName || `${Config.EXCEL_NAME_PREFIX}Apps_${new Date().getTime()}`,
        sheetName: '',
        columnsMap,
        autoFilter: 'D1:G1'
    });
};