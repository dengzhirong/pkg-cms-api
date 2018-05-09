/**
 * 挂载全部路由
 * Created by dengzhirong on 2017/3/20.
 */
let routers = {};
let routerFiles = [
    'AppRouter',
    'UserRouter',
    'SqlRouter',
    'LoginRouter'
];

routers.mount = function (server) {
    routerFiles.forEach((file, index) => {
        if(file == 'index.js') return;
        let router = require('./' + file);

        // 统一设置防刷
        router.setOptions({
            throttle_burst: 2,
            throttle_rate: 2
        });

        router.mount(server);
    });
};

module.exports = routers;