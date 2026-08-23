const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = code.replace(/max-lg:!basis-full max-lg:!flex-auto/g, 'max-lg:!flex-none max-lg:!w-full max-lg:!min-w-full max-lg:!h-full max-lg:!min-h-full');

fs.writeFileSync('frontend/src/app/page.tsx', code);
