/**
 * http请求相关方法
 * Created by dengzhirong on 2017/10/23.
 */

let Promise = require('bluebird'),
    _ = require('lodash'),
    request = require('request');

exports.request = function (option) {
    option = _.defaults(option, {
        json: true,
        timeout: 2000
    });
    return new Promise(function(resolve, reject) {
        return request(option, function(err, response, body) {
            if(err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
    });
};

exports.get = function (url, data, headers) {
    let options = {
        url: url,
        method: "GET",
        qs: data
    };
    if(headers) {
        options.headers = headers;
    }
    return this.request(options);
};

exports.post = function (url, data, headers) {
    let options = {
        url: url,
        method: "POST",
        form: data
    };
    if(headers) {
        options.headers = headers;
    }
    return this.request(options);
};

/**
 * 原生node http请求
 * @param option
 *        options.url     {String}      请求地址
 *        options.method  {String=get}  请求方法: post get
 *        options.encode  {String=utf8} 返回值的编码类型
 *        options.data    {AllTypes}    请求数据
 *        options.success {Function}    请求成功的回调函数，参数为返回值
 *        options.error   {Function}    请求失败的回调函数
 */
exports.requestRaw = function(option) {
    const Url = require('url'),
        https = require('https'),
        http = require('http'),
        Util = require('./util');

    option = _.defaults(option, {
        method: 'GET',
        encode: 'utf8'
    });
    let { url, method, data, success, error, encode } = option;
    Util.log(option);

    method = _.toUpper(method);
    let urlObj = Url.parse(url),
        protocol = _.lowerCase(urlObj.protocol),
        HttpServer = protocol == 'https' ? https : http,
        postData = _.isString(data) ? data : JSON.stringify(data);
        // port = urlObj.port || protocol == 'https' ? 443 : 80;

    let reqOpt = {
        path: urlObj.path,
        hostname: urlObj.hostname,
        method: method
    };

    let req = HttpServer.request(reqOpt, (res) => {
        res.setEncoding(encode);
        res.on('data', (result) => {
            if(_.isBuffer(result)) { result = result.toString(); }
            result = Util.toJson(result);

            _.isFunction(success) && success(result);
        });
    });

    req.on('error', (e) => {
        _.isFunction(error) && error(e);
    });

    req.write(postData);
    req.end();
};