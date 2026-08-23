const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

code = code.replace(
  /\{\/\* DESKTOP STUDY TAB \(With Resizable Panels\) \*\/\}\n\s*\{activeTab === 'study' && \(\n\s*<PanelGroup orientation="horizontal" id="theologica-layout-v2" className="hidden lg:flex w-full h-full">/,
  `{/* DESKTOP STUDY TAB (With Resizable Panels) */}
        {activeTab === 'study' && (
          <div className="hidden lg:flex w-full h-full">
            <PanelGroup orientation="horizontal" id="theologica-layout-v2" className="flex w-full h-full">`
);

code = code.replace(
  /\s*<\/Panel>\n\s*\)\}\n\s*<\/PanelGroup>\n\s*\)\}/,
  `\n              </Panel>\n            )}\n          </PanelGroup>\n          </div>\n        )}`
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
