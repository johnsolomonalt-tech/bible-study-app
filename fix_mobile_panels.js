const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// 1. Left Panel
code = code.replace(
  /<Panel panelRef=\{leftPanelRef\} defaultSize="15" minSize="15" className={`w-full/g,
  '<Panel panelRef={leftPanelRef} defaultSize="15" minSize="15" className={`max-lg:!basis-full max-lg:!flex-auto w-full'
);

// 2. Center Panel
code = code.replace(
  /<Panel defaultSize="60" minSize="30" className={`w-full/g,
  '<Panel defaultSize="60" minSize="30" className={`max-lg:!basis-full max-lg:!flex-auto w-full'
);

// 3. Top Reader Panel
code = code.replace(
  /<Panel defaultSize="75" minSize="30" className="flex flex-col relative">/g,
  '<Panel defaultSize="75" minSize="30" className="max-lg:!basis-full max-lg:!flex-auto flex flex-col relative">'
);

// 4. Bottom Notes Panel
code = code.replace(
  /<Panel panelRef=\{bottomPanelRef\} defaultSize="25" minSize="20" className="border-t border-\[#30302e\] bg-\[#141413\] flex flex-col shrink-0">/g,
  '<Panel panelRef={bottomPanelRef} defaultSize="25" minSize="20" className="hidden lg:flex border-t border-[#30302e] bg-[#141413] flex-col shrink-0">'
);

// 5. Right Panel
code = code.replace(
  /<Panel panelRef=\{rightPanelRef\} defaultSize="25" minSize="20" className={`w-full/g,
  '<Panel panelRef={rightPanelRef} defaultSize="25" minSize="20" className={`max-lg:!basis-full max-lg:!flex-auto w-full'
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
