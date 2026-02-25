// ─── Theme Presets ───────────────────────────────────────────

export interface ThemePreset {
    id: string;
    name: string;
    colors: {
        primary: string;
        text: string;
        heading: string;
        price: string;
        background: string;
        divider: string;
        accent: string;
    };
    typography: {
        headingFont: string;
        bodyFont: string;
        priceFont: string;
    };
}

export const THEMES: ThemePreset[] = [
    {
        id: 'warm-gold',
        name: 'Warm Gold',
        colors: {
            primary: '#FFC529',
            text: '#111827',
            heading: '#000000',
            price: '#D9A016',
            background: '#FFFFFF',
            divider: '#F3F4F6',
            accent: '#FEF3C7',
        },
        typography: {
            headingFont: 'Outfit',
            bodyFont: 'Plus Jakarta Sans',
            priceFont: 'Plus Jakarta Sans',
        },
    },
    {
        id: 'midnight-luxe',
        name: 'Midnight Luxe',
        colors: {
            primary: '#C9A54E',
            text: '#E5E7EB',
            heading: '#FFFFFF',
            price: '#C9A54E',
            background: '#0F0F0F',
            divider: '#1F1F1F',
            accent: '#1A1A2E',
        },
        typography: {
            headingFont: 'Playfair Display',
            bodyFont: 'Inter',
            priceFont: 'Inter',
        },
    },
    {
        id: 'forest-green',
        name: 'Forest Green',
        colors: {
            primary: '#059669',
            text: '#1F2937',
            heading: '#064E3B',
            price: '#059669',
            background: '#F0FDF4',
            divider: '#D1FAE5',
            accent: '#ECFDF5',
        },
        typography: {
            headingFont: 'DM Sans',
            bodyFont: 'Inter',
            priceFont: 'DM Sans',
        },
    },
    {
        id: 'rose-blush',
        name: 'Rosé Blush',
        colors: {
            primary: '#E11D48',
            text: '#1F2937',
            heading: '#881337',
            price: '#E11D48',
            background: '#FFF1F2',
            divider: '#FECDD3',
            accent: '#FFE4E6',
        },
        typography: {
            headingFont: 'Lora',
            bodyFont: 'Plus Jakarta Sans',
            priceFont: 'Plus Jakarta Sans',
        },
    },
    {
        id: 'monochrome',
        name: 'Monochrome',
        colors: {
            primary: '#111827',
            text: '#374151',
            heading: '#000000',
            price: '#111827',
            background: '#FFFFFF',
            divider: '#E5E7EB',
            accent: '#F9FAFB',
        },
        typography: {
            headingFont: 'Inter',
            bodyFont: 'Inter',
            priceFont: 'Inter',
        },
    },
];

export function getThemeById(id: string): ThemePreset {
    return THEMES.find(t => t.id === id) || THEMES[0];
}
