const fs = require('fs');
let content = fs.readFileSync("app/components/menu/ImmersiveMenu.tsx", "utf-8");

const calStr = `<span className="text-xs font-semibold text-slate-600">{currentItem.calories} kcal</span>`;
const newCalStr = `<span className="text-xs font-semibold text-slate-600">
                                            {currentItem.calories} kcal
                                            {(currentItem.proteinG != null || currentItem.carbsG != null || currentItem.fatG != null) && (
                                                <span className="ml-1 opacity-75">
                                                    (P:{currentItem.proteinG || 0} C:{currentItem.carbsG || 0} F:{currentItem.fatG || 0})
                                                </span>
                                            )}
                                        </span>`;
                                        
content = content.replace(calStr, newCalStr);
fs.writeFileSync("app/components/menu/ImmersiveMenu.tsx", content);
