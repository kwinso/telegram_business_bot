const  { Telegraf } = require("telegraf");
const Extra = require("telegraf/extra");
const { Markup } = require("telegraf/extra");
const ini = require("ini");
const  fs = require("fs");

const  { DatabaseController } = require("./Contollers/DatabaseController");
const MessagesController =  require("./Contollers/MessagesController");
const { QiWiController } = require("./Contollers/PaymentsControllers");
const { Validator, AskHandler} = require("./Helpers/RequestBuildHelpers");
const { getData, generateHTML, generateXLSX, createTextTable } = require("./Helpers/RequestHandler");

const { dependencies } = ini.parse(fs.readFileSync("./bot_config.ini", "utf-8"));

const bot = new Telegraf(dependencies.TOKEN);
const qiwiWallet = new QiWiController(dependencies.QIWI_TOKEN, dependencies.PHONE_NUMBER, dependencies.PAYMENT, bot.telegram);
const database = new DatabaseController(dependencies.DATABASE_ADDRESS);
const messages = new MessagesController();
const askHandler = new AskHandler(bot.telegram);
const validator = new Validator();

bot.start(async (ctx) => {
    let user = await database.getUser(ctx.from.id);
    if (!user) {
        user = database.createUser(ctx.from.id);
    }
    if (!user.hasPaid) {
        messages.sendPaymentOffer(ctx);
        return;
    } else {
        await database.clearUserRequest(user);
        ctx.reply("Начать поиск", Extra.markup(m => m.inlineKeyboard([m.callbackButton("Заполнение данных 📝", "buildRequest")])));
    }
});

// Контроль выбора оплаты
bot.hears("QiWi 💸", async (ctx) => {
    let randomPhrase = messages.chooseRandomPhrase();
    const userPayment = await database.findPayment(ctx.from.id);
    const paidUser = await database.getUser(ctx.from.id);
    if (paidUser && paidUser.hasPaid) {
        messages.sendAlreadyPaidAlert(ctx);
        return;
    } else {
        await database.createUser(ctx.from.id);
    }
    if (userPayment) {
        const instruction = messages.generateInstruction("QiWi", userPayment.comment, dependencies.PHONE_NUMBER, dependencies.PAYMENT);
        ctx.reply(instruction, {parse_mode: "HTML", reply_markup: { remove_keyboard: true } });
        return; 
    }
    // проверка во избежание потворяющихся комментариев 
    for (let i = 1; i <= 5; i++) {
        if (i == 5) {
            ctx.reply("Не удалось записать вас в очередь на оплату, попробуйте через пять минут");
            return;
        }
        randomPhrase = messages.chooseRandomPhrase();
        const isSaved = await  database.addNewPayment(ctx.from.id, randomPhrase);
        if (!isSaved) continue;
        else break;
    }
    const instruction =  messages.generateInstruction("QiWi", randomPhrase, dependencies.PHONE_NUMBER, dependencies.PAYMENT);
    ctx.reply(instruction, {parse_mode: "HTML", reply_markup: { remove_keyboard: true } });
});
bot.hears("Яндекс.Касса 💵", async (ctx) => {
    const user = await database.getUser(ctx.from.id);
    // проверка, если пользователь уже опалтил 
    if (user && user.hasPaid) {
        messages.sendAlreadyPaidAlert(ctx);
        return;
    }
    const phrase = messages.chooseRandomPhrase();
    const userInstruction = messages.generateInstruction("Яндекс.Касса", phrase, dependencies.YANDEX_WALLET, dependencies.PAYMENT, false);
    const adminInstruction = messages.generateAdminInstruction("Яндекс.Касса", phrase, dependencies.PAYMENT);

    messages.sendPaymentNotification(ctx.from.id, dependencies.ADMIN_ID, userInstruction, adminInstruction, bot.telegram);
});
bot.hears("Сбербанк Онлайн 💳", async (ctx) => {
    const user = await database.getUser(ctx.from.id);
    // проверка, если пользователь уже опалтил использование бота
    if (user && user.hasPaid) {
        messages.sendAlreadyPaidAlert(ctx);
        return;
    }
    const phrase = messages.chooseRandomPhrase();
    const userInstruction = messages.generateInstruction("Cбербанк", phrase, dependencies.SBERBANK_CARD, dependencies.PAYMENT);
    const adminInstruction = messages.generateAdminInstruction("Сбербанк", phrase, dependencies.PAYMENT);

    messages.sendPaymentNotification(ctx.from.id, dependencies.ADMIN_ID, userInstruction, adminInstruction, bot.telegram);
});
bot.hears("Начать заново 🔄", (ctx) => {
    startQuestions(ctx);
});
bot.hears("Пропустить ⏭️",  async (ctx) => {
    const user = await database.getUser(ctx.from.id);
    if ( user.currentQuestion == 10) {
        await database.saveByQuestionNumber(user, null);
        messages.generatePreRequestQuestion(user.request, ctx);
        return;
    }
    await database.saveByQuestionNumber(user, null);
    askHandler.askQuestion(user.currentQuestion, ctx.from.id);
});
bot.hears("Найти 🔍", async (ctx) => {
    const  user = await database.getUser(ctx.from.id);
    await ctx.reply("Поиск начался...", { reply_markup: { remove_keyboard: true }});
    if (!user) return;
    let results = await getData(user.request, ctx, dependencies.API_TOKEN);
    if (results) {
        ctx.reply("Результаты получены, выберите формат", Extra.markup(m => m.inlineKeyboard([
            [m.callbackButton("XLSX (excel)", "type xlsx"), m.callbackButton("HTML (браузер) ", "type html")], 
            [m.callbackButton("Текстовая таблица (редактор текста)", "type txt")]
        ])));
        await database.saveResponse(ctx.from.id, results);
        user.hasPaid = false;
        database.update(user);
        return;
    }
    ctx.reply("⚠️ Поиск был неудачным, поэтому у вас есть возможность переделать ваш запрос.", Extra.HTML().markup(m => m.inlineKeyboard([m.callbackButton("Начать заново 🔄", "buildRequest")])));
});
bot.on("text", async (ctx) => {
    let user = await database.getUser(ctx.from.id);
    if (!user) {
        user = await database.createUser(ctx.from.id);
    }
    if (!user.hasPaid) {
        messages.sendPaymentOffer(ctx);
        return; 
    }
    if (user.currentQuestion == 11 && user.hasPaid) {
        messages.generatePreRequestQuestion(user.request, ctx);
        return;
    }
    if (user.hasPaid) {
        // handling last question
        const type = validator.getType(user.currentQuestion);
        const result = validator.validate(type, ctx.message.text);
        if (result.success != true) {
            ctx.reply(result.message);
            return
        }
        await database.saveByQuestionNumber(user, ctx.message.text);
        if (user.currentQuestion == 11) {
            messages.generatePreRequestQuestion(user.request, ctx);
            return;
        }
        askHandler.askQuestion(user.currentQuestion, ctx.from.id);
    }
});


// handling callbacks 
bot.on("callback_query", async (ctx) => {
    if(ctx.callbackQuery.data.startsWith("verify")) {
        const verifiedUserId = ctx.callbackQuery.data.split(" ")[1];
        let user = await database.getUser(verifiedUserId);
        if (!user) {
            await database.createUser(verifiedUserId);
            user = await database.getUser(verifiedUserId);
        }
        let { username } = await bot.telegram.getChat(verifiedUserId);
        ctx.editMessageText("Оплата для пользователя @" + username + " была подтверждена! ✅");
        ctx.answerCbQuery("Оплата подтверждена.");
        user.hasPaid = true;
        await database.update(user);
        bot.telegram.sendMessage(verifiedUserId, "Ваша оплата была подтверждена. Можете начинать пользоваться ботом. ✅", Extra.HTML().markup(m => m.inlineKeyboard([m.callbackButton("Заполнение данных 📝", "buildRequest")])));
    }
    if(ctx.callbackQuery.data == 'buildRequest') {
        ctx.deleteMessage()
        startQuestions(ctx);
    }
    if (ctx.callbackQuery.data.startsWith("type")) {
        const fileType = ctx.callbackQuery.data.split(' ')[1];
        const { response } = await database.getUser(ctx.from.id);
        ctx.answerCbQuery("Генерирую файл...");
        let data;
        switch (fileType) {
            case "xlsx":
                data = await generateXLSX(response);
                ctx.replyWithDocument({ source: data, filename: "Результаты.xlsx" });
                break;
            case "txt":
                data = createTextTable(response);
                ctx.replyWithDocument({ source: data, filename: "Результаты.txt" });
                break;
            case "html":
                data = await generateHTML(response);
                ctx.replyWithDocument({ source: data, filename: "Результаты.html" });
                break;
        }
    }
});
async function startQuestions (ctx) {
    const user = await database.getUser(ctx.from.id);
    if (!user) {
        await database.createUser(ctx.from.id);
        messages.sendPaymentOffer(ctx);
        return;
    }
    if (!user.hasPaid) {
        messages.sendPaymentOffer(ctx);
        return;
    }
    if (user.request) {
       await database.clearUserRequest(user);
    }
    await ctx.reply("<b>Отвечайте на мои вопросы, чтобы проивзвести поиск.</b>\n\n<i>Нужно ввести не меньше двух параметров.</i>", Extra.HTML());
    askHandler.askQuestion(user.currentQuestion, ctx.from.id)
}
async function launchBot() {
    try {
        console.log("Запуск бота...");

        database.connect();
        await bot.launch();
        
        console.log("Бот запущен успешно.")
    
    } catch (e) {
        console.log("Ошибка во время запуска бота: " + e);
    }
}
launchBot();