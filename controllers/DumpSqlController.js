/**
 * Created by dengzhirong on 2018/4/23.
 */
const _ = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const Util = require('../util/util');
const Config = require('../config');
const UserModel = require('../models/UserModel');
const SqlDumpUtil = require('../util/mysqlDump');
const fs = require('fs');
const mime = require('mime');
var readFile = Promise.promisify(fs.readFile);

let SqlController = {};

SqlController.downloadLatestBackup = (req, res, next) => {
    SqlDumpUtil.dumpSql('', () => {
        let latestBackupFile = SqlDumpUtil.getLatestSqlBackup();
        if(!latestBackupFile) {
            res.writeHead(404);
            res.end();
            return false;
        }

        return readFile(latestBackupFile, "binary").then((file) => {
            // 设置下载的文件名
            Util.setDownloadFileName(req, res, `cms_backup_sql_${new Date().getTime()}.sql`);

            // 下载后自动关闭页面
            res.setHeader('Content-Type', 'application/force-download');
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Type', 'application/download');

            let contentType = 'application/x-sql';
            res.writeHead(200, {"Content-Type": contentType});

            res.write(file, "binary");
            res.end();
        }).catch(err => { // 文件读取出错
            res.writeHead(500, {"Content-Type": "text/plain"});
            res.end(err);
        });
    }, (err) => {
        res.writeHead(500, {"Content-Type": "text/plain"});
        res.end(err);
    });
};

module.exports = SqlController;