const asyncQiWi = require("node-qiwi-api").asyncApi;

const { QiWiDatabaseActions } = require('./DatabaseController');
const { Markup } = require("telegraf/extra");
const { Extra } = require("telegraf");

module.exports.QiWiController = class QiWiController {
    wallet;
    phoneNumber;
    historyChecker; 
    paymentRate;
    keywords = [];
    botAccount; 

    constructor (token, number, paymentRate, account) {
        this.phoneNumber = number;
        this.wallet = new asyncQiWi(token);
        this.paymentRate = paymentRate;
        this.historyChecker = setInterval(() => this.checkHistory(), 1000 * 5);
        this.botAccount = account;
    }

    async checkHistory() {
        try {
            const lastPaymentDate = await QiWiDatabaseActions.getLastPaymentDate();
            const transactions = await this.wallet.getOperationHistory(this.phoneNumber, {rows: 50, operation: "IN"});
            let payments;
            if (transactions.data) {
                payments = transactions.data
                    .filter((tnx) => tnx.sum.amount >= this.paymentRate && new Date(tnx.date) >= lastPaymentDate && tnx.comment)
                    .map((tnx) => { return  { person: tnx.account, comment: tnx.comment, date: tnx.date }});   
                for (let payment of payments) {
                    const unpaid = await QiWiDatabaseActions.checkUnpaidWithComment(payment.comment, payment.person);
                    if (unpaid) {
                        QiWiDatabaseActions.setPaid(unpaid, payment.person);
                        this.botAccount.sendMessage(unpaid.payerId,"✅ Оплата прошла успешно ✅", Extra.HTML().markup(Markup.removeKeyboard()));
                        this.botAccount.sendMessage(unpaid.payerId, "Теперь вы можете начинать поиск", Extra.markup(m => m.inlineKeyboard([m.callbackButton("Заполнение данных 📝", "buildRequest")])));
                    }  
                }
                // update last payment date according to first payment in the response array
                if (payments.length)
                    await QiWiDatabaseActions.saveLastPayment(payments[0].date, lastPaymentDate);
            }
            return;
        } catch (e) {
            console.error(e);
        }
    }
}