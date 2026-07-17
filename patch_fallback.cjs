const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true, // <--- ADD THIS LINE HERE
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }`;

const replacementStr = `  const distPath = path.join(process.cwd(), "dist");

  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found or failed to start, falling back to static files.");
      app.use(express.static(distPath));
    }
  } else {
    // Serve static files in production
    app.use(express.static(distPath));
  }

  // ALWAYS fallback to index.html for GET requests that accept HTML
  // This ensures SPA routing works even if NODE_ENV is misconfigured in Docker
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          next();
        }
      });
    } else {
      next();
    }
  });`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched fallback');
} else {
  console.log('Target string not found');
}
