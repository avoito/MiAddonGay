// index.js — Addon Stremio para gay-torrents.net (login + relogin + 10 páginas + caché)

const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axiosLib = require("axios");
const { wrapper: axiosCookieJarSupport } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const cheerio = require("cheerio");

// ======= CONFIGURACIÓN =======
const GT_BASE = "https://www.gay-torrents.net";
const LOGIN_POSTS = [
  "/takelogin.php",  // común en engines tipo TBDev
  "/login.php"       // fallback
];

const USERNAME = process.env.GT_USERNAME;
const PASSWORD = process.env.GT_PASSWORD;
const MAX_PAGES = 10;            // páginas a scrapear
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

if (!USERNAME || !PASSWORD) {
  console.error("ERROR: Debes configurar GT_USERNAME y GT_PASSWORD en Render.");
  process.exit(1);
}

// ======= AXIOS + COOKIES =======
const jar = new CookieJar();
const axios = axiosCookieJarSupport(axiosLib.create({
  baseURL: GT_BASE,
  jar,
  withCredentials: true,
  headers: {
    "User-Agent": "Mozilla/5.0 (Addon Stremio / Render)",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
  },
  // Permitimos 302 durante login
  maxRedirects: 0,
  validateStatus: (s) => (s >= 200 && s < 400)
}));

let lastLoginAt = 0;

// ======= LOGIN + RE-LOGIN =======
async function doLogin() {
  // limpiamos cookies
  await new Promise((res) => jar.removeAllCookies(res));
  let ok = false;
  for (const path of LOGIN_POSTS) {
    try {
      const resp = await axios.post(path, new URLSearchParams({
        username: USERNAME,
        password: PASSWORD,
        // algunos sitios requieren campos como 'login' o 'submit'
        login: "Login",
        submit: "Login"
      }).toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (resp.status === 302 || resp.status === 200) {
        ok = true;
        break;
      }
    } catch (e) {
      // ignoramos e intentamos con el siguiente endpoint
    }
  }
  if (!ok) throw new Error("No se pudo iniciar sesión en gay-torrents.net");
  lastLoginAt = Date.now();
}

async function ensureSession(getUrl) {
  try {
    const r = await axios.get(getUrl);
    if (looksLikeLoginPage(r.data)) {
      await doLogin();
      return await axios.get(getUrl);
    }
    return r;
  } catch (err) {
    // si 401/403 o redirección a login -> relogin y reintento
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      await doLogin();
      return await axios.get(getUrl);
    }
    // si redirige (3xx) a login
    if (err.response && err.response.status >= 300 && err.response.status < 400) {
      await doLogin();
      return await axios.get(getUrl);
    }
    throw err;
  }
}

function looksLikeLoginPage(html) {
  if (!html) return false;
  const $ = cheerio.load(html);
  const bodyText = $("body").text().toLowerCase();
  return bodyText.includes("login") || bodyText.includes("sign in") || $("form[action*='login']").length > 0;
}

// ======= SCRAPING =======
async function fetchListPage(page) {
  // intentamos rutas típicas
  const candidates = [
    `/browse.php?page=${page}`,
    `/torrents.php?page=${page}`
  ];

  let html = null;
  for (const path of candidates) {
    try {
      const resp = await ensureSession(path);
      html = resp.data;
      break;
    } catch (_) {
      // probamos siguiente
    }
  }
  if (!html) return [];

  const $ = cheerio.load(html);
  const rows = [];

  // Estrategia: buscar filas con enlaces a detalles tipo "details.php?id="
  // y, si hay, extraer campos colindantes (título, tamaño, fecha, seeds/peers, imagen)
  $("a[href*='details.php?id=']").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") || "";
    const idMatch = href.match(/details\.php\?id=(\d+)/);
    const detailsId = idMatch ? idMatch[1] : null;

    // título
    const title = $a.text().trim() || $a.attr("title") || `Torrent ${detailsId || ""}`.trim();

    // intentamos subir al contenedor (tr) para pillar más columnas
    const tr = $a.closest("tr");
    // tamaño
    const size = tr.find("td:contains('GB'), td:contains('MB'), td.size, .torrent_size").first().text().trim();
    // fecha
    const date = tr.find("td:contains('202'), td:contains('-'), td.added, .torrent_added").first().text().trim();
    // seeds/peers (si aparecen)
    const seeds = tr.find("td:contains('seed'), td.seeds, .seeds").first().text().trim();
    const leech = tr.find("td:contains('lee'), td.leech, .leeches, .peers").first().text().trim();

    // poster/miniatura si hay IMG en la fila
    let poster = tr.find("img").attr("src") || "";
    if (poster && poster.startsWith("//")) poster = "https:" + poster;
    if (poster && poster.startsWith("/")) poster = GT_BASE + poster;

    rows.push({
      detailsId,
      title,
      size,
      date,
      seeds,
      leech,
      poster: poster || undefined
    });
  });

  return rows;
}

async function fetchDetailsAndMagnet(detailsId) {
  // Cargamos la página de detalles para intentar conseguir magnet, sinopsis e imagen mejor
  const detailsPath = `/details.php?id=${detailsId}`;
  const resp = await ensureSession(detailsPath);
  const $ = cheerio.load(resp.data);

  // magnet
  let magnet = $("a[href^='magnet:']").attr("href") || null;
  // .torrent directo (fallback)
  if (!magnet) {
    const dl = $(`a[href*='download.php?id=${detailsId}']`).attr("href");
    if (dl) magnet = GT_BASE + (dl.startsWith("/") ? dl : "/" + dl);
  }

  // sinopsis / descripción (recortamos para no pasar de largo)
  const desc = $("div.description, #description, .descr, .description").first().text().trim();
  const description = desc ? desc.substring(0, 800) : undefined;

  // poster mejor dentro de detalles, si existe
  let poster = $("img.cover, .poster img, .cover img, img[alt*='cover'], img[alt*='poster']").first().attr("src") || null;
  if (poster && poster.startsWith("//")) poster = "https:" + poster;
  if (poster && poster.startsWith("/")) poster = GT_BASE + poster;

  return { magnet, description, poster };
}

// ======= CACHÉ =======
let cache = { metas: [], at: 0 };

async function buildCatalog() {
  // si el caché es reciente, devolvemos
  if (cache.metas.length && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.metas;
  }

  // Aseguramos sesión
  await doLogin();

  const metas = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    try {
      const items = await fetchListPage(p);
      for (const it of items) {
        if (!it.detailsId) continue;
        // detalle para magnet/sinopsis/poster
        let magnet = null, description = undefined, poster = it.poster;
        try {
          const det = await fetchDetailsAndMagnet(it.detailsId);
          magnet = det.magnet || null;
          description = det.description || undefined;
          if (det.poster) poster = det.poster;
        } catch (_) {
          // si falla el detalle, seguimos con lo que tenemos
        }

        const id = `gtnet:${it.detailsId}`;
        metas.push({
          id,
          type: "movie",
          name: it.title || `Torrent ${it.detailsId}`,
          poster,
          description,
          releaseInfo: [it.size, it.date, (it.seeds ? `S:${it.seeds}` : ""), (it.leech ? `L:${it.leech}` : "")]
            .filter(Boolean).join(" | "),
          // guardamos "hints" útiles para el stream handler
          behaviorHints: {
            bgt_magnet: magnet || null
          }
        });
      }
    } catch (e) {
      // si una página falla, continuamos con las demás
      console.error(`Error al scrapear página ${p}:`, e.message);
    }
  }

  // actualizamos caché
  cache = { metas, at: Date.now() };
  return metas;
}

// ======= STREMIO MANIFEST + HANDLERS =======
const manifest = {
  id: "org.gaytorrents.addon",
  version: "1.0.0",
  name: "Gay Torrents (10 páginas)",
  description: "Addon (privado) que lista torrents de gay-torrents.net con login y re-login automático.",
  catalogs: [
    {
      type: "movie",
      id: "gay_torrents_catalog",
      name: "Gay Torrents (últimas 10 páginas)"
    }
  ],
  types: ["movie"],
  resources: ["catalog", "stream"],
  idPrefixes: ["gtnet:"]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ id, type }) => {
  if (id !== "gay_torrents_catalog" || type !== "movie") return { metas: [] };
  try {
    const metas = await buildCatalog();
    return { metas };
  } catch (e) {
    console.error("Error en catalogHandler:", e);
    return { metas: [] };
  }
});

builder.defineStreamHandler(async ({ id }) => {
  // id viene en forma "gtnet:12345" (detailsId)
  const detailsId = (id || "").replace("gtnet:", "");
  if (!detailsId) return { streams: [] };

  try {
    // si el meta ya traía magnet en behaviorHints y sigue en caché, úsalo
    const fromCache = cache.metas.find(m => m.id === id);
    let magnet = fromCache && fromCache.behaviorHints && fromCache.behaviorHints.bgt_magnet;

    if (!magnet) {
      // buscamos en detalles
      const det = await fetchDetailsAndMagnet(detailsId);
      magnet = det.magnet || null;
    }

    if (!magnet) {
      // último fallback: .torrent
      const torrentUrl = `${GT_BASE}/download.php?id=${detailsId}`;
      return {
        streams: [
          { title: "Descargar .torrent", url: torrentUrl, behaviorHints: { notWebReady: true } }
        ]
      };
    }

    return {
      streams: [
        { title: "Magnet (Gay Torrents)", url: magnet }
      ]
    };
  } catch (e) {
    console.error("Error en streamHandler:", e);
    return { streams: [] };
  }
});

// ======= SERVIDOR HTTP =======
const addonInterface = builder.getInterface();
const PORT = process.env.PORT || 10000;

serveHTTP(addonInterface, { port: PORT }).then(({ url }) => {
  console.log(`Addon en ${url}/manifest.json`);
}).catch(err => {
  console.error("Error al iniciar servidor:", err);
});

// ======= SEGURIDAD: no tumbar el proceso por errores no capturados =======
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
