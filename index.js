const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');

const ADDON_ID = 'gay-torrents-addon';
const ADDON_NAME = 'Gay Torrents';
const ADDON_VERSION = '1.0.0'; // ✅ Semver correcto
const BASE_URL = 'https://www.gay-torrents.net';
const USERNAME = process.env.GAY_TORRENTS_USER; // tu usuario en Render
const PASSWORD = process.env.GAY_TORRENTS_PASS; // tu contraseña en Render

let sessionCookie = null;

// Función de login / re-login
async function login() {
    const response = await axios.post(`${BASE_URL}/login`, {
        username: USERNAME,
        password: PASSWORD
    });
    if (response.headers['set-cookie']) {
        sessionCookie = response.headers['set-cookie'].join('; ');
        console.log('Login exitoso');
    } else {
        throw new Error('Login fallido');
    }
}

// Función para obtener torrents
async function fetchTorrents(page = 1) {
    if (!sessionCookie) await login();
    try {
        const res = await axios.get(`${BASE_URL}/torrents?page=${page}`, {
            headers: { Cookie: sessionCookie }
        });
        // Aquí deberías parsear res.data según la estructura de la web
        // Esto es un ejemplo genérico
        return res.data.torrents || [];
    } catch (err) {
        console.log('Error al obtener torrents, reintentando login...');
        await login();
        return fetchTorrents(page);
    }
}

// Construimos el addon
const builder = new addonBuilder({
    id: ADDON_ID,
    name: ADDON_NAME,
    version: ADDON_VERSION,
    description: 'Torrents para Stremio desde www.gay-torrents.net',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
});

// Catalog
builder.defineCatalogHandler(async ({ type, id }) => {
    let allTorrents = [];
    for (let page = 1; page <= 10; page++) {
        const torrents = await fetchTorrents(page);
        allTorrents = allTorrents.concat(torrents);
    }
    // Ordenamos por fecha descendente
    allTorrents.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Retornamos en el formato Stremio
    return { metas: allTorrents.map(t => ({
        id: t.id,
        name: t.title,
        type: type,
        description: t.description,
        genres: t.genres,
        releaseInfo: t.release,
        poster: t.poster
    }))};
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
    // Buscar el torrent exacto
    for (let page = 1; page <= 10; page++) {
        const torrents = await fetchTorrents(page);
        const torrent = torrents.find(t => t.id === id);
        if (torrent) {
            return {
                id: torrent.id,
                name: torrent.title,
                type: type,
                description: torrent.description,
                genres: torrent.genres,
                releaseInfo: torrent.release,
                poster: torrent.poster,
                streams: torrent.files.map(f => ({
                    title: f.name,
                    url: f.magnet,
                    infoHash: f.infoHash
                }))
            };
        }
    }
    return null;
});

// Exponemos el addon
module.exports = builder.getInterface();
