import re

with open('src/app/(main)/page.tsx', 'r') as f:
    content = f.read()

# Replace the tracker rendering logic
tracker_start = r"(\{/\* TRACKER TAB \*/\}.*?const progressPercent = Math\.round\(\(completedCount / totalChapters\) \* 100\) \|\| 0;)"

new_tracker_vars = r"""{/* TRACKER TAB */}
        {activeTab === 'tracker' && (() => {
          const totalChapters = 1189;
          const completedCount = completedChapters.length;
          const progressPercent = Math.round((completedCount / totalChapters) * 100) || 0;
          
          const otTotal = OT_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
          const ntTotal = NT_BOOKS.reduce((acc, b) => acc + b.chapters, 0);
          const otCompleted = OT_BOOKS.reduce((acc, b) => acc + completedChapters.filter(c => c.startsWith(b.name + '-')).length, 0);
          const ntCompleted = NT_BOOKS.reduce((acc, b) => acc + completedChapters.filter(c => c.startsWith(b.name + '-')).length, 0);
          const otPercent = Math.round((otCompleted / otTotal) * 100) || 0;
          const ntPercent = Math.round((ntCompleted / ntTotal) * 100) || 0;
"""
content = re.sub(tracker_start, new_tracker_vars, content, flags=re.DOTALL)

# Add progress bars to the OT and NT buttons, and update the book percentage display
ot_button_pattern = r"(<button\s*onClick=\{\(\) => toggleTestament\('OT'\)\}.*?>.*?)(<div className=\"text-muted\">)"
new_ot_button = r"""\1
                      <div className="flex-1 mx-6 hidden sm:block">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${otPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-4">{trackerFormat === 'percent' ? `${otPercent}%` : `${otCompleted}/${otTotal}`}</div>
                      \2"""
content = re.sub(ot_button_pattern, new_ot_button, content, flags=re.DOTALL)

nt_button_pattern = r"(<button\s*onClick=\{\(\) => toggleTestament\('NT'\)\}.*?>.*?)(<div className=\"text-muted\">)"
new_nt_button = r"""\1
                      <div className="flex-1 mx-6 hidden sm:block">
                        <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${ntPercent}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-mono text-muted mr-4">{trackerFormat === 'percent' ? `${ntPercent}%` : `${ntCompleted}/${ntTotal}`}</div>
                      \2"""
content = re.sub(nt_button_pattern, new_nt_button, content, flags=re.DOTALL)


# Update the book CH text to percentage
book_ch_pattern = r"(<h3 className=\"font-medium text-\[15px\] text-fg\">\{book.name\}</h3>\s*)<span className=\"text-xs text-muted font-mono\">\{book.chapters\} CH</span>"
new_book_ch = r"""\1
                              <span className="text-[13px] text-muted font-mono bg-bg px-2 py-1 rounded-md">
                                {(() => {
                                  const comp = completedChapters.filter(c => c.startsWith(book.name + '-')).length;
                                  return trackerFormat === 'percent' ? `${Math.round((comp / book.chapters) * 100) || 0}%` : `${comp}/${book.chapters}`;
                                })()}
                              </span>"""
content = re.sub(book_ch_pattern, new_book_ch, content)

with open('src/app/(main)/page.tsx', 'w') as f:
    f.write(content)

print("Tracker fixed!")
