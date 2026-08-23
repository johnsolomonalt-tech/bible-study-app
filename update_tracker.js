const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

const stateCodeToAdd = `  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  
  // Tracker State
  const [expandedTestaments, setExpandedTestaments] = useState<string[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<string[]>([]);
  
  const toggleTestament = (t: string) => setExpandedTestaments(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleBook = (b: string) => setExpandedBooks(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
`;
code = code.replace(`  const [completedChapters, setCompletedChapters] = useState<string[]>([]);`, stateCodeToAdd);

const oldTrackerUI = `                <div className="text-[13px] font-bold tracking-widest text-[#87867f] uppercase mb-6 ml-2">Old Testament</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
                  {OT_BOOKS.map(book => (
                    <div key={book.name} className="bg-[#30302e] p-6 rounded-[20px] ring-shadow">
                      <h3 className="font-medium text-[16px] text-[#faf9f5] mb-5">{book.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: book.chapters }).map((_, i) => {
                          const id = \`\${book.name}-\${i + 1}\`;
                          const isChecked = completedChapters.includes(id);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleAnyChapter(id)}
                              className={\`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all \${
                                isChecked 
                                  ? 'bg-[#c96442] text-white shadow-sm' 
                                  : 'bg-[#141413] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                              }\`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[13px] font-bold tracking-widest text-[#87867f] uppercase mb-6 ml-2">New Testament</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
                  {NT_BOOKS.map(book => (
                    <div key={book.name} className="bg-[#30302e] p-6 rounded-[20px] ring-shadow">
                      <h3 className="font-medium text-[16px] text-[#faf9f5] mb-5">{book.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: book.chapters }).map((_, i) => {
                          const id = \`\${book.name}-\${i + 1}\`;
                          const isChecked = completedChapters.includes(id);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleAnyChapter(id)}
                              className={\`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all \${
                                isChecked 
                                  ? 'bg-[#c96442] text-white shadow-sm' 
                                  : 'bg-[#141413] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                              }\`}
                            >
                              {i + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>`;

const newTrackerUI = `                {/* Old Testament Accordion */}
                <div className="mb-6">
                  <button 
                    onClick={() => toggleTestament('OT')}
                    className="w-full flex items-center justify-between text-left bg-[#30302e] p-5 rounded-[20px] ring-shadow hover:bg-[#393936] transition-colors"
                  >
                    <div className="text-[16px] font-bold tracking-widest text-[#faf9f5] uppercase">Old Testament</div>
                    <div className="text-[#87867f]">{expandedTestaments.includes('OT') ? '▲' : '▼'}</div>
                  </button>
                  
                  {expandedTestaments.includes('OT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-[#30302e]">
                      {OT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        return (
                          <div key={book.name} className="bg-[#1c1c1b] rounded-[16px] overflow-hidden ring-1 ring-[#30302e]">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-[#252523] transition-colors"
                            >
                              <h3 className="font-medium text-[15px] text-[#faf9f5]">{book.name}</h3>
                              <span className="text-xs text-[#87867f] font-mono">{book.chapters} CH</span>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-[#30302e] bg-[#141413]">
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = \`\${book.name}-\${i + 1}\`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={\`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all \${
                                          isChecked 
                                            ? 'bg-[#c96442] text-white shadow-sm' 
                                            : 'bg-[#252523] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                                        }\`}
                                      >
                                        {i + 1}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* New Testament Accordion */}
                <div className="mb-16">
                  <button 
                    onClick={() => toggleTestament('NT')}
                    className="w-full flex items-center justify-between text-left bg-[#30302e] p-5 rounded-[20px] ring-shadow hover:bg-[#393936] transition-colors"
                  >
                    <div className="text-[16px] font-bold tracking-widest text-[#faf9f5] uppercase">New Testament</div>
                    <div className="text-[#87867f]">{expandedTestaments.includes('NT') ? '▲' : '▼'}</div>
                  </button>
                  
                  {expandedTestaments.includes('NT') && (
                    <div className="mt-4 flex flex-col gap-3 pl-4 border-l-2 border-[#30302e]">
                      {NT_BOOKS.map(book => {
                        const isBookExpanded = expandedBooks.includes(book.name);
                        return (
                          <div key={book.name} className="bg-[#1c1c1b] rounded-[16px] overflow-hidden ring-1 ring-[#30302e]">
                            <button 
                              onClick={() => toggleBook(book.name)}
                              className="w-full flex items-center justify-between p-4 hover:bg-[#252523] transition-colors"
                            >
                              <h3 className="font-medium text-[15px] text-[#faf9f5]">{book.name}</h3>
                              <span className="text-xs text-[#87867f] font-mono">{book.chapters} CH</span>
                            </button>
                            
                            {isBookExpanded && (
                              <div className="p-4 pt-0 border-t border-[#30302e] bg-[#141413]">
                                <div className="flex flex-wrap gap-2 mt-4">
                                  {Array.from({ length: book.chapters }).map((_, i) => {
                                    const id = \`\${book.name}-\${i + 1}\`;
                                    const isChecked = completedChapters.includes(id);
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => toggleAnyChapter(id)}
                                        className={\`w-11 h-11 lg:w-9 lg:h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all \${
                                          isChecked 
                                            ? 'bg-[#c96442] text-white shadow-sm' 
                                            : 'bg-[#252523] text-[#87867f] hover:text-[#faf9f5] hover:bg-[#4d4c48]'
                                        }\`}
                                      >
                                        {i + 1}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>`;

if (code.includes(oldTrackerUI)) {
  code = code.replace(oldTrackerUI, newTrackerUI);
  fs.writeFileSync('frontend/src/app/page.tsx', code);
  console.log("Success tracker");
} else {
  console.log("Could not find old tracker UI");
}
