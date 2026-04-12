const fs = require("fs");
const path = require("path");

const outputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("dist");
const indexPath = path.join(outputDir, "index.html");

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing exported index.html at ${indexPath}`);
}

const META_BLOCK = `
    <meta name="theme-color" content="#86100E" />
    <meta name="description" content="Request emergency help, find a hospital, and track response in iVisit." />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="iVisit" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

const STYLE_BLOCK = `
    <style id="ivisit-web-shell">
      html, body {
        background: #F5F7FB;
      }

      @media (prefers-color-scheme: dark) {
        html, body {
          background: #060B16;
        }
      }
    </style>`;

const SCRIPT_BLOCK = `
  <script>
    if ('serviceWorker' in navigator) {
      var isLocalReviewHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
      if (isLocalReviewHost) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          registrations.forEach(function (registration) {
            registration.unregister().catch(function () {});
          });
        });
      } else {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    }
  </script>`;

let html = fs.readFileSync(indexPath, "utf8");

html = html.replace(
  /<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"\s*\/>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />'
);

if (!html.includes("manifest.webmanifest")) {
  html = html.replace("</head>", `${META_BLOCK}\n${STYLE_BLOCK}\n  </head>`);
}

if (!html.includes("navigator.serviceWorker.register('/sw.js')")) {
  html = html.replace("</body>", `${SCRIPT_BLOCK}\n</body>`);
}

fs.writeFileSync(indexPath, html);
console.log(`[postprocess_web_export] Updated ${indexPath}`);
