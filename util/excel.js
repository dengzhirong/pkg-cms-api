/**
 * Created by dengzhirong on 2018/4/23.
 */
const Excel = require('exceljs');
const moment = require('moment');
const _ = require('lodash');
const Util = require('../util/util');
const ExcelUtil = {};

module.exports = ExcelUtil;

// 生成excel文件内容
ExcelUtil.genExcelContent = (data, options) => {
    let { sheetName='工作表', columnsMap } = options;
    let workbook = new Excel.Workbook();

    // 设置表信息
    workbook.created = new Date();
    workbook.modified = new Date();

    // 设置表名
    let sheet = workbook.addWorksheet(sheetName, {
        properties: {
            tabColor:{ argb: 'FFC0000' },
            outlineLevelCol: 1,
            defaultRowHeight: 35
        },
        // pageSetup:{horizontalCentered: true, verticalCentered: true}
    });

    // sheet.autoFilter = 'A1:B1'; // 设置筛选器

    // 设置表头
    let columns = [];
    let _col_index = 0;
    _.each(data[0], (val, key) => {
        columns[_col_index] = { header: columnsMap[key], key: key, width: 13};
        _col_index++;
    });
    sheet.columns = columns;

    // 添加数据
    sheet.addRows(data);

    return workbook;
};

// 写入excel文件
ExcelUtil.writeToExcelFile = (workbook, filePath) => {
    workbook.xlsx.writeFile(filePath).then(val => {
        Util.log(`\nWrite to excel done! \nFile name is ${filePath}`);
        process.exit(0);
    }).catch(err => {
        Util.log(err);
    });
};

// 设置excel文件名为中文
ExcelUtil.setExcelFileName = (req, res, filename) => {
    let userAgent = (req.headers['user-agent']||'').toLowerCase();

    if(userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent(filename));
    } else if(userAgent.indexOf('firefox') >= 0) {
        res.setHeader('Content-Disposition', 'attachment; filename*="utf8\'\'' + encodeURIComponent(filename)+'"');
    } else {
        /* safari等其他非主流浏览器只能自求多福了 */
        res.setHeader('Content-Disposition', 'attachment; filename=' + new Buffer(filename).toString('binary'));
    }
};

// 发送excel workbook
ExcelUtil.sendExcelWorkbook = (req, res, workbook, fileName) => {
    fileName = `${fileName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    ExcelUtil.setExcelFileName(req, res, fileName);

    // 下载后自动关闭页面
    res.setHeader('Content-Type', 'application/force-download');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Type', 'application/download');

    workbook.xlsx.write(res).then(() => {
        res.end();
    });
};

// 发送excel到客户端下载
ExcelUtil.sendExcelToClient = (req, res, data, options) => {
    let columnsMap = options.columnsMap || {};
    let columnKeys = _.keys(columnsMap);
    data = _.map(data, (item) => {
        return _.pick(item, columnKeys);
    });

    let workbook = ExcelUtil.genExcelContent(data, options);
    let workSheet = workbook.worksheets[0];
    if(options.autoFilter && workSheet) {
        workSheet.autoFilter = options.autoFilter;
    }
    return ExcelUtil.sendExcelWorkbook(req, res, workbook, options.fileName);
};
