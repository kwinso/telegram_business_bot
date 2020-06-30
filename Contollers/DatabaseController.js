const mongoose = require('mongoose'); 

const User = require("../Models/User");
const Payment = require("../Models/Payment");
const LastPayment = require("../Models/LastPayment");
const { checkUnpaid } = require('../main');


module.exports.QiWiDatabaseActions = {
    async checkUnpaidWithComment(comment, qiwiId) {
        const paidUser = await User.findOne({ qiwiId, hasPaid: true });
        if (!paidUser) {
            return await Payment.findOne({ comment: comment.trim()});
        }
        return null;
    },
    async saveLastPayment (date, oldDate) {
        await LastPayment.findOneAndUpdate({ date : oldDate}, { date });

    },
    async  getLastPaymentDate () {
        let lastPayment = await LastPayment.findOne();
        if (!lastPayment) {
            lastPayment = new LastPayment();
            await lastPayment.save()
        }
        return new Date(lastPayment.date);

    },
    async setPaid(unpaid, qiwiId) {
        await User.findOneAndUpdate({ profileId: unpaid.payerId, hasPaid: false }, { hasPaid: true, qiwiId });
        await Payment.findOneAndDelete({ payerId: unpaid.payerId });
    }
}

module.exports.DatabaseController = class DatabaseController {
    
    databaseUri;
    cleanOldPayments;
    
    constructor (uri) {
        this.databaseUri = uri; 
    }

    connect () {
        mongoose.connect(this.databaseUri, {
            useUnifiedTopology: true, 
            useNewUrlParser: true,
            useFindAndModify: false,
        });
        const db = mongoose.connection;
        db.once("open", () => console.log("База данных подключена."));
        db.on("error", (e) => console.log("База данных не подключена: " + e));

        // чистить каждые пять минут старые записи
        this.cleanOldPayments = setInterval(this.cleanPayments, 1000 * 30);

    }

    // Создание нового пользователя в базе данных
    async createUser (id) {
        const user = await User.findOne({ profileId: id });
        try {
            if (!user) {
                const newUser = new User({ profileId: id});
                await newUser.save();
                const savedUser = await this.getUser(id);
                return savedUser;
            }
        } catch (e) {
            console.error("Ошибка записи в базу данных:\n " + e);
        }  
    }

    async getUser(id) {
        const user = await User.findOne({ profileId: id });
        return user;
    }


    // возрващает false если не удалось сохранить по каким либо причинам
    async addNewPayment(id, phrase) {
        const paymentWithComment = await Payment.findOne({ comment: phrase });
        if (paymentWithComment) return false;
        const payment = new Payment({
            payerId: id,
            comment: phrase
        });
        try {
            await payment.save(); 
            return true;
        } catch (e) {
            console.log("Ошибка во время сохрания заявки на оплату в базу данных:\n" + e);
            return false;
        }
    }

    async update (object) {
        try {
            await object.save();
        } catch (e) {
            console.log("Ошибка во время обновления записи в базе данных:\n" + e);
        }
    }

    async findPayment(payerId) {
        const payment = await Payment.findOne({ payerId });
        return payment;
    }

    async cleanPayments() {
        const now = Date.now();
        // удалить все записи старше 20 минут 
        let payments = await Payment.find({ started: { $lte: now - 1000 * 60 * 30}});
        for (let payment of payments ) {
            await Payment.findOneAndDelete({payerId: payment.payerId });
        }
    }

    async clearUserRequest(user) {
        user.request = null;
        user.currentQuestion = 0;
        await user.save();
    }

    async clearUser(user) {
        const { profileId } = user;
        await User.findOneAndDelete({ profileId });
    }
    async saveByQuestionNumber (user, value) {
        const { request, currentQuestion } = user;
        switch (currentQuestion) {
            case 0:
                request.firstName = value;
                break;
            case 1:
                request.lastName = value;
                break;
            case 2:
                request.middleName = value;
            case 3:
                request.yearBirth = value;
                break;
            case 4:
                request.monthBirth = value
                break;
            case 5:
                request.dayBirth = value;
                break;
            case 6:
                request.passport = value;
                break;
            case 7:
                request.car = value;
                break;
            case 8:
                request.snils = value;
                break;
            case 9:
                request.inn = value;
                break;
            case 10:
                request.telephone = value;
        }
        user.currentQuestion += 1;
        user.request = request;
        await user.save();
    }
}