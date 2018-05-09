let Router = require('../util/route'),
    UserRouter = new Router({path: '/admin_api/user'}),
    UserController = require('../controllers/UserController');

UserRouter.get('/create',UserController.create);
UserRouter.get('/update',UserController.update);
UserRouter.get('/modify_pwd',UserController.modifyPwd);
UserRouter.get('/list',UserController.getList);
UserRouter.get('/all_dev',UserController.getAllUser);
UserRouter.get('/delete/:id',UserController.deleteUser);
UserRouter.get('/ban/:id',UserController.banUser);
UserRouter.get('/unban/:id',UserController.unBanUser);
UserRouter.get('/center',UserController.getCenter);
UserRouter.get('/export',UserController.exportExcel);

UserRouter.get('/:id',UserController.getDetail);

module.exports = UserRouter;