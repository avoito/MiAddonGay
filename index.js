const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");

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

// Cargamos usuario y contraseña desde variables de entorno (Render)
const USERNAME = process.env.GAY_TORRENTS_USER;
const PASSWORD = process.env.GAY_TORRENTS_PASS;

if (!USERNAME || !PASSWORD) {
    console.error("ERROR: No se han configurado GAY_TORRENTS_USER y/o GAY_TORRENTS_PASS en las variables de entorno.");
    process.exit(1);
}

const builder = new addonBuilder(manifest);

// Catálogo
builder.defineCatalogHandler(async (args) => {
    try {
        // Ejemplo: petición para loguearse en gay-torrents.net
        await axios.post("https://www.gay-torrents.net/login.php", {
            username: USERNAME,
            password: PASSWORD
        });

        // Aquí iría la lógica real para scrapear o leer torrents
        // Ejemplo de respuesta estática para pruebas:
        return Promise.resolve({
            metas: [
                {
                    id: "pelicula1",
                    type: "movie",
                    name: "Ejemplo Película",
                    poster: "https://via.placeholder.com/150",
                    description: "Descripción de prueba"
                }
            ]
        });

    } catch (err) {
        console.error("Error en defineCatalogHandler:", err);
        return Promise.resolve({ metas: [] });
    }
});

// Metadata
builder.defineMetaHandler(async (args) => {
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "movie",
            name: "Ejemplo Película",
            poster: "https://via.placeholder.com/150",
            description: "Descripción de prueba"
        }
    });
});

// Streams
builder.defineStreamHandler(async (args) => {
    return Promise.resolve({
        streams: [
            {
                title: "Torrent Ejemplo",
                infoHash: "1234567890abcdef1234567890abcdef12345678"
            }
        ]
    });
});

module.exports = builder.getInterface();
