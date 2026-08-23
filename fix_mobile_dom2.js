const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

const regex = /<section className=\{`flex-1 flex-col h-full bg-\[\#141413\] \$\{mobileStudyView === 'reader' \? 'flex' : 'hidden'\}`\}>([\s\S]*?)<\/section>/;

const newSection = `<section className={\`flex-1 flex-col h-full bg-[#141413] \${mobileStudyView === 'reader' ? 'flex' : 'hidden'}\`}>
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

              <div className="flex-1 overflow-y-auto custom-scroll p-6 lg:p-16">
                <article className="max-w-3xl mx-auto">
                  <p className="font-serif text-[18px] leading-[1.8] text-[#faf9f5] whitespace-pre-wrap">
                    {bibleVerses.length > 0 ? (
                      bibleVerses.map((v, index) => (
                        <span key={index}>
                          <sup className="text-[#87867f] text-[10px] mr-1">{v.verse}</sup>
                          {v.text}{' '}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#87867f]">Loading chapter...</span>
                    )}
                  </p>
                </article>
              </div>
            </section>`;

code = code.replace(regex, newSection);

fs.writeFileSync('frontend/src/app/page.tsx', code);
