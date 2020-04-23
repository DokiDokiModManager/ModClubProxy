const fetch = require("node-fetch");
const express = require("express");

const config = require("./config.json");

const app = express();

app.use((request, response, next) => {
   response.set("Access-Control-Allow-Origin", "*");
   next();
});

app.get("/listing", (request, response) => {
    fetch("https://www.dokidokimodclub.com/api/mod/", {
        headers: {
            "Authorization": "Api-Key " + config.api_key
        }
    }).then(res => res.json()).then(res => {
        response.json(res);
    }).catch(err => {
        console.warn(err);
        response.status(500).json({"error": "an error occurred"});
    });
});

app.listen(8069);
