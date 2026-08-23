const fs = require('fs');

let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// 1. Add import for ImperativePanelHandle
if (!code.includes('ImperativePanelHandle')) {
  code = code.replace(
    "import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';",
    "import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';\nimport type { ImperativePanelHandle } from 'react-resizable-panels';"
  );
}

// 2. Add refs
if (!code.includes('leftPanelRef')) {
  code = code.replace(
    "const [showRightSidebar, setShowRightSidebar] = useState(true);",
    "const [showRightSidebar, setShowRightSidebar] = useState(true);\n  const leftPanelRef = useRef<ImperativePanelHandle>(null);\n  const rightPanelRef = useRef<ImperativePanelHandle>(null);\n  const bottomPanelRef = useRef<ImperativePanelHandle>(null);"
  );
}

// 3. Update toggle functions
code = code.replace(
  "onClick={() => setShowLeftSidebar(!showLeftSidebar)}",
  "onClick={() => { const p = leftPanelRef.current; if (p) { p.isCollapsed() ? p.expand() : p.collapse(); } }}"
);
code = code.replace(
  "onClick={() => setShowRightSidebar(!showRightSidebar)}",
  "onClick={() => { const p = rightPanelRef.current; if (p) { p.isCollapsed() ? p.expand() : p.collapse(); } }}"
);
code = code.replace(
  "onClick={() => setShowBottomNotes(!showBottomNotes)}",
  "onClick={() => { const p = bottomPanelRef.current; if (p) { p.isCollapsed() ? p.expand() : p.collapse(); } }}"
);

// 4. Remove conditionals and add props to Panels
// Left Panel
code = code.replace(
  /\{showLeftSidebar && \(\s*<Panel defaultSize=\{25\} minSize=\{25\} className=\{`w-full lg:w-auto min-w-\[200px\] lg:min-w-\[240px\] border-r border-\[\#30302e\] bg-\[\#141413\] flex-col \$\{mobileStudyView === 'chapters' \? 'flex' : 'hidden lg:flex'\}`\}>/,
  `<Panel ref={leftPanelRef} collapsible={true} onCollapse={() => setShowLeftSidebar(false)} onExpand={() => setShowLeftSidebar(true)} defaultSize={25} minSize={20} className={\`w-full lg:w-auto border-r border-[#30302e] bg-[#141413] flex-col \${mobileStudyView === 'chapters' ? 'flex' : 'hidden lg:flex'}\`}>`
);

// Right Panel
code = code.replace(
  /\{showRightSidebar && \(\s*<Panel defaultSize=\{30\} minSize=\{30\} className=\{`w-full lg:w-auto min-w-\[250px\] lg:min-w-\[300px\] border-l border-\[\#30302e\] bg-\[\#141413\] flex-col \$\{mobileStudyView === 'ai' \? 'flex' : 'hidden lg:flex'\}`\}>/,
  `<Panel ref={rightPanelRef} collapsible={true} onCollapse={() => setShowRightSidebar(false)} onExpand={() => setShowRightSidebar(true)} defaultSize={30} minSize={25} className={\`w-full lg:w-auto border-l border-[#30302e] bg-[#141413] flex-col \${mobileStudyView === 'ai' ? 'flex' : 'hidden lg:flex'}\`}>`
);

// Bottom Panel
code = code.replace(
  /\{showBottomNotes && \(\s*<Panel defaultSize=\{25\} minSize=\{25\} className="border-t border-\[\#30302e\] bg-\[\#141413\] flex flex-col shrink-0 min-h-\[100px\] lg:min-h-\[120px\]">/,
  `<Panel ref={bottomPanelRef} collapsible={true} onCollapse={() => setShowBottomNotes(false)} onExpand={() => setShowBottomNotes(true)} defaultSize={25} minSize={20} className="border-t border-[#30302e] bg-[#141413] flex flex-col shrink-0">`
);

// Remove the closing braces for conditionals (we know there are exactly 3 of these closures we need to remove)
// This is tricky with regex, so let's do it manually using indices if needed, or we can just replace the specific end patterns.
// Left sidebar closure:
code = code.replace(/<\/div>\s*<\/Panel>\s*\)\}/, '</div>\n              </Panel>');
// Bottom notes closure:
code = code.replace(/<\/div>\s*<\/Panel>\s*\)\}/, '</div>\n                  </Panel>');
// Right sidebar closure:
code = code.replace(/<\/div>\s*<\/Panel>\s*\)\}/, '</div>\n              </Panel>');

// Also remove conditional rendering from PanelResizeHandles!
code = code.replace(/\{showLeftSidebar && \(\s*<PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-\[\#c96442\] active:bg-\[\#c96442\] transition-colors cursor-col-resize shrink-0 z-10 relative" \/>\s*\)\}/, '<PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative" />');

code = code.replace(/\{showBottomNotes && \(\s*<PanelResizeHandle className="h-1 bg-transparent hover:bg-\[\#c96442\] active:bg-\[\#c96442\] transition-colors cursor-row-resize shrink-0 z-10 relative" \/>\s*\)\}/, '<PanelResizeHandle className="h-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-row-resize shrink-0 z-10 relative" />');

code = code.replace(/\{showRightSidebar && \(\s*<PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-\[\#c96442\] active:bg-\[\#c96442\] transition-colors cursor-col-resize shrink-0 z-10 relative" \/>\s*\)\}/, '<PanelResizeHandle className="hidden lg:flex w-1 bg-transparent hover:bg-[#c96442] active:bg-[#c96442] transition-colors cursor-col-resize shrink-0 z-10 relative" />');

fs.writeFileSync('frontend/src/app/page.tsx', code);
