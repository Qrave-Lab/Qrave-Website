import {
    createContext,
    useContext,
    useReducer,
    type ReactNode,
    type Dispatch,
} from 'react';
import type { StudioState, StudioAction, ThemeConfig, PresetType } from '../types/studio';

export const defaultTheme: ThemeConfig = {
    preset: 'Default',
    fontFamily: 'Inter',
    motif: 'Minimal',
    cardStyle: 'Rounded',
    buttonStyle: 'Solid',
    sectionIcon: '✨',
    logoImage: null,
    backgroundImage: null,
    backgroundIntensity: 50,
    ornament: 'Off',
    header: 'Classic',
    pattern: 'None',
    iconPack: 'Auto',
    imageStyle: 'Rounded',
    layoutDensity: 'Comfortable',
    bannerText: '',
    restaurantName: 'Qrave Bistro',
    tableSubtitle: 'TABLE 1',
    enableTableServices: true,
    enableLanguageSelector: true,
    enableVegToggle: true,
    colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: '#0F172A',
        muted: '#64748B',
        accent: '#0F62FE',
        accentText: '#FFFFFF',
    }
};

const PRESETS_CONFIG: Record<PresetType, Partial<ThemeConfig>> = {
    Default: defaultTheme,
    Thai: {
        preset: 'Thai',
        fontFamily: 'Sarabun, sans-serif',
        motif: 'Elegant',
        cardStyle: 'Bordered',
        buttonStyle: 'Ghost',
        sectionIcon: '🌿',
        ornament: 'Prominent',
        header: 'Modern',
        pattern: 'Noise',
        logoImage: null,
        imageStyle: 'Square',
        layoutDensity: 'Spacious',
        colors: {
            background: '#FDFCF6',
            surface: '#F8F6ED',
            text: '#2A2416',
            muted: '#8B7E64',
            accent: '#D97706',
            accentText: '#FFFFFF',
        }
    },
    Indian: {
        preset: 'Indian',
        fontFamily: 'Rozha One, serif',
        motif: 'Playful',
        cardStyle: 'Shadow',
        buttonStyle: 'Solid',
        sectionIcon: '🌶️',
        ornament: 'Subtle',
        header: 'Bold',
        pattern: 'Dots',
        logoImage: null,
        imageStyle: 'Circle',
        layoutDensity: 'Comfortable',
        colors: {
            background: '#FFF5F0',
            surface: '#FFFFFF',
            text: '#4A1D11',
            muted: '#9E6D5D',
            accent: '#E11D48',
            accentText: '#FFFFFF',
        }
    },
    Minimal: {
        preset: 'Minimal',
        fontFamily: 'Inter, sans-serif',
        motif: 'Minimal',
        cardStyle: 'Flat',
        buttonStyle: 'Outline',
        sectionIcon: '·',
        ornament: 'Off',
        header: 'Classic',
        pattern: 'None',
        logoImage: null,
        imageStyle: 'Square',
        layoutDensity: 'Compact',
        colors: {
            background: '#FFFFFF',
            surface: '#FFFFFF',
            text: '#000000',
            muted: '#888888',
            accent: '#000000',
            accentText: '#FFFFFF',
        }
    }
};

const initialState: StudioState = {
    theme: defaultTheme,
    saveStatus: 'idle',
};

function studioReducer(state: StudioState, action: StudioAction): StudioState {
    switch (action.type) {
        case 'UPDATE_THEME':
            return {
                ...state,
                theme: { ...state.theme, ...action.payload },
                saveStatus: 'idle',
            };
        case 'UPDATE_COLORS':
            return {
                ...state,
                theme: {
                    ...state.theme,
                    colors: { ...state.theme.colors, ...action.payload },
                },
                saveStatus: 'idle',
            };
        case 'SET_SAVE_STATUS':
            return {
                ...state,
                saveStatus: action.payload,
            };
        case 'APPLY_PRESET':
            return {
                ...state,
                theme: {
                    ...state.theme,
                    ...PRESETS_CONFIG[action.payload],
                    preset: action.payload // explicitly ensure it's set
                },
                saveStatus: 'idle'
            };
        default:
            return state;
    }
}

interface StudioContextType {
    state: StudioState;
    dispatch: Dispatch<StudioAction>;
}

const StudioContext = createContext<StudioContextType | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(studioReducer, initialState);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
}

export function useStudio() {
    const ctx = useContext(StudioContext);
    if (!ctx) throw new Error('useStudio must be used within <StudioProvider>');
    return ctx;
}
