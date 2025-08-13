const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const StremioAddonSDK = require('stremio-addon-sdk');

const app = express();
const PORT = process.env.PORT || 10000;

// Variables de entorno para login
const USERNAME = process.env.GAYTORRENTS_USER;
const PASSWORD = process.env.GAYTORRENTS_PASS;

let sessionCookie = null;

// Función para login
async function login() {
    const loginRes = await fetch('https://www.gay-torrents.net/login', {
        method: 'POST',
        body: `username=${USERNAME}&password=${PASSWORD}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const cookies = loginRes.headers.get('set-cookie');
    sessionCookie = cookies;
    console.log('Login exitoso');
}

// Función para comprobar si la sesión expira y re-login
async function ensureLogin() {
    if (!sessionCookie) {
        await login();
    }
}

// Función para obtener torrents de una página
async function fetchPage(url) {
    await ensureLogin();
    const res = await fetch(url, { headers: { Cookie: sessionCookie } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const torrents = [];
    $('.torrent_row').each((i, el) => {
        const title = $(el).find('.torrent_name').text().trim();
        const link = $(el).find('.torrent_name a').attr('href');
        const date = $(el).find('.torrent_date').text().trim();
        const poster = $(el).find('.torrent_poster img').attr('src');
        const description = $(el).find('.torrent_description').text().trim();
        torrents.push({ title, link, date, poster, description });
    });
    return torrents;
}

// Función para obtener varios catálogos
async function fetchCatalog(type) {
    let results = [];
    for (let i = 1; i <= 10; i++) { // 10 páginas
        const pageTorrents = await fetchPage(`https://www.gay-torrents.net/${type}?page=${i}`);
        results = results.concat(pageTorrents);
    }
    return results;
}

// Crear addon Stremio
const builder = new StremioAddonSDK.AddonBuilder({
    id: 'gay-torrents-addon',
    name: 'Gay Torrents',
    description: 'Torrents para Stremio desde www.gay-torrents.net',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series']
});

// Catálogo para Películas
builder.defineCatalogHandler(async (args) => {
    if (args.type === 'movie') {
        const movies = await fetchCatalog('movies');
        return { metas: movies.map(m => ({
            id: m.link,
            type: 'movie',
            name: m.title,
            poster: m.poster,
            description: m.description,
            releaseInfo: m.date
        })) };
    }
});

// Catálogo para Series
builder.defineCatalogHandler(async (args) => {
    if (args.type === 'series') {
        const series = await fetchCatalog('series');
        return { metas: series.map(s => ({
            id: s.link,
            type: 'series',
            name: s.title,
            poster: s.poster,
            description: s.description,
            releaseInfo: s.date
        })) };
    }
});

// Catálogo para Packs/Otros
builder.defineCatalogHandler(async (args) => {
    if (args.type === 'other') {
        const packs = await fetchCatalog('packs');
        return { metas: packs.map(p => ({
            id: p.link,
            type: 'other',
            name: p.title,
            poster: p.poster,
            description: p.description,
            releaseInfo: p.date
        })) };
    }
});

// Servidor Express para Render
app.get('/', (req, res) => res.send('Servidor del addon escuchando en el puerto ' + PORT));
app.get('/manifest.json', (req, res) => res.json(builder.getManifest()));
app.get('/stream/:id', async (req, res) => {
    // Aquí podrías añadir streams reales si quieres que Stremio los reproduzca
    res.json([]);
});
app.get('/meta/:type/:id', async (req, res) => {
    // Podrías cargar datos específicos si quieres detalles
    res.json({});
});

// Mantener servidor activo
app.listen(PORT, () => console.log(`Servidor del addon escuchando en el puerto ${PORT}`));
