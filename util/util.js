const _ = require('lodash');
const colors = require('colors');
const Config = require('../config');

module.exports = {
    log() {
        if (Config.TEST_CFG.debug || Config.TEST_CFG.trace_log) {
            console.log(...arguments);
        }
    },

    toJson(str) {
        if(_.isObject(str) || _.isUndefined(str)) { return str; }

        let json = str;
        try {
            json = JSON.parse(str);
        } catch (ex) {
            // this.log(ex);
        }
        return json;
    },

    isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    },

    toStr(str) {
        if(_.isString(str)) {
            return str;
        } else if(_.isObject(str) || _.isArray(str)) {
            JSON.stringify(str);
        } else {
            return str.toString();
        }
    },

    response(data, code, msg) {
        if (data instanceof Error) {
            return {
                code: data.name,
                msg: data.message
            };
        }

        if (data && data.code && data.msg) {
            return data;
        }

        return {
            code: code === undefined ? 0 : code,
            msg: msg,
            data: data
        };
    },

    getIp(req) {
        let ip = req.headers['x-real-ip'] ||
            req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        let realIp = ip && ip.split(',')[1];
        ip = realIp ? _.trim(realIp) : ip;   // 代理上网后的ip格式为 10.143.239.74, 120.197.195.93，取后者

        return ip;
    },

    // 判断域名是否允许访问
    isOriginAllowed(origin, allowedOrigins) {
        if (_.isArray(allowedOrigins)) {
            for(let i = 0; i < allowedOrigins.length; i++) {
                if(arguments.callee(origin, allowedOrigins[i])) {
                    return true;
                }
            }
            return false;
        } else if (_.isString(allowedOrigins)) {
            return this.testRegExp(origin, allowedOrigins, true);
        } else if (allowedOrigins instanceof RegExp) {
            return allowedOrigins.test(origin);
        } else {
            return !!allowedOrigins;
        }
    },

    // 设置跨域许可
    setOriginAllow(allowedOrigins, req, res) {
        let requestOrigin = req.headers.origin;
        if(this.isOriginAllowed(requestOrigin, allowedOrigins)) {
            res.header("Access-Control-Allow-Origin", requestOrigin);
            res.header('Access-Control-Allow-Credentials', 'true');
            return true;
        } else {
            return false;
        }
    },

    // 判断Ips是否允许访问
    isIpsAllowed(req, allow_ips) {
        let isAllowed = ( allow_ips.join(';').indexOf(this.getIp(req)) < 0 );
        return isAllowed;
    },

    //转义影响正则的字符
    encodeReg(source) {
        return String(source).replace(/([.*+?^=!:${}()|[\]/\\])/g,'\\$1');
    },
    // 测试正则表达式
    testRegExp(value, regexp, isGlob=false) {
        let self = this;
        if(_.isRegExp(regexp)) {
            return regexp.test(value);
        } else if(_.isString(regexp)) {
            if(isGlob) {
                regexp = self.encodeReg(regexp);
                let newRegexp = regexp.replace(/\\\*/g, '.*');  // 兼容glob写法
                return new RegExp(newRegexp).test(value);
            }
            return new RegExp(regexp).test(value);
        } else {
            return false;
        }
    },

    formatDate(timestamp, format) {
        format = format || 'yyyy-MM-dd HH:mm:ss';
        let date = new Date(timestamp),
            year = date.getFullYear(),
            month = date.getMonth() + 1,
            day = date.getDate(),
            hour = date.getHours(),
            minute = date.getMinutes(),
            second = date.getSeconds();
        return format
            .replace('yyyy', year)
            .replace('MM', _.padStart(month, 2, 0))
            .replace('dd', _.padStart(day, 2, 0))
            .replace('HH', _.padStart(hour, 2, 0))
            .replace('mm', _.padStart(minute, 2, 0))
            .replace('ss', _.padStart(second, 2, 0));
    },

    getDayStr(timestamp) {
        let date = timestamp ? new Date(timestamp) : new Date();
        return this.formatDate(date);
    },

    getCmdArgStartWith(startStr, defaultVal) {
        let args = process.argv.slice(2);
        let arg = _.filter(args, arg => {
            return arg.startsWith(startStr);
        } )[0];
        let val = (arg || '').replace(startStr, '') || defaultVal;
        val = isNaN(val) ? val : parseInt(val, 10);
        return val;
    },

    getLocalIP() {
        const os = require('os');

        let interfaces = os.networkInterfaces();
        let addresses = [];
        for (let key in interfaces) {
            for (let key2 in interfaces[key]) {
                let address = interfaces[key][key2];
                if (address.family === 'IPv4' && !address.internal) {
                    addresses.push(address.address);
                }
            }
        }
        return addresses[-1];
    },
    getDomainFromHost(host='') {
        return host.split(':')[0];
    },


    differenceFrom(obj1, obj2) {
        let res = {};
        for(var key in obj1) {
            let item = obj1[key];
            if(!_.isUndefined(item) && !_.isNull(item) && item != obj2[key]) {
                res[key] = item;
            }
        }
        return res;
    },

    setCookie(req, res, cookie={}, options={}) {
        let domain = this.getDomainFromHost(req.headers.host);
        res.setCookie(cookie.key, cookie.value, _.defaults(options, {
            path: '/',
            domain: domain,
            maxAge: 2 * 60, // 缓存时间20分钟
            httpOnly: true
        }));
    },
    removeCookie(req, res, cookieKey, options={}) {
        let domain = this.getDomainFromHost(req.headers.host);
        res.setCookie(cookieKey, '', _.defaults(options, {
            path: '/',
            domain: domain,
            maxAge: 0, // 缓存时间20s
            httpOnly: true
        }));
    },

    makeDir(dir) { // 创建目录
        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    },

    // 设置excel文件名为中文
    setDownloadFileName(req, res, filename) {
        let userAgent = (req.headers['user-agent']||'').toLowerCase();

        if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
            res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(filename));
        } else if(userAgent.indexOf('firefox') >= 0) {
            res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(filename)+'"');
        } else {
            /* safari等其他非主流浏览器只能自求多福了 */
            res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(filename).toString('binary'));
        }
    }
};