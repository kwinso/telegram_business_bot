# Database API Telegram-bot
This telegram bot is created to find people in database with given parameters.
This bot can automatically check and confirm payments with **QiWi**. Also this bot work with this platforms: **Bank Cards, Online Wallets**.
Bot sends PM to the Admin and asks to confirm payment with Bank Card or Online Wallet.

## Getting started
First things first, clone this repository:
```
  git clone https://github.com/uwumouse/telegram_business_bot.git
```
So, now we have all source code in the `telegram_business_bot`, let's update all dependencies:
```
  cd telegram_business_bot
  npm install 
````
That's all! Now we have to configure our bot.
## Setup your bot 
To configure bot, check the `bot_config.ini` file. Bot won't never work without this file.  
Most fields are easy to understand, but I'll explain something.

```
  QIWI_TOKEN='Here you have to provide QiWi API Token, then bot will automate QiWi payments'
```
You can get API token here: https://qiwi.com/api  
Don't forget to *allow check transactions history*.  
Let's move on:
```
  PHONE_NUMBER='Phone you signed in QiWi with'
  PAYMENT='Amount of rubles'
  ADMIN_ID="Telegram User ID to confirm Not QiWi payments"
```

## How does this bot work?
- First of all, bot will offer to pay for search and check contacts. You can change most of messages in `~/Controllers/MessagesController.js`.
- When user is ready to pay, bot offers all available ways to pay.  
- If user chooses QiWi, bot will generate a codeword, it'll send it to the user and will wait and check for updates in QiWi wallet history of payments.
  Otherwise, bot will send message to the admin and ask to confirm payment.
- Next step is collecting information about person and validating all answers.
- Then bot sends data to the server with API, if it gets an error, user have to repeat all process of collecting info again.  
- User can generate these types of tables if the information in found: **Excel, HTML, Text table**. User can generate any table but only three times. Bot will end work and go to the main menu when there's no attempts anymore.
Also user can end his search when he wants rigth after information found.
