const fs = require('fs');
let content = fs.readFileSync("app/components/menu/FoodCard.tsx", "utf-8");

const structStr = `  calories?: number | string;`;
const newStructStr = `  calories?: number | string;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;`;
content = content.replace(structStr, newStructStr);

const renderStr = `{item.calories && (
                <span className="inline-flex items-center bg-[#F7F2EB] text-[#6B5B4E] rounded-full px-2 py-0.5 text-[10px] font-[600] border border-[#EDE5D8] gap-1 leading-none">
                  <Flame className="w-2.5 h-2.5 text-[#3D2B1F]" />
                  {item.calories} kcal
                </span>
              )}`;

const newRenderStr = `{item.calories && (
                <span className="inline-flex items-center bg-[#F7F2EB] text-[#6B5B4E] rounded-full px-2 py-0.5 text-[10px] font-[600] border border-[#EDE5D8] gap-1 leading-none">
                  <Flame className="w-2.5 h-2.5 text-[#3D2B1F]" />
                  {item.calories} kcal
                  {(item.proteinG != null || item.carbsG != null || item.fatG != null) && (
                    <span className="ml-0.5 opacity-80 border-l border-[#6B5B4E]/20 pl-1">
                      P:{item.proteinG || 0} C:{item.carbsG || 0} F:{item.fatG || 0}
                    </span>
                  )}
                </span>
              )}`;

content = content.replace(renderStr, newRenderStr);
fs.writeFileSync("app/components/menu/FoodCard.tsx", content);
