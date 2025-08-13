const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');

const USER = process.env.GAY_TORRENTS_USER;
const PASS = process.env.GAY_TORRENTS_PASS;

if (!USER || !PASS) {
    console.error('Faltan variables de entorno GAY_TORRENTS_USER y/o GAY_TORRENTS_PASS');
    process.exit(1);
}

const manifest = {
    id: 'org.gaytorrents.addon',
    version: '1.0.0',
    name: 'Gay Torrents',
    description: 'Catálogo con torrents desde gay-torrents.net',
    resources: ['catalog', 'stream'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'gaytorrents',
            name: 'Gay Torrents'
        }
    ]
};

const builder = new addonBuilder(manifest);

let cookies = '';

async function login() {
    try {
        const res = await axios.post(
            'https://gay-torrents.net/login.php',
            new URLSearchParams({
                username: USER,
                password: PASS,
                login: 'Login'
            }),
            { maxRedirects: 0, validateStatus: s => s < 400 }
        );
        cookies = res.headers['set-cookie'].join('; ');
        console.log('✅ Login correcto');
    } catch (err) {
        console.error('❌ Error al iniciar sesión:', err.message);
    }
}

async function fetchTorrents() {
    try {
        const res = await axios.get('https://gay-torrents.net/torrents.php', {
            headers: { Cookie: cookies }
        });
        const $ = cheerio.load(res.data);
        const items = [];

        $('table tr').each((i, el) => {
            const title = $(el).find('td a b').text().trim();
            const link = $(el).find('td a').attr('href');
            if (title && link) {
                items.push({
                    id: link,
                    type: 'movie',
                    name: title,
                    poster: 'https://via.placeholder.com/200x300?text=GT', // Placeholder
                    posterShape: 'regular',
                    description: 'Torrent desde gay-torrents.net'
                });
            }
        });

        return items;
    } catch (err) {
        console.error('❌ Error al obtener torrents:', err.message);
        return [];
    }
}

builder.defineCatalogHandler(async ({ type, id }) => {
    console.log(`📥 Catálogo solicitado: ${id}`);
    if (!cookies) await login();
    const items = await fetchTorrents();
    return { metas: items };
});

builder.defineStreamHandler(async ({ id }) => {
    const url = `https://gay-torrents.net/${id}`;
    return {
        streams: [
            {
                title: 'Descargar Torrent',
                url
            }
        ]
    };
});

module.exports = builder.getInterface();
