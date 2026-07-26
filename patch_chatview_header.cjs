const fs = require('fs');
let code = fs.readFileSync('src/components/Chat/ChatView.tsx', 'utf8');

const headerToRemove = /<div className="flex-none mb-4">\n\s*<h1 className="text-2xl font-bold text-white mb-1">Live Chat<\/h1>\n\s*<p className="text-zinc-400">Communicate with your team in real-time\.<\/p>\n\s*<\/div>/;

if (code.match(headerToRemove)) {
    code = code.replace(headerToRemove, '');
    console.log("Header removed");
} else {
    console.log("Failed to match header");
}

fs.writeFileSync('src/components/Chat/ChatView.tsx', code);
