const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const addon = new addonBuilder({
    id: "org.tusaddons.torrents",
    version: "1.0.0",
    name: "Torrents Mejorado",
    description: "Addon Stremio con cache y prefetch de torrents"
});

// Cache en memoria (puedes reemplazar con archivo JSON si quieres persistencia)
let cache = {
    movies: {}, // { imdbId: [ { title, magnet, seeds, size }, ... ] }
};
const MAX_CACHE = 50;

// Función para mantener la cache corta
function updateCache(imdbId, torrents) {
    cache.movies[imdbId] = torrents.slice(0, 10); // guardamos los 10 mejores
    // Limitar tamaño total
    const keys = Object.keys(cache.movies);
    if(keys.length > MAX_CACHE){
        delete cache.movies[keys[0]];
    }
}

// Función para obtener torrents (simulada, reemplaza con tu scraper actual)
async function fetchTorrents(imdbId) {
    // Si está en cache, devolvemos inmediatamente
    if(cache.movies[imdbId]){
        return cache.movies[imdbId];
    }

    // Ejemplo: fetch de API o scraping
    const response = await fetch(`https://api.example.com/torrents/${imdbId}`);
    const data = await response.json();

    // Pre-fetch magnets (solo primeros 5 para no saturar)
    const topTorrents = data.slice(0,5).map(t => ({
        title: t.title,
        magnet: t.magnet,
        seeds: t.seeds,
        size: t.size
    }));

    // Guardar en cache
    updateCache(imdbId, topTorrents);

    return topTorrents;
}

// Stream handler
addon.defineStreamHandler(async (args) => {
    const imdbId = args.id.replace("tt", ""); // ejemplo de conversión
    const torrents = await fetchTorrents(imdbId);

    // Convertimos a formato Stremio
    return torrents.map(t => ({
        title: t.title,
        infoHash: t.magnet.match(/urn:btih:([a-zA-Z0-9]+)/)[1],
        type: "torrent",
        magnet: t.magnet,
        seeds: t.seeds,
        size: t.size
    }));
});

// Manifest (catálogo simplificado)
addon.defineCatalogHandler(async (args) => {
    return { metas: [] }; // opcional, puedes agregar catálogo
});

module.exports = addon.getInterface();
