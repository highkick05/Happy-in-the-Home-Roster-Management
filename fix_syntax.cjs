const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// I just need to fix the syntax error at 16077. It complains about `},`. 
// It could be that the block didn't close properly, or it closed too many times.
