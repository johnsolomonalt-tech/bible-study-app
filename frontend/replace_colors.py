import re

with open('src/app/(main)/page.tsx', 'r') as f:
    content = f.read()

replacements = {
    r'bg-\[\#141413\]': 'bg-bg',
    r'text-\[\#141413\]': 'text-bg',
    r'border-\[\#141413\]': 'border-bg',
    
    r'bg-\[\#30302e\]': 'bg-surface',
    r'border-\[\#30302e\]': 'border-border',
    r'ring-\[\#30302e\]': 'ring-border',
    r'text-\[\#30302e\]': 'text-surface',

    r'bg-\[\#3d3d3a\]': 'bg-surface-warm',
    r'bg-\[\#393936\]': 'bg-surface-warm',
    r'bg-\[\#252523\]': 'bg-surface',

    r'text-\[\#faf9f5\]': 'text-fg',
    r'text-\[\#b0aea5\]': 'text-fg-2',
    r'text-\[\#87867f\]': 'text-muted',
    r'text-\[\#5e5d59\]': 'text-meta',
    r'text-\[\#c96442\]': 'text-accent',
    r'text-\[\#e4e1cf\]': 'text-fg-hover',
    r'text-\[\#1c1c1b\]': 'text-fg-hover', # actually text-fg-hover or darker

    r'bg-\[\#c96442\]': 'bg-accent',
    r'border-\[\#4d4c48\]': 'border-border-soft',
    r'ring-\[\#4d4c48\]': 'ring-border-soft',
    r'bg-\[\#4d4c48\]': 'bg-border-soft',
    
    r'text-\[\#ef4444\]': 'text-error',
    r'bg-\[\#ef4444\]/10': 'bg-error/10',
    
    r'fill-\[\#b0aea5\]': 'fill-fg-2',
    r'fill-\[\#faf9f5\]': 'fill-fg',
}

for pattern, repl in replacements.items():
    content = re.sub(pattern, repl, content)

with open('src/app/(main)/page.tsx', 'w') as f:
    f.write(content)

print("Colors refactored!")
