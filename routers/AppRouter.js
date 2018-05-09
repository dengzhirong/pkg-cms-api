let Router = require('../util/route'),
    AppRouter = new Router({path: '/admin_api/app'}),
    AppController = require('../controllers/AppController');

AppRouter.get('/create',AppController.create);
AppRouter.get('/update/:id',AppController.update);
AppRouter.get('/update_batch',AppController.updateByIds);
AppRouter.get('/delete/:id',AppController.delete);
AppRouter.get('/publish/:id',AppController.updatePublish);
AppRouter.get('/detail/:id',AppController.getDetailOfOnline);
AppRouter.get('/list',AppController.getList);
AppRouter.get('/list_market',AppController.getListOfMarket);
AppRouter.get('/export',AppController.exportExcel);
AppRouter.get('/export_market',AppController.exportMarketExcel);

module.exports = AppRouter;