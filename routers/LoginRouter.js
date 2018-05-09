let Router = require('../util/route'),
    LoginRouter = new Router({path: '/admin_api'}),
    LoginController = require('../controllers/LoginController');

LoginRouter.get('/login', LoginController.login);
LoginRouter.get('/logout', LoginController.logout);
LoginRouter.get('/logincode', LoginController.getCheckCode);
LoginRouter.get('/checklogin', LoginController.checkLogin);

module.exports = LoginRouter;