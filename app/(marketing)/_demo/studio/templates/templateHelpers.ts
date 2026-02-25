import { Textbox, type Canvas } from 'fabric';
import type { ThemePreset } from './themes';

/**
 * Apply a theme to all existing objects on the canvas (global style edit).
 * Updates colors and fonts based on the theme preset.
 */
export function applyThemeToCanvas(canvas: Canvas, theme: ThemePreset) {
    canvas.backgroundColor = theme.colors.background;

    const objects = canvas.getObjects();
    for (const obj of objects) {
        const customType = (obj as any).customType;

        switch (customType) {
            case 'restaurantName':
                obj.set({
                    fill: theme.colors.heading,
                    fontFamily: theme.typography.headingFont,
                } as any);
                break;
            case 'tagline':
                obj.set({
                    fill: theme.colors.text,
                    fontFamily: theme.typography.bodyFont,
                } as any);
                break;
            case 'categoryHeader':
                obj.set({
                    fill: theme.colors.price,
                    fontFamily: theme.typography.bodyFont,
                } as any);
                break;
            case 'menuItemName':
                obj.set({
                    fill: theme.colors.text,
                    fontFamily: theme.typography.bodyFont,
                } as any);
                break;
            case 'menuItemPrice':
                obj.set({
                    fill: theme.colors.price,
                    fontFamily: theme.typography.priceFont,
                } as any);
                break;
            case 'menuItemDesc':
                obj.set({
                    fill: theme.colors.text,
                    fontFamily: theme.typography.bodyFont,
                } as any);
                break;
            case 'headerBg':
                obj.set({ fill: theme.colors.primary } as any);
                break;
            case 'divider':
                obj.set({ fill: theme.colors.divider } as any);
                break;
        }
    }

    canvas.renderAll();
}

/**
 * Auto-align all price elements to the same right edge.
 */
export function autoAlignPrices(canvas: Canvas) {
    const priceObjects = canvas.getObjects()
        .filter((o: any) => o.customType === 'menuItemPrice');

    const rightEdge = 390;
    for (const p of priceObjects) {
        p.set({
            left: rightEdge,
            textAlign: 'right',
            originX: 'right',
        } as any);
    }

    canvas.renderAll();
}

/**
 * Auto-layout all items from inventory data:
 * distributes categories and items evenly within canvas height.
 */
export function autoLayoutFromInventory(
    canvas: Canvas,
    theme: ThemePreset,
    data: { categories: any[]; items: any[] }
) {
    // Find all menu item objects and remove them
    const toRemove = canvas.getObjects().filter((o: any) =>
        ['categoryHeader', 'menuItemName', 'menuItemPrice', 'menuItemDesc', 'vegIndicator'].includes(o.customType)
    );
    toRemove.forEach(o => canvas.remove(o));

    // Also remove non-selectable dividers below headers
    const dividers = canvas.getObjects().filter((o: any) =>
        o.selectable === false && o.type === 'rect' && (o as any).height <= 2
    );
    dividers.forEach(o => canvas.remove(o));

    let yPos = 200; // Start below header
    for (const cat of data.categories) {
        const catHeader = new Textbox(cat.name.toUpperCase(), {
            left: 30, top: yPos, width: 360, fontSize: 11,
            fontFamily: theme.typography.bodyFont, fontWeight: '800',
            fill: theme.colors.price, charSpacing: 250,
        });
        (catHeader as any).customType = 'categoryHeader';
        (catHeader as any).categoryId = cat.id;
        canvas.add(catHeader);
        yPos += 35;

        const catItems = data.items.filter((i: any) => i.categoryId === cat.id);
        for (const item of catItems) {
            if (yPos > 720) break;

            const itemName = new Textbox(item.name, {
                left: 30, top: yPos, width: 260, fontSize: 14,
                fontFamily: theme.typography.bodyFont, fontWeight: '600',
                fill: theme.colors.text,
            });
            (itemName as any).customType = 'menuItemName';
            (itemName as any).menuItemId = item.id;
            canvas.add(itemName);

            const priceText = new Textbox(`₹${item.price}`, {
                left: 390, top: yPos, width: 80, fontSize: 14,
                fontFamily: theme.typography.priceFont, fontWeight: '700',
                fill: theme.colors.price, textAlign: 'right', originX: 'right',
            });
            (priceText as any).customType = 'menuItemPrice';
            (priceText as any).menuItemId = item.id;
            canvas.add(priceText);
            yPos += 20;

            const desc = new Textbox(item.description, {
                left: 30, top: yPos, width: 310, fontSize: 10,
                fontFamily: theme.typography.bodyFont,
                fill: theme.colors.text, opacity: 0.55, lineHeight: 1.3,
            });
            (desc as any).customType = 'menuItemDesc';
            (desc as any).menuItemId = item.id;
            canvas.add(desc);
            yPos += 40;
        }
        yPos += 15;
    }

    canvas.renderAll();
}
