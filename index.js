const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { addonBuilder } = require('stremio-addon-sdk');

const app = express();

// --- CONFIGURA AQUÍ TU LOGIN ---
const LOGIN_URL = 'https://www.gay-torrents.net/login';
const USERNAME = process.env.GT_USERNAME;
const PASSWORD = process.env.GT_PASSWORD;

// --- Variables de sesión ---
let cookies = '';
let lastLogin = 0;

// --- Función de login ---
async function login() {
    const res = await fetch(LOGIN_URL, {
        method: 'POST',
        body: new URLSearchParams({ username: USERNAME, password: PASSWORD }),
        redirect: 'manual'
    });

    cookies = res.headers.get('set-cookie') || '';
    lastLogin = Date.now();
    console.log('✅ Login completado');
}

// --- Función para comprobar sesión ---
async function ensureLogin() {
    if (!cookies || (Date.now() - lastLogin > 1000 * 60 * 30)) {
        await login();
    }
}

// --- Función para obtener torrents ---
async function getTorrents(page = 1) {
    await ensureLogin();
    const url = `https://www.gay-torrents.net/page/${page}`;
    const res = await fetch(url, { headers: { Cookie: cookies } });
    const html = await res.text();
    const $ = cheerio.load(html);

    const torrents = [];
    $('div.torrent-row').each((i, el) => {
        const title = $(el).find('.torrent-title').text().trim();
        const torrentUrl = $(el).find('.download a').attr('href');
        const detailsUrl = $(el).find('.torrent-title a').attr('href');

        if (title && torrentUrl) {
            torrents.push({
                name: title,
                torrent: torrentUrl,
                infoHash: Buffer.from(detailsUrl).toString('hex'),
                type: 'movie'
            });
        }
    });

    return torrents;
}

// --- CONFIGURACIÓN DEL ADDON ---
const builder = new addonBuilder({
    id: 'gay-torrents-addon',
    name: 'Gay Torrents',
    description: 'Torrents para Stremio desde www.gay-torrents.net',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie']
});

// --- CATALOG ---
builder.defineCatalogHandler(async (args) => {
    const page = args.extra && args.extra.page ? args.extra.page : 1;
    const torrents = [];

    for (let p = page; p < page + 10; p++) {
        const t = await getTorrents(p);
        torrents.push(...t);
    }

    return {
        metas: torrents,
        cacheMaxAge: 3600
    };
});

// --- STREAMS ---
builder.defineStreamHandler(async (args) => {
    const torrents = await getTorrents(1); // buscar en la primera página
    const stream = torrents.find(t => t.infoHash === args.id);
    if (stream) {
        return [{ title: stream.name, url: stream.torrent, infoHash: stream.infoHash }];
    }
    return [];
});

// --- EXPRESS ---
app.use('/manifest.json', (req, res) => res.json(builder.getManifest()));
app.use(builder.getRouter());

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`🚀 Addon corriendo en puerto ${PORT}`));
