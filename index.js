const { addonBuilder } = require('stremio-addon-sdk');

// Cache en memoria
const cache = {
  catalogs: {},
  streams: {},
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Función para obtener datos con cache
async function getCached(key, fetchFunc) {
  const now = Date.now();
  if (cache[key].data && (now - cache[key].timestamp < CACHE_TTL)) {
    return cache[key].data;
  }
  const data = await fetchFunc();
  cache[key] = { data, timestamp: now };
  return data;
}

// Ejemplo de función que obtiene catálogo (modifica según tu fuente real)
async function fetchCatalog() {
  // Aquí va tu lógica real de catálogo
  return [
    { id: 'movies', type: 'movie', name: 'Películas Populares' }
  ];
}

// Ejemplo de función que obtiene streams (modifica según tu fuente real)
async function fetchStreams({ type, id }) {
  // Aquí va tu lógica real de streams
  return [
    { title: 'Ejemplo Stream', url: 'https://url-a-tu-video.com/stream.mp4', subtitles: [] }
  ];
}

// Creamos el addon una sola vez
const manifest = {
  id: 'miaddongay',
  version: '1.0.0',
  name: 'Mi Addon Gay',
  description: 'Addon rápido y optimizado',
  resources: ['catalog', 'stream'],
  types: ['movie', 'series'],
  catalogs: await fetchCatalog(), // inicializamos al inicio
};

const builder = new addonBuilder(manifest);

// Definimos handler para catálogo
builder.defineCatalogHandler(async (args) => {
  return { metas: await getCached('catalogs', fetchCatalog) };
});

// Definimos handler para streams
builder.defineStreamHandler(async (args) => {
  return { streams: await getCached(`streams_${args.id}`, () => fetchStreams(args)) };
});

// Exportamos el addon
module.exports = builder.getInterface();

// Para ejecutar directamente con node
if (require.main === module) {
  const addon = builder.getInterface();
  const express = require('express');
  const app = express();
  app.use('/manifest.json', (req, res) => res.json(addon.manifest));
  app.use('/addon', (req, res) => addon.middleware(req, res));
  const port = process.env.PORT || 7000;
  app.listen(port, () => console.log(`Addon escuchando en http://localhost:${port}`));
}
