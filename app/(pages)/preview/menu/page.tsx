"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ModernFoodUI from "@/app/(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";

type MenuPreviewItem = Record<string, unknown>;

const SAMPLE_MENU = [
  {
    id: "p1",
    name: "Tom Yum Soup",
    description: "Hot and sour soup with lemongrass, galangal, and chili.",
    categoryName: "Starters",
    parentCategoryName: "Food",
    price: 260,
    imageUrl: "https://images.unsplash.com/photo-1604908176997-4315c3301e73?auto=format&fit=crop&w=800&q=80",
    isVeg: false,
    rating: 4.6,
    variants: [
      { id: "reg", name: "Regular", priceDelta: 0 },
      { id: "lg", name: "Large", priceDelta: 80 },
    ],
  },
  {
    id: "p2",
    name: "Paneer Tikka Masala",
    description: "Smoky paneer cubes in rich tomato-cashew gravy.",
    categoryName: "Mains",
    parentCategoryName: "Food",
    price: 340,
    imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    isVeg: true,
    rating: 4.7,
    variants: [{ id: "reg", name: "Regular", priceDelta: 0 }],
  },
  {
    id: "p3",
    name: "Thai Basil Fried Rice",
    description: "Fragrant jasmine rice tossed with basil and vegetables.",
    categoryName: "Mains",
    parentCategoryName: "Food",
    price: 290,
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    isVeg: true,
    rating: 4.5,
    variants: [{ id: "reg", name: "Regular", priceDelta: 0 }],
  },
  {
    id: "p4",
    name: "Mango Lassi",
    description: "Sweet chilled yogurt drink with Alphonso mango.",
    categoryName: "Drinks",
    parentCategoryName: "Beverages",
    price: 180,
    imageUrl: "https://images.unsplash.com/photo-1570696516188-ade861b84a49?auto=format&fit=crop&w=800&q=80",
    isVeg: true,
    rating: 4.8,
    variants: [{ id: "reg", name: "Regular", priceDelta: 0 }],
  },
];

export default function PreviewMenuPage() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "Preview Restaurant";
  const themeRaw = searchParams.get("theme");
  const [menuItems, setMenuItems] = useState<MenuPreviewItem[]>(SAMPLE_MENU as MenuPreviewItem[]);

  const themeConfig = useMemo(() => {
    if (!themeRaw) return undefined;
    try {
      return JSON.parse(themeRaw);
    } catch {
      return undefined;
    }
  }, [themeRaw]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [themeRaw]);

  useEffect(() => {
    let mounted = true;
    const loadRealMenu = async () => {
      try {
        const items = await api<MenuPreviewItem[]>("/api/admin/menu", { method: "GET", skipAuthRedirect: true, suppressErrorLog: true });
        if (!mounted) return;
        if (Array.isArray(items) && items.length > 0) {
          setMenuItems(items);
        }
      } catch {
        // keep sample menu fallback
      }
    };
    loadRealMenu();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ModernFoodUI
      menuItems={menuItems}
      tableNumber="7"
      isTableOccupied={false}
      orderingEnabled={true}
      previewMode={true}
      previewRestaurantName={name}
      previewThemeConfig={themeConfig}
    />
  );
}
