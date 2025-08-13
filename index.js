const { addonBuilder } = require('stremio-addon-sdk');

// Manifest del addon
const manifest = {
    id: 'org.example.myaddon',
    version: '1.0.0',
    name: 'Mi Addon',
    description: 'Addon de ejemplo para Stremio',
    resources: ['catalog', 'stream'], // ✅ Ahora es un array
    types: ['movie', 'series'],       // ✅ También array
    idPrefixes: ['tt'],               // ✅ Si usas, debe ser array
    catalogs: [
        {
            type: 'movie',
            id: 'top_movies',
            name: 'Top Movies'
        }
    ]
};

// Creamos el addon
const builder = new addonBuilder(manifest);

// Ejemplo de manejo de catálogo
builder.defineCatalogHandler(args => {
    return Promise.resolve({ metas: [] }); // Aquí devuelves tus películas/series
});

// Ejemplo de manejo de stream
builder.defineStreamHandler(args => {
    return Promise.resolve({ streams: [] }); // Aquí devuelves tus links de streaming
});

// Iniciamos el servidor
module.exports = builder.getInterface();
