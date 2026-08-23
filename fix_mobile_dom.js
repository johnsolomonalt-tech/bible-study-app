const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// The mobile layout is exactly the layout from before `12f5650`.
// We will insert it right before the `<PanelGroup ...>`

const mobileLayout = `
        {/* MOBILE STUDY TAB (Exact original layout) */}
        {activeTab === 'study' && (
          <div className="lg:hidden flex w-full h-full">
            {/* Left Sidebar: Navigation */}
            <aside className={\`w-full border-r border-[#30302e] bg-[#141413] flex-col \${mobileStudyView === 'chapters' ? 'flex' : 'hidden'}\`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center px-4 shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-2 text-[#b0aea5] hover:text-[#faf9f5]">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-[#faf9f5]">Books</span>
              </header>
              <div className="flex-1 overflow-y-auto custom-scroll p-3">
                <div className="text-[11px] font-bold tracking-widest text-[#87867f] uppercase mb-3 ml-2 mt-2">Old Testament</div>
                {OT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#b0aea5] hover:bg-[#30302e] hover:text-[#faf9f5] cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={\`text-xs min-h-[44px] py-2 rounded-md transition-colors \${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}\`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
                <div className="text-[11px] font-bold tracking-widest text-[#87867f] uppercase mb-3 ml-2 mt-6">New Testament</div>
                {NT_BOOKS.map(b => (
                  <details key={b.name} className="group mb-1">
                    <summary className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#b0aea5] hover:bg-[#30302e] hover:text-[#faf9f5] cursor-pointer list-none flex justify-between items-center transition-colors">
                      {b.name} 
                      <ChevronRight size={16} className="group-open:rotate-90 transition-transform opacity-50" />
                    </summary>
                    <div className="grid grid-cols-5 gap-1.5 px-3 py-2 pb-3">
                      {Array.from({ length: b.chapters }).map((_, i) => {
                        const isActive = activeBook.name === b.name && activeChapter === i + 1;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setActiveBook(b); setActiveChapter(i + 1); setMobileStudyView('reader'); }}
                            className={\`text-xs min-h-[44px] py-2 rounded-md transition-colors \${isActive ? 'bg-[#c96442] text-white shadow-sm' : 'text-[#87867f] hover:bg-[#4d4c48] hover:text-[#faf9f5]'}\`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </aside>

            {/* Center: Bible Reader */}
            <section className={\`flex-1 flex-col h-full bg-[#141413] \${mobileStudyView === 'reader' ? 'flex' : 'hidden'}\`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center justify-between px-4 bg-[#141413] shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => setMobileStudyView('chapters')} className="p-2 text-[#b0aea5] hover:text-[#faf9f5]">
                    <Layout size={20} />
                  </button>
                  <div className="font-display text-[18px] ml-1">{activeBook.name} {activeChapter}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileStudyView('ai')} className="p-2 text-[#b0aea5] hover:text-[#faf9f5]">
                    <Sparkles size={20} />
                  </button>
                  <button onClick={toggleCompleted} className="flex items-center justify-center p-2 rounded-lg bg-[#30302e] text-[#faf9f5]">
                    <Check size={20} className={isCompleted ? "text-[#c96442]" : "text-[#5e5d59]"} /> 
                  </button>
                  <button onClick={toggleSpeech} className="flex items-center justify-center p-2 rounded-lg text-[#b0aea5] hover:text-[#faf9f5] hover:bg-[#30302e] transition-colors" title="Read chapter aloud">
                    {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <select value={translation} onChange={(e) => setTranslation(e.target.value)} className="bg-transparent text-sm font-medium text-[#b0aea5] hover:text-[#faf9f5] focus:outline-none cursor-pointer transition-colors max-w-[60px] mr-2">
                    <option value="kjv" className="bg-[#30302e]">KJV</option>
                    <option value="web" className="bg-[#30302e]">WEB</option>
                    <option value="bbe" className="bg-[#30302e]">BBE</option>
                  </select>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto custom-scroll relative bg-[#0a0a0a]" ref={mobileScrollContainerRef} onScroll={(e) => handleScroll(e, true)}>
                <div className="max-w-[800px] mx-auto px-6 lg:px-12 py-8 lg:py-12 min-h-full flex flex-col">
                  {isLoadingText ? (
                    <div className="flex-1 flex items-center justify-center text-[#87867f]">Loading text...</div>
                  ) : errorText ? (
                    <div className="flex-1 flex items-center justify-center text-[#c96442]">{errorText}</div>
                  ) : (
                    <div className="text-[17px] leading-[1.8] text-[#e4e1cf] font-serif max-w-prose mx-auto w-full flex-1">
                      {chapterText.map((v) => (
                        <span key={v.verse} className="inline mr-2">
                          <sup className="text-[#87867f] text-[10px] mr-1">{v.verse}</sup>
                          {v.text}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-12 pt-8 border-t border-[#30302e] flex justify-between items-center pb-8">
                    <button onClick={goToPrevChapter} className="px-4 py-2 text-sm font-medium text-[#87867f] hover:text-[#faf9f5] hover:bg-[#30302e] rounded-lg transition-colors flex items-center gap-2">
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <button onClick={goToNextChapter} className="px-4 py-2 text-sm font-medium text-[#87867f] hover:text-[#faf9f5] hover:bg-[#30302e] rounded-lg transition-colors flex items-center gap-2">
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Sidebar: Study AI */}
            <aside className={\`w-full border-l border-[#30302e] bg-[#141413] flex-col \${mobileStudyView === 'ai' ? 'flex' : 'hidden'}\`}>
              <header className="h-[60px] border-b border-[#30302e] flex items-center px-4 gap-2 text-[15px] font-medium text-[#faf9f5] shrink-0">
                <button onClick={() => setMobileStudyView('reader')} className="p-2 mr-1 text-[#b0aea5] hover:text-[#faf9f5]">
                  <ChevronLeft size={20} />
                </button>
                <Sparkles size={16} className="text-[#c96442]" /> Study AI
              </header>
              <div className="flex-1 flex flex-col h-[calc(100%-60px)]">
                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
                  {studyAiMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-[#87867f] p-4">
                      <Sparkles size={32} className="mb-3 opacity-20" />
                      <p className="text-sm">Ask a question about {activeBook.name} {activeChapter}</p>
                    </div>
                  ) : (
                    studyAiMessages.map(msg => (
                      <div key={msg.id} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                        <div className={\`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed \${msg.role === 'user' ? 'bg-[#c96442] text-white' : 'bg-[#30302e] text-[#e4e1cf]'}\`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                  {isStudyAiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#30302e] text-[#87867f] rounded-2xl px-4 py-2.5 text-[14px] flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[#87867f] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[#87867f] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-1.5 h-1.5 bg-[#87867f] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-[#30302e] bg-[#141413]">
                  <div className="relative flex items-end bg-[#1c1c1b] rounded-xl border border-[#30302e] focus-within:border-[#4d4c48] transition-colors p-1">
                    <textarea 
                      className="w-full bg-transparent p-2.5 pl-3 min-h-[44px] max-h-[120px] text-[14px] text-[#faf9f5] placeholder-[#5e5d59] focus:outline-none resize-none custom-scroll" 
                      placeholder="Ask anything..." 
                      rows={1}
                      value={studyAiInput}
                      onChange={(e) => setStudyAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleStudyAiSubmit();
                        }
                      }}
                    />
                    <button 
                      onClick={handleStudyAiSubmit}
                      disabled={isStudyAiLoading || !studyAiInput.trim()}
                      className="p-2.5 text-[#c96442] hover:text-[#e4e1cf] disabled:opacity-50 disabled:hover:text-[#c96442] transition-colors shrink-0"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
`;

code = code.replace(
  /\{\/\* STUDY TAB \*\/\}\n\s*\{activeTab === 'study' && \(\n\s*<PanelGroup orientation="horizontal" id="theologica-layout-v2" className="flex w-full h-full">/,
  mobileLayout + `\n        {/* DESKTOP STUDY TAB (With Resizable Panels) */}\n        {activeTab === 'study' && (\n          <PanelGroup orientation="horizontal" id="theologica-layout-v2" className="hidden lg:flex w-full h-full">`
);

// We also need to strip out all the `max-lg:!basis-full` and `max-lg:!flex-auto` classes from the Desktop layout to keep it clean.
code = code.replace(/max-lg:!basis-full max-lg:!flex-auto /g, '');
code = code.replace(/max-lg:!basis-full max-lg:!flex-auto/g, '');

fs.writeFileSync('frontend/src/app/page.tsx', code);
