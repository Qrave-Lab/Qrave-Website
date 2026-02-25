import { Textbox, Rect, Canvas, Line } from 'fabric';
import type { ThemePreset } from './themes';

// ─── Template Definitions ─────────────────────────────────

export interface MenuTemplate {
    id: string;
    name: string;
    description: string;
    category: 'fine-dining' | 'cafe' | 'street-food' | 'bar' | 'minimal';
    themeId: string;
    tags: string[];
}

export const TEMPLATES: MenuTemplate[] = [
    {
        id: 'fine-dining',
        name: 'Fine Dining',
        description: 'Elegant serif fonts, dark background, gold accents',
        category: 'fine-dining',
        themeId: 'midnight-luxe',
        tags: ['dark', 'elegant', 'serif'],
    },
    {
        id: 'modern-cafe',
        name: 'Modern Cafe',
        description: 'Clean sans-serif, white background, colorful accents',
        category: 'cafe',
        themeId: 'warm-gold',
        tags: ['light', 'modern', 'colorful'],
    },
    {
        id: 'street-food',
        name: 'Street Food',
        description: 'Bold typography, yellow accents, energetic feel',
        category: 'street-food',
        themeId: 'warm-gold',
        tags: ['bold', 'energetic', 'yellow'],
    },
    {
        id: 'luxury-bar',
        name: 'Luxury Bar',
        description: 'Dark mode, neon-like accents, minimal text',
        category: 'bar',
        themeId: 'midnight-luxe',
        tags: ['dark', 'luxury', 'minimal'],
    },
    {
        id: 'minimal-mono',
        name: 'Minimal Mono',
        description: 'Black & white, lots of whitespace, clean typography',
        category: 'minimal',
        themeId: 'monochrome',
        tags: ['minimal', 'clean', 'monochrome'],
    },
];

// ─── Template Builders ─────────────────────────────────────

/**
 * Apply a template to the canvas using real menu data.
 */
export function applyTemplate(
    canvas: Canvas,
    templateId: string,
    theme: ThemePreset,
    menuData: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.clear();
    canvas.setDimensions({ width: 420, height: 760 });

    switch (templateId) {
        case 'fine-dining':
            buildFineDining(canvas, theme, menuData);
            break;
        case 'modern-cafe':
            buildModernCafe(canvas, theme, menuData);
            break;
        case 'street-food':
            buildStreetFood(canvas, theme, menuData);
            break;
        case 'luxury-bar':
            buildLuxuryBar(canvas, theme, menuData);
            break;
        case 'minimal-mono':
            buildMinimalMono(canvas, theme, menuData);
            break;
        default:
            buildModernCafe(canvas, theme, menuData);
    }

    canvas.renderAll();
}

// ─── Fine Dining ─────────────────────────────────────────

function buildFineDining(
    canvas: Canvas,
    theme: ThemePreset,
    data: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.backgroundColor = theme.colors.background;

    // Full background
    const bg = new Rect({
        left: 0, top: 0, width: 420, height: 760,
        fill: theme.colors.background, selectable: false,
    });
    canvas.add(bg);

    // Decorative top line
    const topLine = new Rect({
        left: 210, top: 30, width: 60, height: 2,
        fill: theme.colors.primary, originX: 'center', selectable: true,
    });
    topLine.set('customType', 'divider');
    canvas.add(topLine);

    // Restaurant name
    const name = new Textbox(data.restaurant.name, {
        left: 210, top: 55, width: 360, fontSize: 28,
        fontFamily: theme.typography.headingFont, fontWeight: '700',
        fill: theme.colors.heading, textAlign: 'center', originX: 'center',
        charSpacing: 200,
    });
    name.set('customType', 'restaurantName');
    canvas.add(name);

    // Tagline
    const tagline = new Textbox(data.restaurant.tagline, {
        left: 210, top: 100, width: 340, fontSize: 12,
        fontFamily: theme.typography.bodyFont, fontWeight: '400',
        fill: theme.colors.text, textAlign: 'center',
        originX: 'center', fontStyle: 'italic', opacity: 0.7,
    });
    tagline.set('customType', 'tagline');
    canvas.add(tagline);

    // Bottom decorative line
    const midLine = new Rect({
        left: 210, top: 130, width: 120, height: 1,
        fill: theme.colors.primary, originX: 'center', opacity: 0.4, selectable: true,
    });
    canvas.add(midLine);

    addMenuItems(canvas, theme, data, 170, 'center');
}

// ─── Modern Cafe ─────────────────────────────────────────

function buildModernCafe(
    canvas: Canvas,
    theme: ThemePreset,
    data: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.backgroundColor = theme.colors.background;

    // Header block
    const headerBg = new Rect({
        left: 210, top: 0, width: 420, height: 175,
        fill: theme.colors.primary, originX: 'center', selectable: true,
    });
    headerBg.set('customType', 'headerBg');
    canvas.add(headerBg);

    const name = new Textbox(data.restaurant.name, {
        left: 210, top: 50, width: 360, fontSize: 32,
        fontFamily: theme.typography.headingFont, fontWeight: '900',
        fill: theme.colors.heading, textAlign: 'center', originX: 'center',
    });
    name.set('customType', 'restaurantName');
    canvas.add(name);

    const tagline = new Textbox(data.restaurant.tagline, {
        left: 210, top: 95, width: 340, fontSize: 13,
        fontFamily: theme.typography.bodyFont, fontWeight: '500',
        fill: theme.colors.heading, textAlign: 'center',
        originX: 'center', opacity: 0.8,
    });
    tagline.set('customType', 'tagline');
    canvas.add(tagline);

    const divider = new Rect({
        left: 210, top: 135, width: 80, height: 3,
        fill: theme.colors.heading, originX: 'center', selectable: true,
    });
    divider.set('customType', 'divider');
    canvas.add(divider);

    addMenuItems(canvas, theme, data, 210, 'left');
}

// ─── Street Food ─────────────────────────────────────────

function buildStreetFood(
    canvas: Canvas,
    theme: ThemePreset,
    data: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.backgroundColor = '#FFF8E7';

    // Bold zigzag top bar
    const topBar = new Rect({
        left: 0, top: 0, width: 420, height: 12,
        fill: theme.colors.primary, selectable: false,
    });
    canvas.add(topBar);

    const name = new Textbox(data.restaurant.name.toUpperCase(), {
        left: 210, top: 40, width: 380, fontSize: 36,
        fontFamily: 'Outfit', fontWeight: '900',
        fill: '#111827', textAlign: 'center', originX: 'center',
    });
    name.set('customType', 'restaurantName');
    canvas.add(name);

    const tagline = new Textbox(`★ ${data.restaurant.tagline} ★`, {
        left: 210, top: 90, width: 360, fontSize: 11,
        fontFamily: theme.typography.bodyFont, fontWeight: '700',
        fill: theme.colors.primary, textAlign: 'center',
        originX: 'center', charSpacing: 300,
    });
    tagline.set('customType', 'tagline');
    canvas.add(tagline);

    const dividerLine = new Rect({
        left: 210, top: 120, width: 360, height: 3,
        fill: theme.colors.primary, originX: 'center', selectable: true,
    });
    canvas.add(dividerLine);

    addMenuItems(canvas, theme, data, 150, 'left');
}

// ─── Luxury Bar ──────────────────────────────────────────

function buildLuxuryBar(
    canvas: Canvas,
    theme: ThemePreset,
    data: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.backgroundColor = '#0A0A0A';

    // Subtle top accent
    const topAccent = new Rect({
        left: 210, top: 30, width: 40, height: 2,
        fill: theme.colors.primary, originX: 'center', selectable: true,
    });
    canvas.add(topAccent);

    const name = new Textbox(data.restaurant.name, {
        left: 210, top: 55, width: 360, fontSize: 26,
        fontFamily: 'Playfair Display', fontWeight: '700',
        fill: '#FFFFFF', textAlign: 'center', originX: 'center',
        charSpacing: 300,
    });
    name.set('customType', 'restaurantName');
    canvas.add(name);

    const tagline = new Textbox(data.restaurant.tagline, {
        left: 210, top: 100, width: 340, fontSize: 11,
        fontFamily: 'Inter', fontWeight: '300',
        fill: '#9CA3AF', textAlign: 'center',
        originX: 'center', charSpacing: 150,
    });
    tagline.set('customType', 'tagline');
    canvas.add(tagline);

    const line = new Rect({
        left: 210, top: 130, width: 200, height: 1,
        fill: '#1F1F1F', originX: 'center', selectable: true,
    });
    canvas.add(line);

    addMenuItems(canvas, theme, data, 160, 'left');
}

// ─── Minimal Mono ────────────────────────────────────────

function buildMinimalMono(
    canvas: Canvas,
    theme: ThemePreset,
    data: { restaurant: any; categories: any[]; items: any[] }
) {
    canvas.backgroundColor = '#FFFFFF';

    const name = new Textbox(data.restaurant.name, {
        left: 210, top: 60, width: 360, fontSize: 22,
        fontFamily: 'Inter', fontWeight: '600',
        fill: '#000000', textAlign: 'center', originX: 'center',
        charSpacing: 100,
    });
    name.set('customType', 'restaurantName');
    canvas.add(name);

    const tagline = new Textbox(data.restaurant.tagline, {
        left: 210, top: 95, width: 340, fontSize: 11,
        fontFamily: 'Inter', fontWeight: '400',
        fill: '#9CA3AF', textAlign: 'center', originX: 'center',
    });
    tagline.set('customType', 'tagline');
    canvas.add(tagline);

    const line = new Line([110, 0, 310, 0], {
        stroke: '#E5E7EB', strokeWidth: 1,
        left: 110, top: 125, selectable: true,
    });
    canvas.add(line);

    addMenuItems(canvas, theme, data, 155, 'left');
}

// ─── Shared Menu Item Builder ────────────────────────────

function addMenuItems(
    canvas: Canvas,
    theme: ThemePreset,
    data: { categories: any[]; items: any[] },
    startY: number,
    align: 'left' | 'center'
) {
    let yPos = startY;
    const categoriesToShow = data.categories.slice(0, 3);

    for (const cat of categoriesToShow) {
        // Category header
        const catHeader = new Textbox(cat.name.toUpperCase(), {
            left: align === 'center' ? 210 : 30,
            top: yPos,
            width: 360,
            fontSize: 11,
            fontFamily: theme.typography.bodyFont,
            fontWeight: '800',
            fill: theme.colors.price,
            charSpacing: 250,
            textAlign: align,
            originX: align === 'center' ? 'center' : 'left',
        });
        catHeader.set('customType', 'categoryHeader');
        catHeader.set('categoryId', cat.id);
        canvas.add(catHeader);
        yPos += 35;

        const catItems = data.items
            .filter((i: any) => i.categoryId === cat.id)
            .slice(0, 3);

        for (const item of catItems) {
            // Item name
            const itemName = new Textbox(item.name, {
                left: 30, top: yPos, width: 260,
                fontSize: 14, fontFamily: theme.typography.bodyFont,
                fontWeight: '600', fill: theme.colors.text,
            });
            itemName.set('customType', 'menuItemName');
            itemName.set('menuItemId', item.id);
            canvas.add(itemName);

            // Price
            const priceText = new Textbox(`₹${item.price}`, {
                left: 390, top: yPos, width: 80,
                fontSize: 14, fontFamily: theme.typography.priceFont,
                fontWeight: '700', fill: theme.colors.price,
                textAlign: 'right', originX: 'right',
            });
            priceText.set('customType', 'menuItemPrice');
            priceText.set('menuItemId', item.id);
            canvas.add(priceText);
            yPos += 20;

            // Description
            const desc = new Textbox(item.description, {
                left: 30, top: yPos, width: 310,
                fontSize: 10, fontFamily: theme.typography.bodyFont,
                fill: theme.colors.text, opacity: 0.55, lineHeight: 1.3,
            });
            desc.set('customType', 'menuItemDesc');
            desc.set('menuItemId', item.id);
            canvas.add(desc);

            // Veg dot
            const vegDot = new Rect({
                left: 390, top: yPos, width: 8, height: 8,
                rx: 4, ry: 4,
                fill: item.isVeg ? '#16A34A' : '#DC2626',
                originX: 'right', selectable: true,
            });
            vegDot.set('customType', 'vegIndicator');
            canvas.add(vegDot);
            yPos += 35;

            // Item divider
            if (yPos < 720) {
                const divider = new Rect({
                    left: 30, top: yPos, width: 360, height: 1,
                    fill: theme.colors.divider, selectable: false,
                });
                canvas.add(divider);
                yPos += 12;
            }
        }
        yPos += 15;
    }
}
