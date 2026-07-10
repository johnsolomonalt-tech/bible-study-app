const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = "const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';\n" + code;

// Replace fetch('/api/...') -> fetch(`${API_URL}/api/...`)
code = code.replace(/fetch\('(\/api\/[^']+)'/g, 'fetch(`${API_URL}$1`');

// Replace fetch(`/api/...`) -> fetch(`${API_URL}/api/...`)
code = code.replace(/fetch\(`(\/api\/[^`]+)`/g, 'fetch(`${API_URL}$1`');

fs.writeFileSync('frontend/src/app/page.tsx', code);
