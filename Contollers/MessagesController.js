const Markup = require('telegraf/markup')
const Extra = require("telegraf/extra");

const messages = {
    paymentOffer: 
        `⚠️ Для работы бота вам нужно оплатить использование бота.\nВы можете сделать это тремя способами: <b>QiWi, Яндекс.Касса, Сбербанк Онлайн</b>.\nВыберите способ оплаты, <i>нажав на кнопку</i>`, 
}

const keyboards = {
    paymentOfferKeyboard: ["QiWi 💸", "Яндекс.Касса 💵", "Сбербанк Онлайн 💳"],
    adminVerifyPayment: "Подтвердить оплату ✅"
}


const keyPhrases = "lorem ipsum dolor sit amet consectetur adipiscing elit Integer dictum purus tellus eget finibus justo bibendum id etiam tempor vulputate libero vel malesuada dui ullamcorper at mivamus rhoncus nibh nec enim egestas egestas fusce tincidunt lorem ac iaculis maximus ante elit sollicitudin magna sit amet tincidunt neque felis ut justo".replace(",", "").replace(".", "").toLowerCase().split(" ");

module.exports = class MessagesController {
    sendPaymentOffer(cxt) {
        cxt.reply(messages.paymentOffer, Extra.HTML().markup(Markup.keyboard(keyboards.paymentOfferKeyboard).oneTime().resize())
        )
    }

    generateInstruction (method, phrase, wallet, payment) {
        method = method.split(" ")[0];
        return `Вы выбрали <b>${method}</b> как способ оплаты.\n\n` + 
        `<b>Счёт для оплаты:</b> <code>${wallet}</code>\n` + 
        `<b>Размер оплаты:</b> <code>${payment} руб.</code>\n` +
        `<b>Кодовое слово:</b> <code>${phrase}</code>\n\n` + 
        `<i>Обязательно укажите кодовое слово в качестве комментрия к переводу, иначе оплата не будет засчитана!</i>`;
    }
    generateAdminInstruction(wallet, phrase, payment) {
        return `Проверьте свой кошелёк!\n` + 
        `Новый пользователь хочет оплатить использование бота с помощью <code>${wallet}</code>.\n` + 
        `<b>Кодовое слово:</b> <code>${phrase}</code> .\n` + 
        `<b>Сумма оплаты:</b> <code>${payment}руб.</code>`
    }
    generatePreRequestQuestion(request, ctx) {
        const nullValueMessage = "Не указано";
        const { 
            firstName,
            lastName,
            middleName,
            yearBirth,
            dayBirth,
            monthBirth,
            passport,
            car,
            inn,
            snils,
            telephone
        } = request;
        const message = 
            `Проверьте ваш запрос перед отправкой.\n` + 
            `<b>Имя:</b> <code>${firstName || nullValueMessage}</code>\n` +
            `<b>Фамилия</b>: <code>${lastName || nullValueMessage}</code>\n` +
            `<b>Отчество:</b> <code>${middleName || nullValueMessage}</code>\n` + 
            `<b>Год рождения:</b> <code>${yearBirth || nullValueMessage}</code>\n` + 
            `<b>Месяц рождения:</b> <code>${monthBirth || nullValueMessage}</code>\n` + 
            `<b>День рождения:</b> <code>${dayBirth || nullValueMessage}</code>\n` + 
            `<b>Паспорт РФ:</b> <code>${passport || nullValueMessage}</code>\n` +
            `<b>Гос. номер ТС:</b> <code>${car || nullValueMessage}</code>\n` +
            `<b>ИНН:</b> <code>${inn || nullValueMessage}</code>\n` +
            `<b>СНИЛС:</b> <code>${snils || nullValueMessage}</code>\n` +
            `<b>Номер телефона:</b> <code>${telephone || nullValueMessage}</code>`;
        try {
        ctx.reply(message, Extra.HTML().markup(Markup.keyboard([["Найти 🔍", "Начать заново 🔄"]]).resize().oneTime()));
            
        } catch (e) {
            console.error(e);
        }
    }

    sendPaymentNotification(userId, adminId, userMessage, adminMessage, bot) {
        bot.sendMessage(userId, userMessage, { parse_mode: "HTML", reply_markup: { remove_keyboard: true }});
        bot.sendMessage(adminId, adminMessage, Extra.HTML().markup(m => m.inlineKeyboard([m.callbackButton(keyboards.adminVerifyPayment, "verify " + userId)]).oneTime()));
    }

    sendAlreadyPaidAlert(ctx) {
        ctx.reply("⚠️ Вы уже оплатили использование бота ⚠️", Extra.HTML().markup(m => m.inlineKeyboard([m.callbackButton("Заполнение данных 📝", "buildRequest")])));
    }
    chooseRandomPhrase() {
        return keyPhrases[Math.floor(Math.random() * keyPhrases.length)];
    }
}