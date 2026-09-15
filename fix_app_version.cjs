const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `            className="px-5 py-2 text-[10px] text-zinc-500/50 font-mono text-left tracking-wide select-none cursor-pointer hover:text-white transition-colors"
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }}
            title="Click to force update the app"
          >
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'} (Auto-Update Verified! ✅)
          </div>`;

const replacement = `            className="px-5 py-2 text-[10px] text-zinc-500/50 font-mono text-left tracking-wide select-none cursor-pointer hover:text-white transition-colors"
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for(let registration of registrations) {
                  await registration.unregister();
                }
              }
              // Clear all caches
              if ('caches' in window) {
                 const cacheNames = await caches.keys();
                 await Promise.all(cacheNames.map(name => caches.delete(name)));
              }
              // Hard reload the window bypassing the cache
              window.location.href = window.location.href.split('#')[0] + '?v=' + new Date().getTime();
            }}
            title="Click to force update the app"
          >
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'} (Force Reload)
          </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx reset button!");
} else {
    console.log("Could not find App.tsx SW reset button!");
}
