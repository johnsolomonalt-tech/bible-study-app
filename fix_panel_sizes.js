const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// Left panel
code = code.replace(
  /<Panel panelRef=\{leftPanelRef\} defaultSize=\{25\} minSize=\{20\}/g,
  '<Panel panelRef={leftPanelRef} defaultSize="20" minSize="20"'
);

// Middle panel
code = code.replace(
  /<Panel defaultSize=\{45\} minSize=\{15\}/g,
  '<Panel defaultSize="50" minSize="30"'
);

// Bottom panel
code = code.replace(
  /<Panel panelRef=\{bottomPanelRef\} defaultSize=\{25\} minSize=\{20\}/g,
  '<Panel panelRef={bottomPanelRef} defaultSize="25" minSize="20"'
);

// Right panel
code = code.replace(
  /<Panel panelRef=\{rightPanelRef\} defaultSize=\{30\} minSize=\{25\}/g,
  '<Panel panelRef={rightPanelRef} defaultSize="30" minSize="25"'
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
