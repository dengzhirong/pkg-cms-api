/**
 * 路由访问的权限配置
 * Created by dengzhirong on 2018/4/22.
 */
module.exports = {
    loginAuthRoutes: { // 登录校验的路由
        '/admin_api/app/create': 1,
        '/admin_api/app/update/:id': 1,
        '/admin_api/app/update_batch': 1,
        '/admin_api/app/delete/:id': 1,
        '/admin_api/app/publish/:id': 1,
        '/admin_api/app/detail/:id': 1,
        '/admin_api/app/list': 1,
        '/admin_api/app/list_market': 1,
        '/admin_api/app/export': 1,
        '/admin_api/app/export_market': 1,

        '/admin_api/user/create': 1,
        '/admin_api/user/update': 1,
        '/admin_api/user/modify_pwd': 1,
        '/admin_api/user/list': 1,
        '/admin_api/user/all_dev': 1,
        '/admin_api/user/delete/:id': 1,
        '/admin_api/user/ban/:id': 1,
        '/admin_api/user/unban/:id': 1,
        '/admin_api/user/center': 1,
        '/admin_api/user/export': 1,
        '/admin_api/user/:id': 1,

        '/admin_api/sql/backup_latest': 1,
    },

    AccessByOwnAuthRoutes: {
        app: {
            // '/admin_api/app/update/:id': 1,   // 非管理员，只能更新AuthorId为自己的
            // '/admin_api/app/publish/:id': 1,
            // '/admin_api/app/delete/:id': 1,   // 非管理员，只能更新AuthorId为自己的
        },
        user: {
            '/admin_api/user/update': 1, // 非管理员，只能更新id为自己的
            '/admin_api/user/modify_pwd': 1, // 非管理员，只能更新id为自己的
        }
    },

    ManagerCanEditSelfRoutes: { // 管理员不能操作自己的接口
        '/admin_api/user/delete/:id': 1,
        '/admin_api/user/ban/:id': 1,
        '/admin_api/user/unban/:id': 1
    },

    OnlyManagerCanAccessRoutes: { // 只有管理员能访问的接口
        '/admin_api/user/create': 1,
        '/admin_api/user/delete/:id': 1,
        '/admin_api/user/ban/:id': 1,
        '/admin_api/user/unban/:id': 1,

        '/admin_api/sql/backup_latest': 1,
    },
    CustomCanAccessRoutes: { // 客户能访问的接口
        '/admin_api/app/list_market': 1,
        '/admin_api/app/list': 1,
        '/admin_api/app/update/:id': 1,
        '/admin_api/app/update_batch': 1,

        '/admin_api/login': 1,
        '/admin_api/logout': 1,
        // '/admin_api/logincode': 1,
        '/admin_api/checklogin': 1,

        '/admin_api/user/update': 1,
        '/admin_api/user/modify_pwd': 1,
        '/admin_api/user/center': 1,
        '/admin_api/user/all_dev': 1,

        '/biz/getAppConfig': 1
    }
};