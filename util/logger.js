/**
 * 日志相关方法
 */
const winston = require('winston'),
    _ = require('lodash'),
    Path = require('path'),
    fs = require('fs'),
    Util = require('./util'),
    Config = require('../config'),
    noTraceReq = Config.TEST_CFG.no_trace_req;

let loggers = {},
    logPath = Config.LOG_PATH || Path.join(__dirname, '../log'),
    namespace = Config.LOG_NAMESPACE || Config.APP_NAME || '';

// 默认创建log文件夹
mkdirLogDir();
function mkdirLogDir() {
    let isLogPathExist = fs.existsSync(logPath);
    !isLogPathExist && fs.mkdirSync(logPath, function(err, args) {
        if(err) { return false; }
    });
}

function getLogger(name, opt) {
    let logger = loggers[name];
    if(logger) return logger;

    let path = Path.join(logPath, `${namespace}_${name}.log`);
    let loggerOpt = {
        exitOnError: false,
        transports: []
    };
    if(opt.console) {
        loggerOpt.transports.push(
            new (winston.transports.Console)({
                timestamp: function() {
                    return Util.formatDate(new Date());
                }
            })
        );
    }

    let FileTransport = !!opt.rotation ? require('winston-daily-rotate-file') : winston.transports.File;
    loggerOpt.transports.push(
        new (FileTransport)({
            filename: path,
            timestamp: function () {
                return Util.formatDate(new Date());
            }
        })
    );

    logger = new (winston.Logger)(loggerOpt);
    logger.emitErrs = false; // suppress error

    loggers[name] = logger;
    return logger;
}

exports.setLogPath = (newLogPath) => {
    logPath = newLogPath;
};
exports.setNamespace = (ns) => {
    namespace = ns;
};

exports.logPath = logPath;

// 请求日志
exports.req = (req) => {
    if (noTraceReq) return;

    let logContent = `[${Util.getDayStr()}] [${Util.getIp(req)}] ${req.route.path}`;
    let logger = getLogger('req', { rotation: true });
    logger.info({params: req.params, method: req.method, message: logContent});
};

exports.server = function() {
    if (Config.TEST_CFG.debug) {
        console.log.apply(console, Array.prototype.slice.call(arguments, 1));
    }
    if (noTraceReq) return;

    let logger = getLogger(arguments[0] + '_server', { rotation: true });
    let obj = arguments[1];
    if (obj instanceof Error)  {
        logger.error('[${obj.name}] ${obj.message} \n');
    } else {
        logger.info.apply(logger, Array.prototype.slice.call(arguments, 1));
    }
};

// 错误日志
exports.error = (err) => {
    let logger = getLogger('error', { rotation: true });
    logger.error(err);
};

exports.resError = (req, res, err) => {
    let logData = {
        error: _.isString(err) ? err : JSON.stringify(err, Object.getOwnPropertyNames(err))
    };
    if(req) {
        let reqInfoStr = `[${Util.getDayStr()}] [${Util.getIp(req)}] ${req.route.path}`;
        logData = _.extend(logData, {
            params: req.params, method: req.method, req: reqInfoStr
        });
    }

    let logger = getLogger('res_error', { rotation: true });
    logger.error(logData);
};

exports.addRotation = (fileName, err) => {
    if (noTraceReq) return;

    let logger = getLogger(fileName, { rotation: true });
    logger.info(err);
};

exports.add = (fileName, content, option) => {
    if (noTraceReq) return;
    option = _.defaults(option, { subPath: '' });
    let realLogPath = Path.join(logPath, option.subPath);
    let logFilePath = Path.join(realLogPath, `${namespace}_${fileName}.log`);

    fs.appendFile(
        logFilePath,
        `[${Util.getDayStr()}] ${content} \n`,
        err => {}
    );
};