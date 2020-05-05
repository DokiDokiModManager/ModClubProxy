const fetch = require("node-fetch");
const express = require("express");
const AbortController = require("abort-controller");

const config = require("./config.json");

const app = express();

const UA = "DDMM-ModClubProxy (zudo@doki.space)";

app.use((request, response, next) => {
    response.set("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/testddl", (request, response) => {
    if (!request.query.id) {
        response.status(400).json({"error": "invalid request"});
        return;
    }

    fetch("https://www.dokidokimodclub.com/api/mod/?modID=" + request.query.id, {
        headers: {
            "Authorization": "Api-Key " + config.api_key,
            "User-Agent": UA
        }
    }).then(res => res.json()).then(res => {
        if (res[0]) {
            const abc = new AbortController();
            const timeout = setTimeout(() => abc.abort(), 5000);
            fetch(res[0].modUploadURL, {
                method: "HEAD",
                headers: {
                    "User-Agent": UA
                },
                signal: abc.signal
            }).then(res2 => {
                const type = res2.headers.get("content-type");

                response.json({
                    url: res[0].modUploadURL,
                    type,
                    downloadable: !!type.match(/^application\/.+/)
                })
            }).catch(() => {
                response.json({
                    url: res[0].modUploadURL,
                    type: "unknown",
                    downloadable: false
                })
            }).finally(() => {
                clearTimeout(timeout);
            });
        } else {
            response.status(404).json({"error": "mod not found"});
        }
    }).catch(err => {
        console.warn(err);
        response.status(500).json({"error": "an error occurred"});
    });
})

app.get("/listing", (request, response) => {
    fetch("https://www.dokidokimodclub.com/api/mod/", {
        headers: {
            "Authorization": "Api-Key " + config.api_key,
            "User-Agent": UA
        }
    }).then(res => res.json()).then(res => {
        response.json(res);
    }).catch(err => {
        console.warn(err);
        response.status(500).json({"error": "an error occurred"});
    });
});

app.use((req, res) => {
    res.status(404).send(`
<p>This is a backend service for <a href="https://doki.space">Doki Doki Mod Manager</a>.</p>
<p>The source code for this service is available on <a href="https://github.com/DokiDokiModManager/ModClubProxy">GitHub</a>.</p>
`);
});

app.listen(8069);
