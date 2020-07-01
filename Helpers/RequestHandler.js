const { default: Axios } = require("axios");
const xl = require('excel4node');
const fs = require('fs');
const path  = require("path");
const cheerio = require('cheerio');
const table = require('text-table');

const headerCols = [
    "Имя", "Фамилия", "Отчество", "Номер телефона", "Гос. номер авто", "Паспорт РФ", "День рождения", "Месяц рождения", "Год рождения", "СНИЛС", "ИНН", "Информация", "Найден в базе", "ID базы", "ID лица в базе", "Степень плотности покрытия"
]
let wb = new xl.Workbook();


FIRST_LINE_HEIGHT = 35;
INFO_ROWS_HEIGTH = 25;
COLUMNS_WIDTH = 50;

let headerStyle = wb.createStyle({
    font: {
        color: "#FFFFFF",
        size: 15
    },
    fill: {
        type: "pattern",
        patternType: "solid",
        fgColor: "#41BC23"
    },
    alignment: {
        horizontal: "center",
        vertical: "center"
    }
});
let personStyles = wb.createStyle({
    font: {
        size: 15
    },
    alignment: {
        vertical: "center"
    }
})

function createXLSXHeader (ws) {
    for (let i = 0; i < headerCols.length; i++) {
        ws.cell(1, i + 1)
            .string(headerCols[i])
            .style(headerStyle);
        ws.column(i + 1).setWidth(COLUMNS_WIDTH);
    }
    ws.row(1).setHeight(FIRST_LINE_HEIGHT);

}

function writeXLSXData(data, ws) {
    // обходим весь массив людей
    for (let i = 0; i < data.length; i++) {
        // считаем, какая колонка сейчас будет заполняться
        let fieldCount = 1;
        // обходим каждое поле 
        for (let field in data[i]) {
            // будущее значение ячейки
            let fieldValue;
            if (data[i][field] !== null && data[i][field] !== '') {
                
                // ставим в значение поля
                fieldValue = data[i][field].toString();
                // информация - массив, который нужно обойти и переделать в строку
                if (field == "information") {
                    // стираем значение ячейки
                    fieldValue = '';
                    // записываем всё из массива в одну строку
                    for (let item of JSON.parse(data[i].information).D) {
                        fieldValue += item  + " ";
                    }
                }
            } else fieldValue = 'Не указано';
            ws.cell(i + 2 , fieldCount).string(fieldValue).style(personStyles);
            fieldCount++;
        }
        // устанить высоту
        ws.row(i + 2).setHeight(INFO_ROWS_HEIGTH);
    }
}
 

function createHTMLHeader($) {
    for (let column of headerCols) {
        $('table > thead > tr').append("<th scope='col'>" + column + "</th>");
    }
}

function writeHTMLData (data, $) {
    // обходим весь массив людей
    for (let i = 0; i < data.length; i++) {
        let rowData = "";
        // обходим каждое поле 
        for (let field in data[i]) {
            // будущее значение ячейки
            let fieldValue;
            if (data[i][field] !== null && data[i][field] !== '') {

                fieldValue = data[i][field].toString();
                // информация - массив, который нужно обойти и переделать в строку
                if (field == "information") {
                    fieldValue = '';
                    // записываем всё из массива в одну строку
                    for (let item of JSON.parse(data[i].information).D) {
                        fieldValue += item  + " ";
                    }
                }
            } else fieldValue = 'Не указано';

            rowData += "<td>" + fieldValue + "</td>";
        }
        $("table > tbody").append(`<tr>${rowData}</tr>`);
    }
}

module.exports.createTextTable = function createTextTable(data) {
    const tableData = [ 
        headerCols
    ];
    for (let i = 0; i < data.length; i++) {
        let row = [];
        // обходим каждое поле 
        for (let field in data[i]) {
            // будущее значение ячейки
            let fieldValue;
            if (data[i][field] !== null && data[i][field] !== '') {

                fieldValue = data[i][field].toString();
                // информация - массив, который нужно обойти и переделать в строку
                if (field == "information") {
                    fieldValue = '';
                    // записываем всё из массива в одну строку
                    for (let item of JSON.parse(data[i].information.replace(/\n\r\t/, "")).D) {
                        fieldValue += item  + " ";
                    }
                }
            } else fieldValue = 'Не указано';
            row.push(fieldValue);
        }
        tableData.push(row);
    }
    const text = table(tableData);
    return Buffer.from(text);

}



// возвращает true, если пользватель получил данные, в обратном случае попытка поиска не засчитана
module.exports.getData = async (userReqest, ctx, token) => {
    for (let field in userReqest) {
        if (!userReqest[field]) {
            delete userReqest[field];
        }
    }
    // избавляется от полей из mongoDB
    delete userReqest["$init"]
    try {
    const params = {
        ...userReqest,
        token
    }
    if (getSize(params) < 2) {
        await ctx.reply("⚠️ Указано меньше двух параментров. Укажите больше, пожалуйста.",  { reply_markup: { remove_keyboard: true }});
        return null;
    }
     
    const res = await Axios.get("https://protocol-base.com/business_api/get_peoples", { params });
    const persons = res.data;
    if (!persons.length) {
        await ctx.reply("❌ Результатов нет.",  { reply_markup: { remove_keyboard: true }});
        return null;
    }
    return persons;
    } catch (e) {
        await ctx.reply("Ошибка на сервере. Попробуйте переделать ваш запрос.", { reply_markup: { remove_keyboard: true }});
        console.error("Ошибка во время поиска в базе:\n" + e);
        return null;
    };
}

function getSize(obj) {
    let size = 0;
    for (let key in obj) {
       size++;
    }
    return size;
};

module.exports.generateHTML = async function generateHTML (data) {
    const $ = cheerio.load(fs.readFileSync(path.join(__dirname, "../Assets/Template.html")), {decodeEntities: false});
    createHTMLHeader($);
    writeHTMLData(data, $);
    const dataBuffer = await Buffer.from($.html());
    return dataBuffer;

}


module.exports.generateXLSX = async function generateXLSX(data) {
    let ws = wb.addWorksheet('Результаты поиска');
    createXLSXHeader(ws);
    writeXLSXData(data, ws);
    const buffer = await wb.writeToBuffer();
    return buffer;
}