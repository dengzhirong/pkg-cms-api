let Router = require('../util/route'),
    SqlRouter = new Router({path: '/admin_api/sql'}),
    SqlController = require('../controllers/DumpSqlController');

SqlRouter.get('/backup_latest', SqlController.downloadLatestBackup);

module.exports = SqlRouter;