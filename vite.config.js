import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `netlify dev` defaults to 8888; override with FUNCTIONS_ORIGIN if it picks
// another port, or if you run the functions somewhere else.
const FUNCTIONS_ORIGIN = process.env.FUNCTIONS_ORIGIN || 'http://localhost:8888';

/* The /api/* routes are Netlify Functions. `netlify dev` serves them on 8888;
   plain `vite dev` has nothing there.

   Vite's built-in `server.proxy` prints an ECONNREFUSED stack trace for every
   such request and its logging can't be turned off, so we forward the requests
   ourselves. When the functions are up this behaves like the proxy did; when
   they aren't, callers get a clean 503 and the terminal gets one line.

   The app already treats a failed /api/questions as "read Supabase directly",
   so the quizzes work either way.

   IMPORTANT — when running `npm run dev:netlify`, browse http://localhost:5173
   (this Vite server), NOT http://localhost:8888 (Netlify Dev's outer proxy).
   Netlify Dev applies netlify.toml's headers — including the CSP — to
   everything it proxies through :8888, and that CSP blocks the inline
   Fast-Refresh preamble @vitejs/plugin-react injects in dev, which crashes
   every component module ("can't detect preamble"). :5173 has no such
   header enforcement, and this very middleware already forwards its /api/*
   requests to :8888 for you, so you get working functions AND a working app
   from the one URL. This has no effect on `npm run build` / production,
   which injects no preamble script at all. */
function netlifyFunctionsDev() {
  let announced = false;

  return {
    name: 'labobo:netlify-functions-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const url = FUNCTIONS_ORIGIN + '/api' + req.url;

        // Buffer the body so POSTs (supa-insert) forward intact.
        let body;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          body = Buffer.concat(chunks);
        }

        const headers = { ...req.headers };
        delete headers.host;
        delete headers.connection;

        try {
          const upstream = await fetch(url, { method: req.method, headers, body });
          res.statusCode = upstream.status;
          upstream.headers.forEach((value, key) => {
            if (key !== 'content-encoding' && key !== 'content-length') {
              res.setHeader(key, value);
            }
          });
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          if (!announced) {
            announced = true;
            server.config.logger.info(
              '\n  \x1b[33m➜\x1b[0m  /api/* is not served here — run `npm run dev:netlify` for the Netlify Functions.' +
              '\n     Questions load straight from Supabase instead; announcements and the leaderboard need it.\n'
            );
          }
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Netlify Functions are not running in this dev server.' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), netlifyFunctionsDev()],
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    sourcemap: 'hidden', // maps are generated for debugging but not linked from the bundles
  },
});
