const keys = Object.keys(process.env).filter(k => k.toLowerCase().includes('map') || k.toLowerCase().includes('goog'));
console.log(keys);
