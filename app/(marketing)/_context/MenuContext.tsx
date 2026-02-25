import {
    createContext,
    useContext,
    useReducer,
    useEffect,
    type ReactNode,
    type Dispatch,
} from 'react';
import type {
    MenuState,
    MenuAction,
    MenuItem,
    MenuCategory,
    SubCategory,
    CanvasLayout,
    QRConfig,
    RestaurantProfile,
} from '../types/menu';

// ─── Storage ─────────────────────────────────────────────────

const STORAGE_KEY = 'qrave_demo_module_v2';
const BURGER_RECOVERY_KEY = 'qrave_demo_burger_recovered_v2';

// ─── Defaults ────────────────────────────────────────────────

const defaultCategories: MenuCategory[] = [
    { id: 'cat-burgers', name: 'Burgers', sortOrder: 0 },
    { id: 'cat-food', name: 'Food', sortOrder: 1 },
];

const defaultSubCategories: SubCategory[] = [
    { id: 'sub-burgers-general', name: 'General', categoryGroupId: 'cat-burgers', sortOrder: 0 },
    { id: 'sub-food-chinese', name: 'Chinese', categoryGroupId: 'cat-food', sortOrder: 0 },
    { id: 'sub-food-general', name: 'General', categoryGroupId: 'cat-food', sortOrder: 1 },
];

const defaultItems: MenuItem[] = [
    {
        id: 'item-1',
        name: 'Burger',
        description: 'Hello',
        price: 200,
        image: '/landing/img-26ac90d1.webp',
        isVeg: false,
        inStock: true,
        archived: false,
        categoryId: 'cat-burgers',
        subcategoryId: 'sub-burgers-general',
        calories: 450,
        allergens: [],
        categoryGroup: 'Burgers',
    },
    {
        id: 'item-2',
        name: 'Fried Rice',
        description: '',
        price: 180,
        image: '/landing/img-26ac90d1.webp',
        isVeg: false,
        inStock: true,
        archived: false,
        categoryId: 'cat-food',
        subcategoryId: 'sub-food-chinese',
        calories: 380,
        allergens: [],
        categoryGroup: 'Food',
    },
    {
        id: 'item-3',
        name: 'Chicken mandi',
        description: 'mandi rice',
        price: 720,
        image: '/landing/img-abae91f0.webp',
        isVeg: false,
        inStock: true,
        archived: false,
        categoryId: 'cat-food',
        subcategoryId: 'sub-food-general',
        calories: 520,
        allergens: [],
        categoryGroup: 'Food',
    },
];

const defaultCanvasLayout: CanvasLayout = {
    version: 1,
    width: 420,
    height: 760,
    background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)' },
    objects: [],
};

const defaultQRConfig: QRConfig = {
    fgColor: '#1A1A1A',
    bgColor: '#FFFFFF',
    logoUrl: '',
    backgroundImageUrl: '',
    frameStyle: 'rounded',
    textBelow: 'SCAN ME',
    headline: 'Scan to Order',
    subHeadline: 'View menu, order & pay from your phone.',
    wifiName: '',
    wifiPassword: '',
    size: 320,
};

const defaultRestaurant: RestaurantProfile = {
    name: 'Qrave Bistro',
    tagline: 'Modern Indian Kitchen & Bar',
    accentColor: '#FFC529',
    logoUrl: '',
    currency: 'INR',
};

const defaultState: MenuState = {
    restaurant: defaultRestaurant,
    categories: defaultCategories,
    subcategories: defaultSubCategories,
    items: defaultItems,
    canvasLayout: defaultCanvasLayout,
    qrConfig: defaultQRConfig,
};

// ─── Reducer ─────────────────────────────────────────────────

function menuReducer(state: MenuState, action: MenuAction): MenuState {
    switch (action.type) {
        case 'ADD_ITEM':
            return { ...state, items: [...state.items, action.payload] };

        case 'UPDATE_ITEM':
            return {
                ...state,
                items: state.items.map((i) =>
                    i.id === action.payload.id ? { ...i, ...action.payload.updates } : i
                ),
            };

        case 'DELETE_ITEM':
            return { ...state, items: state.items.filter((i) => i.id !== action.payload) };

        case 'SET_ITEMS':
            return { ...state, items: action.payload };

        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] };

        case 'UPDATE_CATEGORY':
            return {
                ...state,
                categories: state.categories.map((c) =>
                    c.id === action.payload.id ? { ...c, name: action.payload.name } : c
                ),
            };

        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter((c) => c.id !== action.payload),
                items: state.items.filter((i) => i.categoryId !== action.payload),
            };

        case 'ADD_SUBCATEGORY':
            return { ...state, subcategories: [...(state.subcategories || []), action.payload] };

        case 'UPDATE_SUBCATEGORY':
            return {
                ...state,
                subcategories: (state.subcategories || []).map((s) =>
                    s.id === action.payload.id ? { ...s, name: action.payload.name } : s
                ),
            };

        case 'DELETE_SUBCATEGORY':
            return {
                ...state,
                subcategories: (state.subcategories || []).filter((s) => s.id !== action.payload),
            };

        case 'UPDATE_RESTAURANT':
            return { ...state, restaurant: { ...state.restaurant, ...action.payload } };

        case 'UPDATE_CANVAS_LAYOUT':
            return { ...state, canvasLayout: action.payload };

        case 'UPDATE_QR_CONFIG':
            return { ...state, qrConfig: { ...state.qrConfig, ...action.payload } };

        case 'RESET':
            return defaultState;

        default:
            return state;
    }
}

// ─── Context ─────────────────────────────────────────────────

interface MenuContextValue {
    state: MenuState;
    dispatch: Dispatch<MenuAction>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(menuReducer, null, () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return { ...defaultState, ...JSON.parse(raw) } as MenuState;
        } catch {
            /* first load */
        }
        return defaultState;
    });

    // One-time recovery: restore Burger if it was accidentally removed.
    useEffect(() => {
        if (localStorage.getItem(BURGER_RECOVERY_KEY) === '1') return;
        const hasBurger = state.items.some(
            (item) => item.id === 'item-1' || item.name.trim().toLowerCase() === 'burger'
        );
        if (!hasBurger) {
            const defaultBurger = defaultItems.find((item) => item.id === 'item-1');
            if (defaultBurger) {
                dispatch({ type: 'ADD_ITEM', payload: defaultBurger });
            }
        }
        localStorage.setItem(BURGER_RECOVERY_KEY, '1');
    }, [state.items]);

    // Persist on every state change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    return (
        <MenuContext.Provider value={{ state, dispatch }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const ctx = useContext(MenuContext);
    if (!ctx) throw new Error('useMenu must be used within <MenuProvider>');
    return ctx;
}

export { defaultItems, defaultState };
