/**
 * 数据库相关的通用方法
 * Created by dengzhirong on 2017/3/20.
 */

let Promise = require('bluebird'),
    _ = require('lodash'),
    knex = require('knex'),
    mysql = require('mysql'),
    Config = require('../config'),
    Logger = require('./logger'),
    Util = require('./util'),
    DB_CFG = Config.DB_CFG;

let SqlBuilder = knex({
    dialect:'mysql'
});

const POOL_CFG = {
    connectionLimit : 25,
    host: DB_CFG.host,
    user: DB_CFG.user,
    password: DB_CFG.password,
    database: DB_CFG.database
};
const DB_POOL = mysql.createPool(POOL_CFG);

const Statuses = {
    NORMAL: 0,
    DELETED: -1
};

// 通用的数据库操作方法
class BaseModelClass {
    constructor(tableName, primaryKey) {
        this.dbPool = DB_POOL;
        this.PrimaryKey = primaryKey || 'ID';

        this.Statuses = _.extend({}, Statuses);

        return this.table(tableName);
    }

    table(tableName) {
        this.tableName = tableName;
        return this;
    }

    scope() {
        return SqlBuilder.table(this.tableName);
    }

    scopeNormal() {
        return SqlBuilder
            .table(this.tableName)
            .where('Status', this.Statuses.NORMAL);
    }

    scopeById(id) {
        let condition = {};
        condition[this.PrimaryKey] = id;
        return this.scope().where(condition);
    }

    /**
     * execute sql string
     * @param query  {String}  sql查询语句
     */
    executeByQuery(query) {
        let self = this;
        query = query.toString();

        if(Config.TEST_CFG.db_debug) {
            Util.log(query);
        }
        return new Promise((resolve, reject) => {
            self.dbPool.query(query, (err, rows, fields) => {
                if(err) {
                    // Logger bag sql
                    Logger.addRotation('bad_sql', `[${err}] ${query}`);

                    reject(err);
                } else {
                    resolve(rows, fields);
                }
            });
        });
    }

    /**
     * 获取加上查找条件后的sql语句
     * @param conditions  {Object}  查找条件
     */
    getConditionQuery(conditions) {
        let query = this.scope();
        _.forEach(conditions, function(value, key) {
            if(_.isArray(value)) {
                query = query.whereIn(key, value);
            } else if(_.isObject(value)) { // 区间类型
                if(value.between && value.start && value.end) {
                    query = query.whereBetween(key, [value.start, value.end]);
                } else if(value.symbol && value.val) {
                    query = query.where(key, value.symbol, value.val);
                }
            }else {
                query = query.where(key, value);
            }
        });
        return query;
    }

    /*==================== find method start ====================*/
    find(conditions, options) {
        let query = this.getConditionQuery(conditions);
        if(options && options.limit) {
            query = query.limit(options.limit);
        }
        if(options && options.cols) {
            query = query.select(options.cols);
        }
        return this.executeByQuery(query)
            .then(rows => {
                return rows;
            });
    }

    findOne(conditions, cols) {
        return this.find(conditions, {
            cols: cols,
            limit: 1
        })
            .then(rows => {
                let res = {};
                if(!_.isEmpty(rows)) {
                    res = rows[0];
                }
                return res;
            });
    }

    findById(id, cols) {
        cols = cols || '*';
        let condition = {};
        condition[this.PrimaryKey] = id;
        return this.findOne(condition, cols);
    }

    findByIdForce(id, cols) {
        let self = this;
        return self.findById(id, cols)
            .then(row => {
                if(_.isEmpty(row)) {
                    return Promise.reject({errorType: 'EntityNotFound', msg: 'entity not found.'});
                } else {
                    return row;
                }
            });
    }

    findNormalById(id, cols) {
        let condition = {};
        condition[this.PrimaryKey] = id;
        cols = cols || '*';
        condition.Status = this.Statuses.NORMAL;

        return this.findOne(condition, cols);
    }

    findByIds(ids, cols) {
        let condition = {};
        condition[this.PrimaryKey] = ids;
        cols = cols || '*';
        ids = _.uniq( _.compact( _.map(ids, _.toNumber) ) );

        return this.find(condition, {cols});
    }

    findNormalByIds(ids, cols) {
        let condition = {};
        condition[this.PrimaryKey] = ids;
        condition.Status = this.Statuses.NORMAL;
        cols = cols || '*';
        ids = _.uniq( _.compact( _.map(ids, _.toNumber) ) );

        return this.find(condition, {cols});
    }

    findNormal(conditions, options) {
        let query = this.getConditionQuery(conditions);
        if(options.limit) {
            query = query.limit(options.limit);
        }
        if(options.cols) {
            query = query.select(options.cols);
        }
        query = query.where('Status', this.Statuses.NORMAL);
        return this.executeByQuery(query)
            .then(rows => {
                return rows;
            });
    }

    queryWithPagination(query, pagination) {
        let page = pagination.page;
        let pageSize = pagination.pageSize;
        let offset = pageSize * (page - 1);
        query = query.offset(offset).limit(pageSize);

        return this.executeByQuery(query);
    }

    count(condition) {
        let query = this.getConditionQuery(condition).count();
        return this.executeByQuery(query)
            .then(rows => {
                return _.chain(rows).first().value()["count(*)"];
            });
    }

    pageCount(condition, pageSize) {
        return this.count(condition)
            .then(totalCount => {
                return _.ceil(totalCount / pageSize);
            });

    }
    pageCountByQuery(query, pageSize) {
        query = query.count();
        return this.executeByQuery(query)
            .then(rows => {
                let totalCount = _.chain(rows).first().value()["count(*)"];
                return _.ceil(totalCount / pageSize);
            });
    }
    pageTotalCountByQuery(query, pageSize) {
        query = query.count();
        return this.executeByQuery(query)
            .then(rows => {
                let totalCount = _.chain(rows).first().value()["count(*)"];
                return {
                    totalCount,
                    pageCount: _.ceil(totalCount / pageSize)
                };
            });
    }
    /*==================== find method end ====================*/


    /*==================== exist method start ====================*/
    exist(conditions) {
        let self = this;
        return self.findOne(conditions)
            .then(row => {
                return !_.isEmpty(row) && row.Status !== self.Statuses.DELETED;
            });
    }

    existForce(conditions) {
        let self = this;
        return self.exist(conditions)
            .then(isExist => {
                if(!isExist) {
                    return Promise.reject({errorType: 'EntityNotFound', msg: 'entity not found.'});
                } else {
                    return isExist;
                }
            });
    }

    notExist(conditions) {
        return this.exist(conditions)
            .then(isExist => {
                return !isExist;
            });
    }

    exsitById(id) {
        let condition = {};
        condition[this.PrimaryKey] = id;
        return this.exist(condition);
    }

    exsitByIdForce(id) {
        let self = this;
        return self.exsitById(id)
            .then(isExist => {
                if(!isExist) {
                    return Promise.reject({errorType: 'EntityNotFound', msg: 'entity not found.'});
                } else {
                    return isExist;
                }
            });
    }
    /*==================== exist method end ====================*/


    /*==================== delete method start ====================*/
    deleteByCondition(condition) {
        let self = this;
        return self.existForce(condition)
            .then(() => {
                let query = self.getConditionQuery(condition).del();
                return self.executeByQuery(query);
            });
    }

    deleteById(id) {
        let condition = {};
        condition[this.PrimaryKey] = id;
        return this.deleteByCondition(condition);
    }

    deleteByIds(ids) {
        let condition = {};
        condition[this.PrimaryKey] = ids;
        let query = this.getConditionQuery(condition).del();
        return this.executeByQuery(query);
    }

    softDeleteById(id) {
        let condition = {};
        condition[this.PrimaryKey] = id;
        return this.softDeleteByCondition(condition);
    }

    softDeleteByCondition(condition) {
        return this.updateByCondition(condition, {Status: this.Statuses.DELETED});
    }

    /*==================== delete method end ====================*/

    /*==================== update method start ====================*/
    updateByCondition(condition, props) {
        let self = this;
        return self.existForce(condition)
            .then(() => {
                let query = self.getConditionQuery(condition).update(props);
                return self.executeByQuery(query);
            });
    }

    updateById(id, props) {
        let self = this;
        return self.exsitById(id)
            .then(isExist => {
                if(!isExist) {
                    return Promise.reject({errorType: 'EntityNotFound', msg: 'entity not found.'});
                }
                let condition = {};
                condition[self.PrimaryKey] = id;
                return self.updateByCondition(condition, props);
            })
            .then(() => {
                return self.findById(id);
            });
    }

    updateByIds(ids, props) {
        let self = this;
        let condition = {};
        condition[self.PrimaryKey] = ids;
        return self.updateByCondition(condition, props)
            .then(function() {
                return self.findByIds(ids);
            });
    }
    /*==================== update method end ====================*/

    /*==================== create method start ====================*/
    insert(props) {
        let query = this.scope().insert(props);
        return this.executeByQuery(query);
    }

    create(props) {
        let self = this;
        let primaryKey = self.PrimaryKey;
        return self.insert(props)
            .then(okPacket => {
                if(okPacket.insertId) {
                    return self.findById(okPacket.insertId);
                } else {
                    if(!_.isArray(primaryKey)) {
                        primaryKey = [primaryKey];
                    }
                    let conditions = _.reduce(primaryKey, function(result, key) {
                        result[key] = props[key];
                        return result;
                    }, {});
                    return self.findOne(conditions);
                }
            });
    }

    createOrUpdate(props, updateProps) {
        return this.findOne(props)
            .then(row => {
                let _updateProps = _.defaults(updateProps, props);
                if(_.isEmpty(row)) {
                    return this.create(_updateProps);
                } else {
                    return this.updateByCondition(props, _updateProps);
                }
            });
    }
    /*==================== create method end ====================*/

    escapeLikeStr(likeStr) {
        return likeStr.replace(/[_%]|\\/g, function (escapeChar) {
            return "\\" + escapeChar;
        });
    }
}

BaseModelClass.prototype.raw = SqlBuilder.raw;

module.exports = BaseModelClass;