const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="px-5 py-2 text-[10px] text-zinc-500/50 font-mono text-left tracking-wide select-none">
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'} (Auto-Update Verified! ✅)
          </div>`;

const replacement = `<div 
            className="px-5 py-2 text-[10px] text-zinc-500/50 font-mono text-left tracking-wide select-none cursor-pointer hover:text-white transition-colors"
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

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx SW reset!");
} else {
    console.log("Could not find SW reset block!");
}
