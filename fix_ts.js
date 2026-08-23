const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = code.replace(
  /if \(node\.getAttribute && node\.getAttribute\('data-verse'\)\) \{/g,
  `if (node instanceof HTMLElement && node.getAttribute('data-verse')) {`
);

code = code.replace(
  /verseNumber = parseInt\(node\.getAttribute\('data-verse'\), 10\);/g,
  `verseNumber = parseInt(node.getAttribute('data-verse')!, 10);`
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
