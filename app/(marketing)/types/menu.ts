export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    isVeg: boolean;
    inStock: boolean;
    archived: boolean;
    categoryId: string;
    subcategoryId?: string;
    calories?: number;
    allergens?: string[];
    categoryGroup?: string;
    variants?: any[];
    availableDays?: string[];
    modifierGroups?: any[];
    ingredients?: string[];
    availableFrom?: string;
    availableTo?: string;
}

export interface MenuCategory {
    id: string;
    name: string;
    sortOrder: number;
}

export interface SubCategory {
    id: string;
    name: string;
    categoryGroupId: string;
    sortOrder: number;
}

export interface CanvasLayout {
    version: number;
    width: number;
    height: number;
    background: { type: string; value: string };
    objects: any[];
}

export interface QRConfig {
    fgColor: string;
    bgColor: string;
    logoUrl: string;
    backgroundImageUrl: string;
    frameStyle: string;
    textBelow: string;
    headline: string;
    subHeadline: string;
    wifiName?: string;
    wifiPassword?: string;
    size: number;
}

export interface RestaurantProfile {
    name: string;
    tagline: string;
    accentColor: string;
    logoUrl: string;
    currency: string;
}

export interface MenuState {
    restaurant: RestaurantProfile;
    categories: MenuCategory[];
    subcategories: SubCategory[];
    items: MenuItem[];
    canvasLayout: CanvasLayout;
    qrConfig: QRConfig;
}

export type MenuAction =
    | { type: 'ADD_ITEM'; payload: MenuItem }
    | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<MenuItem> } }
    | { type: 'DELETE_ITEM'; payload: string }
    | { type: 'SET_ITEMS'; payload: MenuItem[] }
    | { type: 'ADD_CATEGORY'; payload: MenuCategory }
    | { type: 'UPDATE_CATEGORY'; payload: { id: string; name: string } }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'ADD_SUBCATEGORY'; payload: SubCategory }
    | { type: 'UPDATE_SUBCATEGORY'; payload: { id: string; name: string } }
    | { type: 'DELETE_SUBCATEGORY'; payload: string }
    | { type: 'UPDATE_RESTAURANT'; payload: Partial<RestaurantProfile> }
    | { type: 'UPDATE_CANVAS_LAYOUT'; payload: CanvasLayout }
    | { type: 'UPDATE_QR_CONFIG'; payload: Partial<QRConfig> }
    | { type: 'RESET' };
