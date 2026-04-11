import re

path = 'app/(pages)/menu/MenuUi.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace static grid classes
content = content.replace('className="grid gap-6"', 'className={layoutGridClass}')

# Ensure layout={activeTheme.layout as any} is placed after orderingEnabled
# Some might already have it, so we can replace orderingEnabled solely first
content = re.sub(
    r'(orderingEnabled={orderingEnabled})\s*(layout=\{activeTheme\.layout as any\})?',
    r'\1\n                      layout={activeTheme.layout as any}',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
