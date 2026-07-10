const fs = require('fs');

// 1. Fix tsconfig.json
let tsconfig = fs.readFileSync('backend/tsconfig.json', 'utf8');
tsconfig = tsconfig.replace(/"verbatimModuleSyntax": true,/g, '"verbatimModuleSyntax": false,');
tsconfig = tsconfig.replace(/"module": "nodenext",/g, '"module": "CommonJS",\n    "moduleResolution": "node",');
fs.writeFileSync('backend/tsconfig.json', tsconfig);

// 2. Fix server.ts
let server = fs.readFileSync('backend/src/server.ts', 'utf8');
server = server.replace(/\.readingTracker\./g, '.tracker.');
server = server.replace(/orderBy: { updatedAt: 'desc' }/g, "orderBy: { createdAt: 'desc' }");
fs.writeFileSync('backend/src/server.ts', server);
