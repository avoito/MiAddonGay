const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");

// Leer variables de entorno desde Render
const USER = process.env.GAY_TORRENTS_USER;
const PASS = process.env.GAY_TORRENTS_PASS;

if (!USER || !PASS) {
    console.error("ERROR: No se han configurado GAY_TORRENTS_USER y/o GAY_TORRENTS_PASS en las variables de entorno.");
    process.exit(1);
}

console.log("Usuario (Render):", USER);
console.log("Contraseña (Render):", PASS);

// Definir el manifest con catalogs como array válido
const manifest = {
    id: "org.gaytorrents.addon",
    version: "1.0.0",
    name: "Gay Torrents Private Addon",
    description: "Addon privado para acceder a Gay Torrents con usuario y contraseña",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    idPrefixes: ["gt_"],
    catalogs: [
        {
            type: "movie",
            id: "gaytorrents-movies",
            name: "Gay Torrents Movies"
        },
        {
            type: "series",
            id: "gaytorrents-series",
            name: "Gay Torrents Series"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Handler de catálogo (ejemplo básico)
builder.defineCatalogHandler(({ type, id }) => {
    console.log(`Solicitud de catálogo: tipo=${type}, id=${id}`);

    // Ejemplo: respuesta vacía (puedes rellenar con datos reales)
    return Promise.resolve({ metas: [] });
});

// Handler de stream (ejemplo básico)
builder.defineStreamHandler(({ type, id }) => {
    console.log(`Solicitud de stream: tipo=${type}, id=${id}`);

    // Ejemplo: sin streams (debes implementar la lógica real si quieres mostrar torrents)
    return Promise.resolve({ streams: [] });
});

// Exportar el addon
module.exports = builder.getInterface();
