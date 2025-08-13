const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');

const app = express();
const PORT = process.env.PORT || 7000;

// Cache simple en memoria
const cache = {};

async function getCached(key, fetchFn, ttl = 3600) {
  const now = Date.now();
  if (cache[key] && (now - cache[key].timestamp < ttl * 1000)) {
    return cache[key].data;
  }
  const data = await fetchFn();
  cache[key] = { data, timestamp: now };
  return data;
}

// Tu función para obtener el catálogo
async function fetchCatalog() {
  // Aquí tu lógica real para obtener el catálogo
  return [
    {
      id: 'movie_example',
      type: 'movie',
      name: 'Película de prueba',
      poster: 'https://via.placeholder.com/300x450',
      description: 'Descripción de ejemplo',
    },
  ];
}

// Tu función para obtener streams de un contenido
async function fetchStreams(args) {
  // Aquí tu lógica real para streams
  return [
    {
      title: 'Stream de prueba',
      url: 'https://example.com/video.mp4',
      subtitles: [],
    },
  ];
}

async function startAddon() {
  const manifest = {
    id: 'miaddongay',
    version: '1.0.0',
    name: 'Mi Addon Gay',
    description: 'Addon rápido y optimizado',
    resources: ['catalog', 'stream'],
    types: ['movie', 'series'],
    catalogs: await fetchCatalog(),
  };

  const builder = new addonBuilder(manifest);

  builder.defineCatalogHandler(async (args) => {
    const metas = await getCached('catalogs', fetchCatalog);
    return { metas };
  });

  builder.defineStreamHandler(async (args) => {
    const streams = await getCached(`streams_${args.id}`, () => fetchStreams(args));
    return { streams };
  });

  const addon = builder.getInterface();

  app.get('/manifest.json', (req, res) => res.json(addon.manifest));
  app.use('/addon', (req, res) => addon.middleware(req, res));

  app.listen(PORT, () => console.log(`Addon escuchando en http://localhost:${PORT}`));
}

// Arrancamos el addon
startAddon().catch(err => console.error('Error iniciando addon:', err));
