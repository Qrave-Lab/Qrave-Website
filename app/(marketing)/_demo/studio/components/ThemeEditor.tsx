import { useState } from 'react';
import { ChevronDown, Upload, Palette, LayoutTemplate, Type, Settings2, RotateCcw } from 'lucide-react';
import { useStudio, defaultTheme } from '../context/StudioContext';
import type {
    PresetType, MotifType, CardStyleType, ButtonStyleType,
    OrnamentType, HeaderType, PatternType, IconPackType,
    ImageStyleType, LayoutDensityType
} from '../types/studio';

const PRESETS: { name: PresetType; emoji: string; desc: string; colors: string[] }[] = [
    { name: 'Default', emoji: '✨', desc: 'Clean & modern', colors: ['#F8FAFC', '#0F62FE', '#0F172A'] },
    { name: 'Thai', emoji: '🪷', desc: 'Warm & earthy', colors: ['#FDFCF6', '#D97706', '#2A2416'] },
    { name: 'Indian', emoji: '🌶️', desc: 'Bold & vibrant', colors: ['#FFF5F0', '#E11D48', '#4A1D11'] },
    { name: 'Minimal', emoji: '◻️', desc: 'Stark & clean', colors: ['#FFFFFF', '#000000', '#888888'] }
];

type TabType = 'Presets' | 'Design' | 'Layout' | 'Advanced';

// Reusable select component to reduce repetition
function StyledSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    className="w-full h-9 px-3 pr-8 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium appearance-none outline-none focus:border-gray-400 focus:bg-white transition-colors"
                >
                    {options.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}

// Toggle button group for visual selection
function ToggleGroup<T extends string>({ label, value, options, onChange, renderOption }: { label: string; value: T; options: T[]; onChange: (v: T) => void; renderOption?: (opt: T) => React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">{label}</label>
            <div className="flex gap-1.5">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all ${value === opt
                            ? 'bg-[#111827] text-white shadow-sm'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        {renderOption ? renderOption(opt) : opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

// Simple toggle switch for boolean settings
function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-[12px] font-medium text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-[#111827]' : 'bg-gray-200'}`}
            >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

export default function ThemeEditor() {
    const { state, dispatch } = useStudio();
    const { theme } = state;

    const [activeTab, setActiveTab] = useState<TabType>('Presets');

    const updateTheme = (updates: Partial<typeof theme>) => {
        dispatch({ type: 'UPDATE_THEME', payload: updates });
    };

    const updateColor = (key: keyof typeof theme.colors, value: string) => {
        dispatch({ type: 'UPDATE_COLORS', payload: { [key]: value } });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateTheme({ backgroundImage: url });
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateTheme({ logoImage: url });
        }
    };

    const handleReset = () => {
        dispatch({ type: 'UPDATE_THEME', payload: defaultTheme });
        dispatch({ type: 'UPDATE_COLORS', payload: defaultTheme.colors });
    };

    const tabs = [
        { id: 'Presets' as const, icon: LayoutTemplate, label: 'Templates' },
        { id: 'Design' as const, icon: Palette, label: 'Design' },
        { id: 'Layout' as const, icon: Type, label: 'Layout' },
        { id: 'Advanced' as const, icon: Settings2, label: 'Advanced' }
    ];

    return (
        <div className="w-[520px] flex-shrink-0 border-r border-gray-100 bg-white flex flex-col h-full">
            {/* ── Header ──────────────────────────────── */}
            <div className="p-5 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-[20px] font-bold text-gray-900 tracking-tight">Theme Studio</h2>
                        <p className="text-[12px] text-gray-400 mt-0.5">Customize your menu appearance</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all border border-gray-200 hover:border-red-200"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                    </button>
                </div>

                <div className="flex gap-1.5 bg-gray-50 p-1 rounded-xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab Content ─────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5 pb-32">

                {/* ═══ PRESETS ═══ */}
                {activeTab === 'Presets' && (
                    <div className="space-y-3">
                        <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Choose a Starting Point</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => dispatch({ type: 'APPLY_PRESET', payload: preset.name })}
                                    className={`group p-4 rounded-xl text-left transition-all border-2 ${theme.preset === preset.name
                                        ? 'border-[#111827] bg-[#111827] text-white shadow-lg'
                                        : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[18px]">{preset.emoji}</span>
                                        {theme.preset === preset.name && (
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        )}
                                    </div>
                                    <h4 className="text-[14px] font-bold mb-0.5">{preset.name}</h4>
                                    <p className={`text-[11px] mb-3 ${theme.preset === preset.name ? 'text-white/60' : 'text-gray-400'}`}>{preset.desc}</p>
                                    <div className="flex gap-1">
                                        {preset.colors.map((c, i) => (
                                            <div
                                                key={i}
                                                className="w-5 h-5 rounded-full ring-1 ring-black/10"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ DESIGN ═══ */}
                {activeTab === 'Design' && (
                    <div className="space-y-7">
                        {/* Branding & Logo */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Restaurant Name</label>
                                    <input
                                        type="text"
                                        value={theme.restaurantName}
                                        onChange={(e) => updateTheme({ restaurantName: e.target.value })}
                                        className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-gray-400 focus:bg-white transition-colors"
                                        placeholder="Qrave Bistro"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Table Subtitle</label>
                                    <input
                                        type="text"
                                        value={theme.tableSubtitle}
                                        onChange={(e) => updateTheme({ tableSubtitle: e.target.value })}
                                        className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-gray-400 focus:bg-white transition-colors"
                                        placeholder="TABLE 1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Restaurant Logo</label>
                                    {theme.logoImage && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); updateTheme({ logoImage: null }); }}
                                            className="text-[10px] text-red-500 hover:text-red-600 font-semibold"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                        {theme.logoImage ? (
                                            <img src={theme.logoImage} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Upload className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/png, image/jpeg, image/webp"
                                            onChange={handleLogoUpload}
                                        />
                                        <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-center text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
                                            {theme.logoImage ? 'Replace Logo' : 'Upload Logo'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Colors */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Color Palette</label>
                            <div className="grid grid-cols-3 gap-3">
                                {Object.entries(theme.colors).map(([key, value]) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-medium text-gray-400 block capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </label>
                                        <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden h-9 items-center gap-1 px-1.5">
                                            <input
                                                type="color"
                                                value={value}
                                                onChange={(e) => updateColor(key as keyof typeof theme.colors, e.target.value)}
                                                className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                                            />
                                            <input
                                                type="text"
                                                value={value}
                                                onChange={(e) => updateColor(key as keyof typeof theme.colors, e.target.value.toUpperCase())}
                                                className="w-full h-full text-[10px] font-mono text-gray-600 outline-none uppercase bg-transparent"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Component Styles */}
                        <ToggleGroup
                            label="Card Style"
                            value={theme.cardStyle}
                            options={['Flat', 'Rounded', 'Shadow', 'Bordered'] as CardStyleType[]}
                            onChange={(v) => updateTheme({ cardStyle: v })}
                        />

                        <ToggleGroup
                            label="Button Style"
                            value={theme.buttonStyle}
                            options={['Solid', 'Outline', 'Ghost', 'Pill'] as ButtonStyleType[]}
                            onChange={(v) => updateTheme({ buttonStyle: v })}
                        />

                        {/* Typography */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Font Family</label>
                            <input
                                type="text"
                                value={theme.fontFamily}
                                onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                                className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-gray-400 focus:bg-white transition-colors"
                                placeholder="e.g. 'Inter', sans-serif"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <StyledSelect label="Header Style" value={theme.header} options={['Classic', 'Modern', 'Bold', 'Underline'] as HeaderType[]} onChange={(v) => updateTheme({ header: v })} />
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Section Icon</label>
                                <input
                                    type="text"
                                    value={theme.sectionIcon}
                                    onChange={(e) => updateTheme({ sectionIcon: e.target.value })}
                                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[16px] text-center outline-none focus:border-gray-400 focus:bg-white transition-colors"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                    </div >
                )
                }

                {/* ═══ LAYOUT ═══ */}
                {
                    activeTab === 'Layout' && (
                        <div className="space-y-7">
                            <ToggleGroup
                                label="Motif"
                                value={theme.motif}
                                options={['Minimal', 'Classic', 'Playful', 'Elegant'] as MotifType[]}
                                onChange={(v) => updateTheme({ motif: v })}
                            />

                            <ToggleGroup
                                label="Density"
                                value={theme.layoutDensity}
                                options={['Compact', 'Comfortable', 'Spacious'] as LayoutDensityType[]}
                                onChange={(v) => updateTheme({ layoutDensity: v })}
                            />

                            <ToggleGroup
                                label="Image Style"
                                value={theme.imageStyle}
                                options={['Square', 'Rounded', 'Circle', 'Hidden'] as ImageStyleType[]}
                                onChange={(v) => updateTheme({ imageStyle: v })}
                            />

                            {/* Banner */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Banner Text</label>
                                <input
                                    type="text"
                                    value={theme.bannerText}
                                    onChange={(e) => updateTheme({ bannerText: e.target.value })}
                                    className="w-full h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-gray-400 focus:bg-white transition-colors"
                                    placeholder="e.g. 10% OFF ALL BURGERS TODAY"
                                />
                                {theme.bannerText && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-6 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center" style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentText }}>
                                            {theme.bannerText}
                                        </div>
                                        <button
                                            onClick={() => updateTheme({ bannerText: '' })}
                                            className="text-[10px] text-gray-400 hover:text-red-500 font-semibold transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {/* ═══ ADVANCED ═══ */}
                {
                    activeTab === 'Advanced' && (
                        <div className="space-y-7">
                            {/* Interactive Features */}
                            <div className="space-y-3 pb-5 border-b border-gray-100">
                                <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Interactive Features</label>
                                <ToggleSwitch label="Enable Table Services (FAB)" checked={theme.enableTableServices} onChange={(v) => updateTheme({ enableTableServices: v })} />
                                <ToggleSwitch label="Enable Language Selector" checked={theme.enableLanguageSelector} onChange={(v) => updateTheme({ enableLanguageSelector: v })} />
                                <ToggleSwitch label="Enable Veg/Non-veg Toggle" checked={theme.enableVegToggle} onChange={(v) => updateTheme({ enableVegToggle: v })} />
                            </div>

                            {/* Background Upload */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-semibold text-gray-500 block uppercase tracking-wider">Background Image</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-5 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-all relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleFileUpload}
                                    />
                                    {theme.backgroundImage ? (
                                        <img src={theme.backgroundImage} alt="Bg" className="w-16 h-16 object-cover rounded-lg shadow-md mb-2" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-gray-300 mb-2" />
                                    )}
                                    <p className="text-[12px] font-medium text-gray-600">{theme.backgroundImage ? 'Replace image' : 'Upload background'}</p>
                                    <p className="text-[10px] text-gray-400">PNG / JPG / WEBP</p>
                                    {theme.backgroundImage && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); updateTheme({ backgroundImage: null }); }}
                                            className="mt-2 px-3 py-1 bg-red-50 text-red-500 hover:bg-red-100 text-[10px] font-bold rounded-md relative z-10 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>

                                {theme.backgroundImage && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-medium text-gray-500">
                                            <span>Opacity</span>
                                            <span>{theme.backgroundIntensity}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="100"
                                            value={theme.backgroundIntensity}
                                            onChange={(e) => updateTheme({ backgroundIntensity: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none outline-none accent-[#111827]"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Effects */}
                            <ToggleGroup
                                label="Ornament"
                                value={theme.ornament}
                                options={['Off', 'Subtle', 'Prominent'] as OrnamentType[]}
                                onChange={(v) => updateTheme({ ornament: v })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <StyledSelect label="Pattern" value={theme.pattern} options={['None', 'Dots', 'Lines', 'Noise'] as PatternType[]} onChange={(v) => updateTheme({ pattern: v })} />
                                <StyledSelect label="Icon Pack" value={theme.iconPack} options={['Auto', 'Line', 'Solid', 'Duotone'] as IconPackType[]} onChange={(v) => updateTheme({ iconPack: v })} />
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
