const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  /\/\/ Bible State\n  const \[activeBook/,
  `// Bible State
  const [highlights, setHighlights] = useState<{id: number, book: string, chapter: number, verse: number, text: string, color: string}[]>([]);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectionVerse, setSelectionVerse] = useState<number | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{x: number, y: number} | null>(null);
  
  const [activeBook`
);

// 2. Add fetch logic in the useEffect for chapter load
code = code.replace(
  /setBibleVerses\(\[\{verse: 1, text: "Error loading text from bible-api.com."\}\]\);\n      \}\);\n/,
  `setBibleVerses([{verse: 1, text: "Error loading text from bible-api.com."}]);
      });

    // Fetch highlights for current chapter
    fetchWithAuth(\`\${API_URL}/api/highlights?book=\${encodeURIComponent(activeBook.name)}&chapter=\${activeChapter}\`)
      .then(r => r.json())
      .then(data => {
        if (isMounted && Array.isArray(data)) setHighlights(data);
      })
      .catch(e => console.error("Failed to load highlights", e));\n`
);

// 3. Add selection handling logic and highlight saving logic inside the App component
const selectionLogic = `
  // Highlighting Logic
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setToolbarPosition(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Find the verse this selection belongs to by looking at parent elements
    let verseNumber = null;
    let node = range.startContainer.parentNode;
    while (node && node !== document.body) {
      if (node.getAttribute && node.getAttribute('data-verse')) {
        verseNumber = parseInt(node.getAttribute('data-verse'), 10);
        break;
      }
      node = node.parentNode;
    }
    
    if (verseNumber) {
      setSelectionRange(range);
      setSelectionVerse(verseNumber);
      setToolbarPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 40 // 40px above
      });
    } else {
      setToolbarPosition(null);
    }
  }, []);

  const saveHighlight = async (color: string) => {
    if (!selectionRange || !selectionVerse) return;
    
    const text = selectionRange.toString();
    const verse = selectionVerse;
    const book = activeBook.name;
    const chapter = activeChapter;

    // Optimistic UI update
    const tempId = Date.now();
    const newHighlight = { id: tempId, book, chapter, verse, text, color };
    setHighlights(prev => [...prev, newHighlight]);
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();

    try {
      const res = await fetchWithAuth(\`\${API_URL}/api/highlights\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book, chapter, verse, text, color })
      });
      const data = await res.json();
      setHighlights(prev => prev.map(h => h.id === tempId ? data : h));
    } catch (e) {
      setHighlights(prev => prev.filter(h => h.id !== tempId));
      console.error("Failed to save highlight", e);
    }
  };

  const deleteHighlight = async (id: number) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    try {
      await fetchWithAuth(\`\${API_URL}/api/highlights/\${id}\`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete highlight", e);
    }
  };

  const askAiAboutHighlight = () => {
    if (!selectionRange || !selectionVerse) return;
    const text = selectionRange.toString();
    const query = \`What does "\${text}" mean in verse \${selectionVerse} of \${activeBook.name} \${activeChapter}?\`;
    
    // Switch to AI tab
    setMobileStudyView('ai');
    if (!showRightSidebar) setShowRightSidebar(true);
    
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
    
    // Trigger chat send logic (mocking the event)
    setChatInput(query);
    setTimeout(() => {
       // We need to trigger the submit securely. 
       // The handleSendMessage uses chatInput state, which we just set.
       // It's safer to just set the input and let the user press send if we can't easily trigger the exact React state cycle here, 
       // but we'll try to trigger it by having a ref or just updating it.
    }, 100);
  };
`;

code = code.replace(
  /  const scrollToBottom = \(\) => \{/,
  selectionLogic + `\n  const scrollToBottom = () => {`
);

// We need a better way to trigger handleSendMessage. We can adjust handleSendMessage to accept an optional string.
code = code.replace(
  /const handleSendMessage = async \(e: React.FormEvent\) => \{/,
  `const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {\n    if (e) e.preventDefault();\n    const textToSend = overrideText || chatInput;`
);
code = code.replace(/if \(!chatInput.trim\(\) \|\| cooldown > 0\)/, `if (!textToSend.trim() || cooldown > 0)`);
code = code.replace(/setChatInput\(''\);/, `if (!overrideText) setChatInput(''); else setChatInput('');`);
code = code.replace(/const newMsg = \{ role: 'user', content: chatInput \};/, `const newMsg = { role: 'user', content: textToSend };`);

// Update askAiAboutHighlight to use this override:
code = code.replace(
  /\/\/ Trigger chat send logic \(mocking the event\)\n\s*setChatInput\(query\);\n\s*setTimeout\(\(\) => \{\n[\s\S]*?\}, 100\);/,
  `handleSendMessage(undefined, query);`
);

// 4. Update the verse renderer logic
// We need a function that highlights parts of the verse
const renderVerse = `
  const renderVerseContent = (verse: number, text: string) => {
    const verseHighlights = highlights.filter(h => h.verse === verse);
    if (verseHighlights.length === 0) return <>{text}</>;

    // Simple implementation: sort highlights by length descending to replace biggest first
    // In a robust implementation, we would split the string using offsets.
    // For now, let's use a regex replacement to wrap text in marked spans.
    // Since React needs elements, we can do this by splitting the string safely.
    
    // For perfect non-overlapping rendering:
    let segments: { text: string, highlight?: typeof highlights[0] }[] = [{ text }];
    
    verseHighlights.forEach(h => {
      let newSegments: typeof segments = [];
      segments.forEach(seg => {
        if (seg.highlight) {
          newSegments.push(seg);
        } else {
          const index = seg.text.toLowerCase().indexOf(h.text.toLowerCase());
          if (index !== -1) {
            newSegments.push({ text: seg.text.substring(0, index) });
            newSegments.push({ text: seg.text.substring(index, index + h.text.length), highlight: h });
            newSegments.push({ text: seg.text.substring(index + h.text.length) });
          } else {
            newSegments.push(seg);
          }
        }
      });
      segments = newSegments.filter(s => s.text.length > 0);
    });

    return (
      <>
        {segments.map((seg, i) => 
          seg.highlight ? (
            <mark 
              key={i} 
              onClick={() => deleteHighlight(seg.highlight!.id)}
              className={\`cursor-pointer rounded-sm px-0.5 \${seg.highlight.color === 'yellow' ? 'bg-yellow-500/40 text-inherit' : seg.highlight.color === 'green' ? 'bg-green-500/40 text-inherit' : seg.highlight.color === 'blue' ? 'bg-blue-500/40 text-inherit' : seg.highlight.color === 'pink' ? 'bg-pink-500/40 text-inherit' : 'bg-purple-500/40 text-inherit'}\`}
              title="Click to remove highlight"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </>
    );
  };
`;

code = code.replace(
  /  const scrollToBottom = \(\) => \{/,
  renderVerse + `\n  const scrollToBottom = () => {`
);

// 5. Update BOTH verse renderers to use data-verse and renderVerseContent, and add mouseup/touchend to the reader div
const mobileRendererOriginal = `<span key={index}>
                          <sup className="text-[#87867f] text-[10px] mr-1">{v.verse}</sup>
                          {v.text}{' '}
                        </span>`;
const mobileRendererNew = `<span key={index} data-verse={v.verse}>
                          <sup className="text-[#87867f] text-[10px] mr-1">{v.verse}</sup>
                          {renderVerseContent(v.verse, v.text)}{' '}
                        </span>`;
code = code.replace(mobileRendererOriginal, mobileRendererNew);

const desktopRendererOriginal = `<span key={v.verse} className={\`transition-colors duration-300 \${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : ''}\`}>
                          <sup className={\`text-[10px] font-sans font-semibold mr-1.5 opacity-80 \${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : 'text-[#87867f]'}\`}>{v.verse}</sup>
                          {v.text}
                        </span>`;
const desktopRendererNew = `<span key={v.verse} data-verse={v.verse} className={\`transition-colors duration-300 \${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : ''}\`}>
                          <sup className={\`text-[10px] font-sans font-semibold mr-1.5 opacity-80 \${currentSpeakingVerseIndex === index ? 'text-[#c96442]' : 'text-[#87867f]'}\`}>{v.verse}</sup>
                          {renderVerseContent(v.verse, v.text)}
                        </span>`;
code = code.replace(desktopRendererOriginal, desktopRendererNew);

// 6. Add mouseup/touchend to the reader containers
code = code.replace(
  /<div className="flex-1 overflow-y-auto custom-scroll p-6">/g,
  `<div className="flex-1 overflow-y-auto custom-scroll p-6" onMouseUp={handleSelection} onTouchEnd={handleSelection}>`
);
code = code.replace(
  /<div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16">/g,
  `<div className="flex-1 overflow-y-auto custom-scroll p-10 lg:p-16" onMouseUp={handleSelection} onTouchEnd={handleSelection}>`
);

// 7. Add Floating Toolbar DOM
const floatingToolbar = `
        {/* Floating Toolbar for Highlighting */}
        {toolbarPosition && (
          <div 
            className="fixed z-50 flex items-center gap-1.5 bg-[#30302e] border border-[#4d4c48] p-1.5 rounded-xl shadow-2xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full"
            style={{ left: toolbarPosition.x, top: toolbarPosition.y - 10 }}
          >
            <button onClick={() => saveHighlight('yellow')} className="w-7 h-7 rounded-full bg-yellow-500 hover:scale-110 transition-transform shadow-sm" title="Highlight Yellow" />
            <button onClick={() => saveHighlight('green')} className="w-7 h-7 rounded-full bg-green-500 hover:scale-110 transition-transform shadow-sm" title="Highlight Green" />
            <button onClick={() => saveHighlight('blue')} className="w-7 h-7 rounded-full bg-blue-500 hover:scale-110 transition-transform shadow-sm" title="Highlight Blue" />
            <button onClick={() => saveHighlight('pink')} className="w-7 h-7 rounded-full bg-pink-500 hover:scale-110 transition-transform shadow-sm" title="Highlight Pink" />
            <button onClick={() => saveHighlight('purple')} className="w-7 h-7 rounded-full bg-purple-500 hover:scale-110 transition-transform shadow-sm" title="Highlight Purple" />
            <div className="w-[1px] h-5 bg-[#4d4c48] mx-1" />
            <button onClick={askAiAboutHighlight} className="flex items-center justify-center h-7 px-2.5 rounded-lg bg-[#c96442] text-white hover:bg-[#d87654] hover:scale-105 transition-all text-xs font-semibold shadow-sm gap-1">
              <Sparkles size={12} /> Ask AI
            </button>
          </div>
        )}
`;
code = code.replace(
  /        \{\/\* DEVOTIONAL TAB \*\/\}/,
  floatingToolbar + `\n        {/* DEVOTIONAL TAB */}`
);

// Also need to clear toolbar on mousedown elsewhere.
code = code.replace(
  /export default function App\(\) \{/,
  `export default function App() {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Small timeout to allow the toolbar buttons to fire their click handlers first
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setToolbarPosition(null);
        }
      }, 50);
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);`
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
