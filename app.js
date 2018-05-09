const Path = require('path'),
    restify = require('restify'),
    CookieParser = require('restify-cookies'),
    Config = require('./config'),
    Util = require('./util/util'),
    Logger = require('./util/logger'),

    port = Config.PORT || '8081';

let app = restify.createServer({
    name: Config.APP_NAME,
    version: '1.0.0'
});

app.use(CookieParser.parse);
app.use(restify.acceptParser(app.acceptable));
app.use(restify.queryParser());
app.use(restify.bodyParser());
app.use(restify.jsonp());
app.use(restify.gzipResponse());

// 请求日志
Logger.setNamespace(Config.LOG_NAMESPACE || app.name);
app.use((req, res, next) => {
    res.charSet('utf-8');
    // res.setHeader('Access-Control-Allow-Origin', '*');
    // res.setHeader('Access-Control-Allow-Credentials', 'true');
    Logger.req(req);
    next();
});

// 挂载自定义中间件：绑定response Handler、注入参数验证方法
let MiddleWareManager = require('./middlewares');
MiddleWareManager.mountAll(app);

// 挂载HTTP请求路由
let routers = require('./routers/index');
routers.mount(app);

// 查询跳转链接
const AppController = require('./controllers/AppController');
app.get('/biz/getAppConfig', AppController.getDetailOfPublic);

// 查看客户端资源
app.get(/.*/, restify.serveStatic({
    directory: Path.join(__dirname, '/static/cms'),
    default: "index.html"
}));

// 查看apidoc（仅非生产环境可见）
Config.ENV_NAME !== Config.ENV_NAME_MAP.pro && app.get(/\/apidoc\/.*/, restify.serveStatic({
    directory: Path.join(__dirname, '/static'),
    default: "index.html"
}));

// 异常处理
app.on('uncaughtException', (req, res, route, err) => {
    try { // 部分请求未等待异步操作完成，可能多次产生多个 uncaughtException
        res.send(500, Util.response(err));
    } catch(ex) {
        Logger.error(ex);
    }
});

// 404处理
app.on('ResourceNotFoundError', (req, res, route, err) => {
    try { // 部分请求未等待异步操作完成，可能多次产生多个 uncaughtException
        res.send(404, Util.response(err));
    } catch(ex) {
        Logger.error(ex);
    }
});

// 启动接口监听
app.listen(port, () => {
    if(Config.TEST_CFG.debug) {
        Logger.server(app.name, `Start listening at ${app.url}`);
    }
});

// 加入定时任务
const cronJob = require('./cronJob/index');