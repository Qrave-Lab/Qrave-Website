const fs = require('fs');
let content = fs.readFileSync("app/(pages)/menu/MenuUi.tsx", "utf-8");

const calRenderStr = `<p className="mt-1 text-[15px] font-bold text-[#3D2B1F] font-dm-sans leading-none">
                                {arItem.calories} kcal
                              </p>`;

const newCalRenderStr = `<p className="mt-1 text-[15px] font-bold text-[#3D2B1F] font-dm-sans leading-none">
                                {arItem.calories} kcal
                                {(arItem.proteinG != null || arItem.carbsG != null || arItem.fatG != null) && (
                                  <span className="block text-[10px] font-medium text-[#8B6E4F] mt-1">
                                    P:{arItem.proteinG || 0} C:{arItem.carbsG || 0} F:{arItem.fatG || 0}
                                  </span>
                                )}
                              </p>`;

content = content.replace(calRenderStr, newCalRenderStr);

// Also need to add type changes to MenuItem here if they are embedded.
const structStr = `  calories: number | null;`;
const newStructStr = `  calories: number | null;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  is_custom_macros?: boolean;`;

content = content.replace(structStr, newStructStr);

fs.writeFileSync("app/(pages)/menu/MenuUi.tsx", content);
