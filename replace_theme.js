const fs = require('fs');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // Make buttons yellow
    content = content.replace(/bg-indigo-600 text-white/g, 'bg-[#FFC529] text-gray-900');
    content = content.replace(/bg-indigo-600 flex/g, 'bg-[#FFC529] text-gray-900 flex');
    content = content.replace(/bg-indigo-700/g, 'brightness-95/90');
    content = content.replace(/shadow-indigo-200/g, 'shadow-yellow-200');
    content = content.replace(/text-indigo-500/g, 'text-[#FFC529]');
    
    // Active tabs (like Takeaway "Active" filter)
    content = content.replace(/bg-slate-900 text-white border-slate-900/g, 'bg-[#FFC529] text-gray-900 border-[#FFC529]');
    
    // Takeaway selected zone
    content = content.replace(/bg-indigo-600 text-white border-indigo-600/g, 'bg-[#FFC529] text-gray-900 border-[#FFC529]');
    
    // Indigo borders / focus rings -> yellow
    content = content.replace(/border-indigo-400/g, 'border-[#FFC529]');
    content = content.replace(/ring-indigo-50/g, 'ring-yellow-100');
    content = content.replace(/ring-indigo-100/g, 'ring-yellow-100');
    content = content.replace(/ring-indigo-500\/20/g, 'ring-[#FFC529]/40');
    content = content.replace(/border-indigo-500/g, 'border-[#FFC529]');
    
    // Delivery badge
    content = content.replace(/bg-indigo-50 text-indigo-700 border-indigo-200/g, 'bg-yellow-50 text-yellow-800 border-yellow-200');

    // Sidebar active item
    if (filePath.includes('StaffSidebar')) {
        content = content.replace(/bg-gray-900 text-white shadow-sm/g, 'bg-[#FFC529] text-gray-900 shadow-sm font-semibold');
    }

    fs.writeFileSync(filePath, content);
}

const files = [
    'app/(pages)/staff/takeaway/page.tsx',
    'app/components/StaffSidebar.tsx',
    'app/(pages)/staff/kitchen/page.tsx',
    'app/(pages)/staff/menu/page.tsx',
    'app/components/settings/BranchManager.tsx',
    'app/components/settings/DeviceSettings.tsx',
    'app/components/settings/RestaurantProfile.tsx',
    'app/components/settings/StaffManager.tsx',
    'app/components/settings/TableManager.tsx'
];

files.forEach(replaceInFile);
console.log("Done");
