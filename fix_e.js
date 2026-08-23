const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = code.replace(
  /const textToSend = overrideText \|\| chatInput;\n\s*e\.preventDefault\(\);/,
  `const textToSend = overrideText || chatInput;`
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
