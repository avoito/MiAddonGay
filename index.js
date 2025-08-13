const { addonBuilder } = require("stremio-addon-sdk");

// Leer variables de entorno
const USER = process.env.GAY_TORRENTS_USER;
const PASS = process.env.GAY_TORRENTS_PASS;

if (!USER || !PASS) {
    console.error("ERROR: No se han configurado GAY_TORRENTS_USER y/o GAY_TORRENTS_PASS en las variables de entorno.");
    process.exit(1);
}

console.log("Usuario (Render):", USER);
console.log("Contraseña (Render):", PASS);

// Crear manifest
const manifest = {
    id: "org.gaytorrents.addon",
    version: "1.0.0",
    name: "Gay Torrents Addon",
    description: "Addon para Stremio con contenido de Gay Torrents",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "gaytorrents_catalog",
            name: "Gay Torrents Movies"
        }
    ]
};

// Crear addon
const builder = new addonBuilder(manifest);

// Catálogo básico de prueba
builder.defineCatalogHandler(() => {
    return Promise.resolve({
        metas: [
            {
                id: "movie1",
                type: "movie",
                name: "Película de prueba Gay Torrents",
                poster: "https://placehold.co/300x450"
            }
        ]
    });
});

// Streams de prueba
builder.defineStreamHandler(() => {
    return Promise.resolve({
        streams: [
            {
                title: "Stream de prueba",
                url: "https://www.example.com/video.mp4"
            }
        ]
    });
});

// Servidor HTTP para mantenerlo activo en Render
require("http")
    .createServer((req, res) => {
        builder.getInterface()(req, res);
    })
    .listen(process.env.PORT || 7000);

console.log(`Servidor del addon escuchando en el puerto ${process.env.PORT || 7000}`);
