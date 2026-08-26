const fs = require('fs');
let content = fs.readFileSync("app/(pages)/menu/MenuUi.tsx", "utf-8");

const calStr = `calories:
      typeof item.calories === "number"
        ? item.calories
        : item.kcal || item.nutrition?.calories,`;
        
const newCalStr = `calories:
      typeof item.calories === "number"
        ? item.calories
        : item.kcal || item.nutrition?.calories,
    proteinG: item.protein_g ?? item.proteinG ?? null,
    carbsG: item.carbs_g ?? item.carbsG ?? null,
    fatG: item.fat_g ?? item.fatG ?? null,`;

content = content.replace(calStr, newCalStr);

const arStr = `<p className="mt-1 text-base font-black text-slate-900">
                        {arItem.calories ? \`\${arItem.calories} kcal\` : "—"}
                      </p>`;

const newArStr = `<p className="mt-1 text-base font-black text-slate-900">
                        {arItem.calories ? (
                          <span>
                            {arItem.calories} kcal
                            {(arItem.proteinG != null || arItem.carbsG != null || arItem.fatG != null) && (
                               <span className="block text-xs font-bold text-slate-500 mt-0.5">
                                 P:{arItem.proteinG || 0} C:{arItem.carbsG || 0} F:{arItem.fatG || 0}
                               </span>
                            )}
                          </span>
                        ) : "—"}
                      </p>`;
content = content.replace(arStr, newArStr);

fs.writeFileSync("app/(pages)/menu/MenuUi.tsx", content);
