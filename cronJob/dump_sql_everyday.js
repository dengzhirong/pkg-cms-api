/**
 * 每天定时备份mysql
 * Created by dengzhirong on 2018/4/27.
 */
let CronJob = require('cron').CronJob;
const backupSqlPath = '../backup_mysql';

let job = new CronJob({
    cronTime: '00 00 03 * * 0-7', // Runs every day at 3:00:00 AM
    onTick: function() {
        require('../util/mysqlDump').dumpSql();
    },
    start: false,
    timeZone: 'Asia/Shanghai'
});

makeBackupDir();

module.exports = job;

// 创建数据库备份
function makeBackupDir() {
    const Util = require('../util/util');
    const path = require('path');
    Util.makeDir(path.join(__dirname, backupSqlPath));
}
