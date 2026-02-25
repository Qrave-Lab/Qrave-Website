export type PresetType = 'Default' | 'Thai' | 'Indian' | 'Minimal';
export type MotifType = 'Minimal' | 'Classic' | 'Playful' | 'Elegant';
export type CardStyleType = 'Flat' | 'Rounded' | 'Shadow' | 'Bordered';
export type ButtonStyleType = 'Solid' | 'Outline' | 'Ghost' | 'Pill';
export type OrnamentType = 'Off' | 'Subtle' | 'Prominent';
export type HeaderType = 'Classic' | 'Modern' | 'Bold' | 'Underline';
export type PatternType = 'None' | 'Dots' | 'Lines' | 'Noise';
export type IconPackType = 'Auto' | 'Line' | 'Solid' | 'Duotone';
export type ImageStyleType = 'Square' | 'Rounded' | 'Circle' | 'Hidden';
export type LayoutDensityType = 'Compact' | 'Comfortable' | 'Spacious';

export interface ThemeColors {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
}

export interface ThemeConfig {
    preset: PresetType;
    fontFamily: string;
    motif: MotifType;
    cardStyle: CardStyleType;
    buttonStyle: ButtonStyleType;
    sectionIcon: string;
    logoImage: string | null;
    backgroundImage: string | null;
    backgroundIntensity: number;
    ornament: OrnamentType;
    header: HeaderType;
    pattern: PatternType;
    iconPack: IconPackType;
    imageStyle: ImageStyleType;
    layoutDensity: LayoutDensityType;
    bannerText: string;
    restaurantName: string;
    tableSubtitle: string;
    enableTableServices: boolean;
    enableLanguageSelector: boolean;
    enableVegToggle: boolean;
    colors: ThemeColors;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface StudioState {
    theme: ThemeConfig;
    saveStatus: SaveStatus;
}

export type StudioAction =
    | { type: 'UPDATE_THEME'; payload: Partial<ThemeConfig> }
    | { type: 'UPDATE_COLORS'; payload: Partial<ThemeColors> }
    | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
    | { type: 'APPLY_PRESET'; payload: PresetType };
