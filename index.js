const fetch = require("node-fetch");
const express = require("express");
const AbortController = require("abort-controller");

const config = require("./config.json");

const app = express();

const UA = "DDMM-ModClubProxy (zudo@doki.space)";

/**
 * Get the "direct" download URL for the mod
 * @param url The URL to test
 * @returns {string|null} The direct URL, or null
 */
function getDirectURL(url) {
    const urlObj = new URL(url);
    // direct google drive link already
    if (urlObj.hostname === "drive.google.com" && urlObj.pathname === "/uc" && urlObj.searchParams.get("export") === "download") {
        return url;
        // possibly a gdrive link we can convert
    } else if (urlObj.hostname === "drive.google.com") {
        const match = /(?:\/file\/d\/([a-zA-Z0-9_\-]+))|(?:\/open\?id=([a-zA-Z0-9_\-]+))/.exec(url);
        if (match) {
            const fileID = match[1] || match[2];
            return "https://drive.google.com/uc?id=" + fileID + "&export=download";
        } else {
            return null;
        }
        // a dropbox link
    } else if (urlObj.hostname === "dropbox.com" || urlObj.hostname === "www.dropbox.com") {
        if (urlObj.searchParams.get("dl") === "0") {
            urlObj.searchParams.set("dl", "1");
            return urlObj.href;
        } else if (urlObj.searchParams.get("dl") === "1") {
            return url;
        }
    }

    return null;
}

/**
 * Attempt to load the URL and see if we get a response
 * @param url The URL
 * @returns {Promise<unknown>} the direct download URL if applicable, otherwise null
 */
function testURL(url) {
    const abc = new AbortController();
    const timeout = setTimeout(() => abc.abort(), 5000);

    return new Promise((resolve => {
        fetch(url, {
            method: "HEAD",
            headers: {
                "User-Agent": UA
            },
            signal: abc.signal
        }).then(res2 => {
            const type = res2.headers.get("content-type");

            resolve(type.match(/^application\/.+/) ? url : getDirectURL(url));
        }).catch(() => {
            resolve(getDirectURL(url));
        }).finally(() => {
            clearTimeout(timeout);
        });
    }));
}

// CORS configuration
app.use((request, response, next) => {
    response.set("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/mod", (request, response) => {
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
            testURL(res[0].modUploadURL).then(url => {
                response.json({
                    directDownload: url,
                    mod: res[0]
                });
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
