/**
 * 生成图形验证码
 * Created by dengzhirong on 2018/4/23.
 */
const _ = require('lodash');
const svgCaptcha = require('svg-captcha');

module.exports = {
    // 生成图片验证码
    genCaptchaPng(options, isMath) {
        options = _.defaults({
            size: 4,
            noise: 1,
            color: true,
            ignoreChars: '0o1ilIL',
            background: '#ffffff'
        }, options);

        let captcha = !isMath ? svgCaptcha.create(options)
                              : svgCaptcha.createMathExpr(options);

        return captcha;
    }
};