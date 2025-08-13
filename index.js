const axios = require('axios');
const { addonBuilder } = require('stremio-addon-sdk');

// Depuración: ver si las variables llegan desde Render
console.log("Usuario (Render):", process.env.GAY_TORRENTS_USER);
console.log("Contraseña (Render):", process.env.GAY_TORRENTS_PASS);

// Verificar variables
if (!process.env.GAY_TORRENTS_USER || !process.env.GAY_TORRENTS_PASS) {
    console.error("ERROR: No se han configurado GAY_TORRENTS_USER y/o GAY_TORRENTS_PASS en las variables de entorno.");
    process.exit(1);
}

const GAY_TORRENTS_USER = process.env.GAY_TORRENTS_USER;
const GAY_TORRENTS_PASS = process.env.GAY_TORRENTS_PASS;

const builder = new addonBuilder({
    id: "org.gaytorrents.addon",
    version: "1.0.0",
    name: "Gay Torrents Private Addon",
    description: "Addon privado para acceder a Gay Torrents con usuario y contraseña",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["gt_"]
});

builder.defineCatalogHandler(({ type, id }) => {
    console.log(`Solicitando catálogo: ${type}, id: ${id}`);
    // Aquí deberías poner tu lógica para obtener el catálogo desde Gay Torrents
    return Promise.resolve({ metas: [] });
});

builder.defineStreamHandler(({ type, id }) => {
    console.log(`Solicitando stream para: ${id}`);
    // Aquí deberías poner la lógica para obtener el torrent desde Gay Torrents
    return Promise.resolve({ streams: [] });
});

const addonInterface = builder.getInterface();
require("http").createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    addonInterface(req, res);
}).listen(process.env.PORT || 7000, () => {
    console.log("Addon iniciado en puerto " + (process.env.PORT || 7000));
});
