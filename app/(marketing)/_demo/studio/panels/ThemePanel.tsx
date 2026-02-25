import { Sparkles } from 'lucide-react';
import { THEMES, type ThemePreset } from '../templates/themes';

interface ThemePanelProps {
    currentThemeId: string;
    onApplyTheme: (theme: ThemePreset) => void;
}

export default function ThemePanel({ currentThemeId, onApplyTheme }: ThemePanelProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#FFC529]" />
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Theme Presets
                </label>
            </div>

            <div className="space-y-1.5">
                {THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => onApplyTheme(theme)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm ${currentThemeId === theme.id
                            ? 'border-[#FFC529] bg-[#FFC529]/5 shadow-sm ring-1 ring-[#FFC529]/20'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                    >
                        {/* Color dots */}
                        <div className="flex gap-0.5">
                            {[theme.colors.primary, theme.colors.background, theme.colors.text, theme.colors.price].map((c, i) => (
                                <div
                                    key={i}
                                    className="h-4 w-4 rounded-full border border-gray-200/50"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>

                        <div className="flex-1 text-left">
                            <p className="text-[11px] font-bold text-gray-700">{theme.name}</p>
                            <p className="text-[9px] text-gray-400">
                                {theme.typography.headingFont} · {theme.typography.bodyFont}
                            </p>
                        </div>

                        {currentThemeId === theme.id && (
                            <span className="rounded-full bg-[#FFC529] px-1.5 py-0.5 text-[8px] font-bold text-white">
                                Active
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-[9px] text-gray-400 text-center">
                Applying a theme updates all element colors and fonts globally
            </p>
        </div>
    );
}
