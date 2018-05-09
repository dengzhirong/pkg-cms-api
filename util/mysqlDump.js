/**
 * Created by dengzhirong on 2018/4/27.
 */
const mysqlDump = require('mysqldump');
const Config = require('../config');
const Promise = require('bluebird');
const dbConfig = Config.DB_CFG;
const Path = require('path');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
const backup_path = '../backup_mysql/';
const fse = require('fs-extra');


let dumpSql = function(fileName, successCb, failCb) {
    fileName = fileName || `cms_sql_${moment().format('YYYYMMDDHHmmss')}`;
    mysqlDump({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        dest: Path.join(__dirname, `${backup_path}${fileName}.sql`),
    }, (err) => {
        if(err) {
            failCb && failCb(err);
            return console.log(err);
        }
        keepBackupFileNum();
        successCb && successCb(err);
        return fileName;
    });
};

let keepBackupFileNum = function() {
    let files = fs.readdirSync(Path.join(__dirname, backup_path)) || [];

    files = _.sortBy(files, (file) => { return file; });
    let filesLen = files.length;
    if(filesLen >= 5) {
        let deletedFiles = files.slice(0, filesLen - 4);
        // 删除多余的备份文件
        deletedFiles.forEach((file) => {
            fse.remove(Path.join(__dirname, backup_path, file), err => { console.log(err); });
        });
    }
};

let getLatestSqlBackup = function() {
    let files = fs.readdirSync(Path.join(__dirname, backup_path)) || [];
    if(files.length < 1 || !files[0]) { return false; }

    files = _.sortBy(files, (file) => { return file; });
    return Path.join(__dirname, backup_path, files[0]);
};

exports.dumpSql = dumpSql;
exports.keepBackupFileNum = keepBackupFileNum;
exports.getLatestSqlBackup = getLatestSqlBackup;