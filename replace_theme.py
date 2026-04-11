import os
import re

directory = 'app'

# Regular expressions to find colors
patterns = [
    # Primary solid buttons & background colors
    (r'bg-indigo-600(.*?)text-white', r'bg-[#FFC529]\1text-gray-900'),
    (r'bg-indigo-600(.*?)flex', r'bg-[#FFC529]\1text-gray-900 flex'),
    (r'bg-indigo-600', r'bg-[#FFC529] text-gray-900'), # Catch any other bg-indigo-600
    (r'bg-indigo-700', r'brightness-95'),
    
    # Text colors
    (r'text-indigo-500', r'text-[#FFC529]'),
    (r'text-indigo-600', r'text-[#FFC529]'),
    (r'text-indigo-700', r'text-gray-900'), # Usually for large numbers, prefer dark
    
    # Borders and Rings
    (r'border-indigo-400', r'border-[#FFC529]'),
    (r'border-indigo-500', r'border-[#FFC529]'),
    (r'border-indigo-600', r'border-[#FFC529]'),
    (r'ring-indigo-100', r'ring-yellow-100'),
    (r'ring-indigo-50', r'ring-yellow-50'),
    (r'ring-indigo-500/20', r'ring-[#FFC529]/40'),
    (r'ring-indigo-500', r'ring-[#FFC529]'),
    (r'shadow-indigo-200', r'shadow-[#FFC529]/30'),
    
    # Subtle backgrounds (like indigo-50)
    (r'bg-indigo-50 text-indigo-700 border-indigo-200', r'bg-yellow-50 text-[#FFC529] border-yellow-200'),
    (r'bg-indigo-50', r'bg-slate-50'), # Drop other indigo tints to neutral
    (r'bg-indigo-50/50', r'bg-slate-50/50'),
    (r'border-indigo-100', r'border-slate-200'),
    (r'border-indigo-200', r'border-[#FFC529]'),
    (r'text-indigo-400', r'text-[#FFC529]'),
    
    # Dark Mode / Slate-900 tabs and primary buttons that act like brand colors
    (r'bg-slate-900 text-white border-slate-900', r'bg-[#FFC529] text-gray-900 border-[#FFC529]'),
    (r'bg-slate-900 text-white shadow-sm', r'bg-[#FFC529] text-gray-900 shadow-sm font-semibold'),
    # Dark buttons that shouldn't just be black if they are main actions
    # Actually, we already modified StaffSidebar and Operations/Takeaway manually
]

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pat, repl in patterns:
                new_content = re.sub(pat, repl, new_content)
                
            # Slate-900 buttons (careful to match "bg-slate-900 text-white" exactly within className)
            new_content = re.sub(r'bg-slate-900([^"]*?)text-white([^"]*?)hover:bg-slate-800', r'bg-[#FFC529]\1text-gray-900\2hover:brightness-95', new_content)
            
            # Active tabs in Menu Engineering:
            # e.g. active === c.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            new_content = new_content.replace('"bg-slate-900 text-white"', '"bg-[#FFC529] text-gray-900 font-bold"')
            new_content = new_content.replace('bg-slate-900 text-white shadow', 'bg-[#FFC529] text-gray-900 shadow font-bold')

            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")
