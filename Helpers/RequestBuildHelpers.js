const { Extra } = require("telegraf");
const { Markup } = require("telegraf/extra");

const types = {
    namePart: {
        type: "onlyLetters",
    },
    birthPart: {
        type: "number",
        minLen: 1,
        maxLen: 2,
        headingZeroes: false
    },
    year: {
        type: "number",
        len: 4,
    },
    passport: {
        type:  "number",
        len: 10
    },
    car: {
        type: "any",
        minLen: 3,
    },
    inn: {
        type:  "number",
        len: 11
    },
    snils: {
        type:  "number",
        len: 12
    },
    telephone: {
        type: "phoneNumber",
        minLen: 6,
    }
}

module.exports.Validator = class Validator {

    getType(number) {
        if (number <= 2) return "namePart";
        else if (number <=  5 && number >= 4 ) return "birthPart";
        else if (number == 3) return "year";
        else if (number == 6) return "passport";
        else if (number == 7) return "car";
        else if (number == 8) return "inn";
        else if (number == 9) return "snils";
        else if (number == 10) return "telephone";
    }
    validate (type, value) {
        const t = types[type.toString()];
        if (value.match(/[!@#$%&*()_+=|<>?{}\[\]~-] | [0-9]/) !== null) return { success: false, message: "❌ Поля не должны начинаться специальными знаками!"  }
        switch (t.type) {
            case "onlyLetters":
                if (!this.validateOnlyLetters(value)) return { success: false, message: "❌ В этом поле должны быть только буквы ❌" };
                break;
            case "number":
                if (!this.validateNumber(value)) return { success: false, message: "❌ В этом поле должен быть номер без пробелов ❌" };
                break;
            case "phoneNumber": 
                if (!this.validatePhoneNumber(value)) return  { success: false, message: "❌ Введите правильный номер телефона ❌" };
                break;
            
        }
        if(!t.headingZeroes && value.startsWith("0")) return { success: false, message: "⚠️ Введите эту дату без нуля в начале ⚠️"}
        if (t.minLen) {
            if(value.length < t.minLen) return { success: false, message: "⚠️ Минимальная длина этого поля: " + t.minLen + " ⚠️" }; 
        }
        if (t.len) {
            if (value.length !== t.len) return { success: false, message: "⚠️ Длина этого поля: " + t.len + " ⚠️" };
        }
        if (t.maxLen) {
            if (value.length > t.maxLen ) return { success: false, message: "⚠️ Максимальная длина этого поля: " + t.maxLen + " ⚠️" };
        }
        
        return { success: true };
    }

    validatePhoneNumber(phone) {
        phone = phone.replace("+", "");
        return (phone.length > 6 && phone.match(/[0-9]/g).length == phone.length);
        
    }
    validateNumber (value) {
       return (value.match(/^[0-9]*$/) !== null);
    }
    validateLength(value, desiredLength, minimal) {
        if (value.trim().length !== desiredLength) {
            // check if it's minimal value 
            if (minimal && value.trim().length >= desiredLength) return true;
            else return false;
        }
        return true;
    }

    validateOnlyLetters(value) {
        return (value.match(/\D/g) !== null)
    }
}

module.exports.AskHandler = class AskHandler {
    bot;
    questions = [
        "🕴️ Фамилия лица (Только буквы, не чуствительно к регистру)",
        "🕴️ Имя лица (Только буквы, не чуствительно к регистру)",
        "🕴️ Отчество лица (Только буквы, не чуствительно к регистру)",
        "📅 Год рождения лица (4 цифры, без пробелов)",
        "📅 Месяц рождения лица (Например: 3, 11)",
        "📅 День рождения лица (Например: 3, 21)",
        "📔 Паспорт РФ лица (10 цифр, без пробелов)",
        "🚗 Гос. номер ТС лица (От 3 символов)",
        "📄 Снилс лица (11 цифр без разделителей)",
        "📃 ИНН лица (12 цифр без разделителей)",
        "📱 Номер телефона лица (Разрешается \"+\" в начале, от 6 цифр, без разделителей)"
    ]
    constructor (botAccount) {
        this.bot = botAccount;
    }
    askQuestion(currentUserQuestion, userId) {
        this.sendWithContextKeyBoard(userId, this.questions[currentUserQuestion]);
    }

    sendWithContextKeyBoard(id, q) {
        this.bot.sendMessage(id, q, Extra.HTML().markup(Markup.keyboard([["Пропустить ⏭️", "Начать заново 🔄"]]).resize()));
    }
}