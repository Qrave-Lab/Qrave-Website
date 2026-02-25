import { useState } from 'react';
import { X, Sparkles, Layout } from 'lucide-react';
import { TEMPLATES, type MenuTemplate } from './templateData';
import { THEMES, type ThemePreset } from './themes';

interface TemplateGalleryProps {
    onSelectTemplate: (templateId: string, theme: ThemePreset) => void;
    onClose: () => void;
}

const categoryLabels: Record<string, string> = {
    'all': 'All Templates',
    'fine-dining': 'Fine Dining',
    'cafe': 'Cafe & Bistro',
    'street-food': 'Street Food',
    'bar': 'Bar & Lounge',
    'minimal': 'Minimal',
};

const templateThumbnailColors: Record<string, { bg: string; accent: string }> = {
    'fine-dining': { bg: '#0F0F0F', accent: '#C9A54E' },
    'modern-cafe': { bg: '#FFFFFF', accent: '#FFC529' },
    'street-food': { bg: '#FFF8E7', accent: '#FFC529' },
    'luxury-bar': { bg: '#0A0A0A', accent: '#C9A54E' },
    'minimal-mono': { bg: '#FFFFFF', accent: '#111827' },
};

export default function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedThemeId, setSelectedThemeId] = useState('warm-gold');

    const filtered = activeCategory === 'all'
        ? TEMPLATES
        : TEMPLATES.filter(t => t.category === activeCategory);

    const handleSelect = (template: MenuTemplate) => {
        const theme = THEMES.find(t => t.id === selectedThemeId) || THEMES.find(t => t.id === template.themeId) || THEMES[0];
        onSelectTemplate(template.id, theme);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="relative mx-4 max-h-[85vh] w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-lg bg-[#FFC529]/10 p-1.5">
                            <Layout className="h-4 w-4 text-[#D9A016]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Choose a Template</h2>
                            <p className="text-[10px] text-gray-400">Pick a layout, customize it your way</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-1 border-b border-gray-100 px-6 py-2">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-all ${activeCategory === key
                                ? 'bg-gray-900 text-white shadow-sm'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="grid grid-cols-3 gap-4 overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 200px)' }}>
                    {filtered.map((template) => {
                        const colors = templateThumbnailColors[template.id] || { bg: '#fff', accent: '#000' };
                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 transition-all hover:border-[#FFC529] hover:shadow-lg hover:shadow-[#FFC529]/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {/* Thumbnail */}
                                <div
                                    className="relative aspect-[420/760] w-full overflow-hidden"
                                    style={{ backgroundColor: colors.bg }}
                                >
                                    {/* Mini preview */}
                                    <div className="flex h-full flex-col items-center justify-start p-4">
                                        <div
                                            className="mt-2 h-1 w-8 rounded-full"
                                            style={{ backgroundColor: colors.accent }}
                                        />
                                        <div
                                            className="mt-3 text-[8px] font-black uppercase tracking-widest"
                                            style={{ color: colors.accent }}
                                        >
                                            Restaurant
                                        </div>
                                        <div className="mt-1 text-[5px] opacity-50" style={{ color: colors.accent }}>
                                            Tagline goes here
                                        </div>
                                        <div className="mt-4 w-full space-y-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex justify-between px-1">
                                                    <div
                                                        className="h-1.5 rounded-full"
                                                        style={{ backgroundColor: colors.accent, width: '50%', opacity: 0.4 }}
                                                    />
                                                    <div
                                                        className="h-1.5 w-6 rounded-full"
                                                        style={{ backgroundColor: colors.accent, opacity: 0.6 }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/30">
                                        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-gray-900 opacity-0 shadow-lg transition-all group-hover:opacity-100 group-hover:scale-100 scale-90">
                                            Use Template
                                        </span>
                                    </div>
                                </div>

                                {/* Label */}
                                <div className="border-t border-gray-100 px-3 py-2.5">
                                    <p className="text-[11px] font-bold text-gray-800">{template.name}</p>
                                    <p className="mt-0.5 text-[9px] text-gray-400 line-clamp-1">{template.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Theme Picker Footer */}
                <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-3.5 w-3.5 text-[#FFC529]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Color Theme
                        </span>
                        <div className="flex gap-1.5 ml-2">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setSelectedThemeId(theme.id)}
                                    title={theme.name}
                                    className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${selectedThemeId === theme.id
                                        ? 'border-[#FFC529] ring-2 ring-[#FFC529]/30 scale-110'
                                        : 'border-gray-200'
                                        }`}
                                    style={{ backgroundColor: theme.colors.primary }}
                                />
                            ))}
                        </div>
                        <div className="ml-auto text-[9px] font-medium text-gray-400">
                            {THEMES.find(t => t.id === selectedThemeId)?.name}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
