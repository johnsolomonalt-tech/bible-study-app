const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = code.replace(
  /<Panel defaultSize=\{75\} minSize=\{20\} className="flex flex-col relative">/g,
  '<Panel defaultSize="75" minSize="30" className="flex flex-col relative">'
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
