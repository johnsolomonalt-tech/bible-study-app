const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// Revert button handlers
code = code.replace(
  /onClick=\{\(\) => \{ const p = leftPanelRef.current; if \(p\) \{ p.isCollapsed\(\) \? p.expand\(\) : p.collapse\(\); setShowLeftSidebar\(!p.isCollapsed\(\)\); \} \}\} /g,
  "onClick={() => setShowLeftSidebar(!showLeftSidebar)} "
);

code = code.replace(
  /onClick=\{\(\) => \{ const p = bottomPanelRef.current; if \(p\) \{ p.isCollapsed\(\) \? p.expand\(\) : p.collapse\(\); setShowBottomNotes\(!p.isCollapsed\(\)\); \} \}\} /g,
  "onClick={() => setShowBottomNotes(!showBottomNotes)} "
);

code = code.replace(
  /onClick=\{\(\) => \{ const p = rightPanelRef.current; if \(p\) \{ p.isCollapsed\(\) \? p.expand\(\) : p.collapse\(\); setShowRightSidebar\(!p.isCollapsed\(\)\); \} \}\} /g,
  "onClick={() => setShowRightSidebar(!showRightSidebar)} "
);

// Revert Panel wrapper for Left
code = code.replace(
  /<Panel panelRef=\{leftPanelRef\} collapsible=\{true\}/g,
  "{showLeftSidebar && (\n              <Panel panelRef={leftPanelRef}"
);
code = code.replace(
  /              <\/Panel>\n\n            <PanelResizeHandle/g,
  "              </Panel>\n            )}\n\n            {showLeftSidebar && (\n              <PanelResizeHandle"
);
code = code.replace(
  /            <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-\[#c96442\] active:bg-\[#c96442\] transition-colors cursor-col-resize shrink-0 z-10 relative" \/>\n\n            {\/\* Center:/g,
  "            <PanelResizeHandle className=\"hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative\" />\n            )}\n\n            {/* Center:"
);

// Revert Panel wrapper for Right
code = code.replace(
  /              <\/PanelGroup>\n            <\/Panel>\n\n            <PanelResizeHandle className="hidden lg:flex/g,
  "              </PanelGroup>\n            </Panel>\n\n            {showRightSidebar && (\n              <PanelResizeHandle className=\"hidden lg:flex"
);
code = code.replace(
  /            <PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-\[#c96442\] active:bg-\[#c96442\] transition-colors cursor-col-resize shrink-0 z-10 relative" \/>\n\n            {\/\* Right Sidebar:/g,
  "            <PanelResizeHandle className=\"hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative\" />\n            )}\n\n            {/* Right Sidebar:"
);
code = code.replace(
  /<Panel panelRef=\{rightPanelRef\} collapsible=\{true\}/g,
  "{showRightSidebar && (\n              <Panel panelRef={rightPanelRef}"
);
code = code.replace(
  /              <\/form>\n            <\/Panel>\n          <\/PanelGroup>/g,
  "              </form>\n            </Panel>\n            )}\n          </PanelGroup>"
);

// Revert Panel wrapper for Bottom
code = code.replace(
  /<Panel panelRef=\{bottomPanelRef\} collapsible=\{true\}/g,
  "{showBottomNotes && (\n                <Panel panelRef={bottomPanelRef}"
);
code = code.replace(
  /                  onChange=\{handleQuickNoteChange\}\n                \/>\n                <\/Panel>\n              <\/PanelGroup>/g,
  "                  onChange={handleQuickNoteChange}\n                />\n                </Panel>\n                )}\n              </PanelGroup>"
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
