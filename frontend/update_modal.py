import re

with open('src/app/(main)/page.tsx', 'r') as f:
    content = f.read()

# Add Settings Modal UI inside the return block, before {/* MOBILE NAV */}
modal_anchor = r"(\{/\* MOBILE NAV \*/\})"
settings_modal = r"""
        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-bg w-full max-w-sm rounded-[24px] p-6 shadow-2xl ring-1 ring-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-fg">Settings</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-muted hover:text-fg transition-colors">✕</button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-surface rounded-[16px] ring-1 ring-border">
                  <div>
                    <div className="text-[15px] font-medium text-fg">Appearance</div>
                    <div className="text-[13px] text-muted">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                  </div>
                  <button onClick={toggleTheme} className="w-12 h-6 rounded-full bg-border-soft relative transition-colors" style={{ backgroundColor: theme === 'light' ? 'var(--accent)' : 'var(--border-soft)' }}>
                    <div className="w-5 h-5 rounded-full bg-fg absolute top-0.5 transition-transform" style={{ transform: theme === 'light' ? 'translateX(26px)' : 'translateX(2px)' }} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-surface rounded-[16px] ring-1 ring-border">
                  <div>
                    <div className="text-[15px] font-medium text-fg">Tracker Format</div>
                    <div className="text-[13px] text-muted">{trackerFormat === 'percent' ? 'Percentage (%)' : 'Fractions (1/10)'}</div>
                  </div>
                  <button onClick={toggleTrackerFormat} className="text-[13px] font-semibold bg-bg px-3 py-1.5 rounded-lg text-fg ring-1 ring-border hover:bg-surface-warm transition-colors">
                    Toggle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        \1"""
content = re.sub(modal_anchor, settings_modal, content)

# Add Settings button to Sidebar
sidebar_anchor = r"(\{/\* Sidebar User/Signout \*/\})"
settings_btn = r"""
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 px-4 py-3 text-muted hover:text-fg hover:bg-surface rounded-xl transition-all font-medium text-[15px] group w-full text-left">
              <Settings size={18} className="group-hover:rotate-45 transition-transform duration-300" />
              Settings
            </button>
            \1"""
content = re.sub(sidebar_anchor, settings_btn, content)

# Also import Settings icon from lucide-react if not there
if "Settings" not in content[:content.find("from 'lucide-react'")]:
    import_lucide = r"(import \{.*?)(\} from 'lucide-react';)"
    content = re.sub(import_lucide, r"\1, Settings \2", content)

with open('src/app/(main)/page.tsx', 'w') as f:
    f.write(content)

print("Modal added!")
