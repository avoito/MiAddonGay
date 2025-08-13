const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
    id: "org.gay.torrents.addon",
    version: "1.0.0",
    name: "Gay Torrents",
    description: "Addon para ver contenido desde gay-torrents.net",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs: [
        {
            type: "movie",
            id: "gay_torrents_catalog",
            name: "Gay Torrents"
        }
    ]
};

const builder = new addonBuilder(manifest);

// Handler para catálogo
builder.defineCatalogHandler(args => {
    console.log("Catalog request:", args);

    return Promise.resolve({
        metas: [
            {
                id: "gay_movie_1",
                type: "movie",
                name: "Gay Movie Ejemplo",
                poster: "https://via.placeholder.com/150x220.png?text=Gay+Movie",
                description: "Película de ejemplo del addon gay-torrents.net",
                releaseInfo: "2025"
            },
            {
                id: "gay_movie_2",
                type: "movie",
                name: "Otro Ejemplo",
                poster: "https://via.placeholder.com/150x220.png?text=Otro+Ejemplo",
                description: "Segunda película de ejemplo",
                releaseInfo: "2024"
            }
        ]
    });
});

// Handler para metadatos
builder.defineMetaHandler(args => {
    console.log("Meta request:", args);

    return Promise.resolve({
        meta: {
            id: args.id,
            type: "movie",
            name: "Película de ejemplo",
            poster: "https://via.placeholder.com/150x220.png?text=Meta+Poster",
            background: "https://via.placeholder.com/600x400.png?text=Fondo",
            description: "Descripción detallada de la película.",
            releaseInfo: "2025"
        }
    });
});

// Handler para streams
builder.defineStreamHandler(args => {
    console.log("Stream request:", args);

    return Promise.resolve({
        streams: [
            {
                title: "Torrent desde gay-torrents.net",
                infoHash: "1234567890abcdef1234567890abcdef12345678"
            }
        ]
    });
});

const express = require("express");
const app = express();

// Rutas sin "?"
app.get("/:resource/:type/:id.json", (req, res) => {
    builder.getInterface().get(req, res);
});

app.get("/:resource/:type/:id/:extra.json", (req, res) => {
    builder.getInterface().get(req, res);
});

app.get("/manifest.json", (req, res) => {
    res.send(manifest);
});

app.listen(7000, () => {
    console.log("Addon funcionando en http://127.0.0.1:7000/manifest.json");
});
