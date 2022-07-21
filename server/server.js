//* Подключение библиотек
const config = require('config');
const express = require('express');
const app = express();
const path = require('path');
const request = require('request');
const bitrix24 = require('../bitrix24');
const TOKEN = "5086160056:AAGYHrYzBFQ4CYO1sa70Mf56YrnCzj-9AGs";

//* Данные из конфига
const bitrix24Url = "https://property.bitrix24.ru/rest/2955/mylwvhx0tvrn8fcj/";
const httpBuildQuery = require("http-build-query");

const PORT = 80;

function getLeadById(id) {
    return new Promise((resolve, reject) => {
        request({
            url: `${bitrix24Url}/crm.lead.get?id=${id}`,
            json: true
        }, (error, response, body) => {
            if (error) reject(error);
            resolve(body);
        });
    });
}

app.get('/success', (req, res) => {
    const reqLeadId = req.query.InvId;
    console.log(reqLeadId)
    console.log(TOKEN);
    getLeadById(reqLeadId).then(response => {
        const comments = response.result.COMMENTS;
        const chatID = comments.split(" ")[0];
        let companyName = '';
        if (comments.split(' ').length > 2) {
            companyName = comments.split(' ').slice(1).join(' ');
        } else {
            companyName = comments.split(' ')[1];
        }
        console.log(companyName, chatID);
        bitrix24.getCompany(companyName, chatID);
        bitrix24.getContacts(companyName, chatID);
        const updateLeadFields = {
            "ID": reqLeadId,
            "fields": {
                "TITLE": "Успешная оплата информации об объекте",
                "OPENED": "N"
            }
        };
        request({
            url: `${bitrix24Url}/crm.lead.update?${httpBuildQuery(updateLeadFields)}`,
            json: true
        }, (error, response, body) => {
            if (body.result == true) {
                console.log(true);
            }
            if (body.result != true) {
                console.log(false);
            }
        });
        res.end();
    });
    res.sendFile(path.join(__dirname + `/resultClient/success.html`));
});

app.get('/failure', (req, res) => {
    const reqLeadId = req.query.invId;
    const text = 'Отказано. Проверьте состояние оплаты или обратитесь в команду поддержки для помощи.';
    const updateLeadFields = {
        "ID": reqLeadId,
        "fields": {
            "TITLE": "Отказ оплата информации об объекте",
            "OPENED": "N"
        }
    };
    getLeadById(reqLeadId).then(response => {
        const chatID = response.result.COMMENTS.split(" ")[0];
        const companyName = response.result.COMMENTS.split(" ")[1];
        const data = {
            "chat_id": chatID,
            "text": text
        };
        request.post({
            url: `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            body: data,
            json: true
        }, (error, response, body) => {
            if (error) console.log(error);
            else console.log('Не прошла оплата. С кем не бывает')
        });
        request({
            url: `${bitrix24Url}/crm.deal.update?${httpBuildQuery(updateLeadFields)}`,
            json: true
        }, (error, response, body) => {
            if (body.result == true) {
                return true;
            }
            if (body.result != true) {
                return false;
            }
        });
    });
    res.sendFile(path.join(__dirname + `/resultClient/failure.html`));

});

app.listen(PORT, () => {
    console.log(`Server has been started on ${PORT} port...`);
});