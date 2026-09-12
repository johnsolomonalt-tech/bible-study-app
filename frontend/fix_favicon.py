import re

with open('src/app/(main)/page.tsx', 'r') as f:
    content = f.read()

# Add useEffect for favicon
state_block = r"(const \[trackerFormat, setTrackerFormat\] = useState<'percent' \| 'fraction'>\('percent'\);)"
new_state = r"""\1

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    const logoUrl = theme === 'light' ? '/logo-light.png' : '/logo-dark.png';
    if (link) {
      link.href = logoUrl;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = logoUrl;
      document.head.appendChild(newLink);
    }
  }, [theme]);"""
content = re.sub(state_block, new_state, content)

# Change <img src="/logo.svg" /> to use theme
img_pattern = r"src=\"/logo\.svg\""
new_img = r"src={theme === 'light' ? '/logo-light.png' : '/logo-dark.png'}"
content = re.sub(img_pattern, new_img, content)

# There's also <Image src="/logo.svg" /> maybe? Or just <img ... />. We used regex on src="/logo.svg". Let's check for both.
img_pattern_2 = r"src=\{['\"]/logo\.svg['\"]\}"
content = re.sub(img_pattern_2, new_img, content)

# Add Settings to MOBILE NAV
mobnav_pattern = r"(<button\s*onClick=\{\(\) => setActiveTab\('tracker'\)\}.*?>[\s\S]*?</button>)"
new_mobnav = r"""\1
          <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center gap-1 text-meta hover:text-fg transition-colors">
            <Settings size={20} className="mb-1" />
            <span className="text-[10px] font-medium tracking-wide">Settings</span>
          </button>"""
content = re.sub(mobnav_pattern, new_mobnav, content)

with open('src/app/(main)/page.tsx', 'w') as f:
    f.write(content)

print("Favicon and logo replaced!")
