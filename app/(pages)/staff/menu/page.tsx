"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  X,
  Pencil,
  Image as ImageIcon,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  UtensilsCrossed,
  Box,
  UploadCloud,
  Info,
  Calendar,
  ChefHat,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type CategoryTab = "all" | string;
type Allergen =
  | "Dairy"
  | "Gluten"
  | "Peanuts"
  | "Tree Nuts"
  | "Eggs"
  | "Soy"
  | "Fish"
  | "Shellfish";
type AllergenConfidence = "contains" | "may_contain" | "trace";
type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const ALLERGEN_LIST: Allergen[] = [
  "Dairy",
  "Gluten",
  "Peanuts",
  "Tree Nuts",
  "Eggs",
  "Soy",
  "Fish",
  "Shellfish",
];
const DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

type Variant = {
  id: string;
  label: string;
  price: number;
  stockCount: number | null;
};

type StructuredIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: "g" | "ml" | "pcs" | "oz";
};

type ModifierOption = {
  id: string;
  label: string;
  price_delta: number;
  is_available: boolean;
  sort_order?: number;
};

type ModifierGroup = {
  id: string;
  title: string;
  min_select: number;
  max_select: number;
  required: boolean;
  is_combo: boolean;
  sort_order?: number;
  options: ModifierOption[];
};

type MenuItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  parentCategoryName?: string;
  price: number;
  isAvailable: boolean;
  isArchived: boolean;
  isOutOfStock: boolean;
  isTodaysSpecial: boolean;
  isChefSpecial: boolean;
  specialNote: string;
  stockCount: number | null;
  variants: Variant[];
  imageUrl: string;
  modelGlb: string;
  modelUsdz: string;
  description: string;
  calories: number | null;
  isVeg: boolean;
  dietaryManualOverride: boolean;
  ingredientsStructured: StructuredIngredient[];
  modifierGroups: ModifierGroup[];
  allergens: { type: Allergen; confidence: AllergenConfidence }[];
  availableDays: DayOfWeek[];
  updatedBy: string;
};

type CategoryOption = {
  id: string;
  name: string;
  parent_id?: string | null;
  parent_name?: string | null;
};

type BranchOption = {
  restaurant_id: string;
  name: string;
  role: string;
};

const normalizeAssetUrl = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (/^[a-z0-9-]+\.cloudfront\.net\//i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.amazonaws\.com\//i.test(raw)) return `https://${raw}`;
  return raw;
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
  return await api(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [role, setRole] = useState<string>("");
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>("");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState<string>("");
  const [isImportingMenu, setIsImportingMenu] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncSourceBranchId, setSyncSourceBranchId] = useState<string>("");
  const [syncTargetBranchIds, setSyncTargetBranchIds] = useState<string[]>([]);
  const [isSyncingMenu, setIsSyncingMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingParentId, setEditingParentId] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryParentId, setNewSubcategoryParentId] = useState("");
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [showSubcategoryManager, setShowSubcategoryManager] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string>("");
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [isRenamingSubcategory, setIsRenamingSubcategory] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<
    "general" | "variants" | "assets" | "ingredients" | "modifiers" | "availability"
  >("general");
  const [loading, setLoading] = useState(true);
  const [modelViewerReady, setModelViewerReady] = useState(false);
  const [modelPreviewError, setModelPreviewError] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>(null);
  const [isSaving, setIsSaving] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshMenu();
    refreshCategories();
    refreshMe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import("@google/model-viewer");
        if (!cancelled) setModelViewerReady(true);
      } catch {
        try {
          if (!document.querySelector('script[data-model-viewer-fallback="true"]')) {
            const script = document.createElement("script");
            script.type = "module";
            script.src = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js";
            script.setAttribute("data-model-viewer-fallback", "true");
            script.onload = () => {
              if (!cancelled) setModelViewerReady(true);
            };
            document.head.appendChild(script);
          }
        } catch {
          // keep false; UI handles loading/error text
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshMe = async () => {
    try {
      const me = await authFetch("/api/admin/me");
      const nextRole = String((me as any)?.role || "").toLowerCase();
      setRole(nextRole);
      setCurrentRestaurantId((me as any)?.restaurant_id || "");
      const roleAccess = (me as any)?.theme_config?.role_access as Record<string, Record<string, boolean>> | undefined;
      if (nextRole && nextRole !== "owner") {
        const allowed = roleAccess?.[nextRole]?.menu;
        if (allowed === false && typeof window !== "undefined") {
          toast.error("Menu access disabled for your role");
          window.location.href = "/staff";
        }
      }
    } catch {
      // ignore
    }
  };

  const refreshBranches = async () => {
    try {
      const res = await authFetch("/api/admin/branches");
      const allBranches: BranchOption[] = Array.isArray((res as any)?.branches)
        ? (res as any).branches
        : [];
      setBranches(allBranches);
    } catch {
      setBranches([]);
    }
  };

  const canManageCategories = role === "owner" || role === "manager";
  const canImportMenu = role === "owner" || role === "manager";
  const branchOptionsForImport = branches.filter((b) => b.restaurant_id !== currentRestaurantId);
  const branchOptionsForSync = branches.filter((b) => b.restaurant_id !== syncSourceBranchId);

  const refreshMenu = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await authFetch("/api/admin/menu");
      const menuData = Array.isArray(data) ? data : [];
      const normalized = menuData.map((item: any) => ({
        ...item,
        name:
          typeof item.name === "object"
            ? item.name?.String ?? ""
            : item.name ?? "",
        categoryName:
          typeof item.categoryName === "object"
            ? item.categoryName?.String ?? ""
            : item.categoryName ?? "",
        parentCategoryName:
          typeof item.parentCategoryName === "object"
            ? item.parentCategoryName?.String ?? ""
            : item.parentCategoryName ?? "",
        description: item.description?.String ?? item.description ?? "",
        calories:
          typeof item.calories === "number"
            ? item.calories
            : typeof item.calories?.Int64 === "number"
              ? item.calories.Int64
              : null,
        isVeg: Boolean(item.isVeg ?? item.is_veg ?? true),
        dietaryManualOverride: Boolean(
          item.dietaryManualOverride ?? item.dietary_manual_override ?? false
        ),
        imageUrl: normalizeAssetUrl(item.imageUrl?.String ?? item.imageUrl ?? ""),
        modelGlb: normalizeAssetUrl(item.modelGlb?.String ?? item.modelGlb ?? ""),
        modelUsdz: normalizeAssetUrl(item.modelUsdz?.String ?? item.modelUsdz ?? ""),
        variants: item.variants || [],
        allergens: item.allergens || [],
        availableDays: item.availableDays || [],
        isOutOfStock: item.isOutOfStock ?? item.is_out_of_stock ?? false,
        isTodaysSpecial: item.isTodaysSpecial ?? item.is_todays_special ?? false,
        isChefSpecial: item.isChefSpecial ?? item.is_chef_special ?? false,
        specialNote:
          typeof item.specialNote === "object"
            ? item.specialNote?.String ?? ""
            : item.specialNote ?? item.special_note ?? "",
        ingredientsStructured: item.ingredientsStructured || [],
        modifierGroups: item.modifier_groups || item.modifierGroups || [],
      }));
      setItems(normalized);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshCategories = async () => {
    try {
      const data = await authFetch("/api/admin/menu/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const resolveParentName = (item: MenuItem) =>
    item.parentCategoryName || item.categoryName || "Uncategorized";

  const getDefaultCategoryId = () => {
    const parent = parentCategories[0];
    if (!parent) return "";
    const subs = getSubcategories(parent.id);
    return subs[0]?.id || parent.id;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "model"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    const uploadToastId =
      type === "model" ? toast.loading("Uploading 3D model...") : undefined;

    try {
      if (type === "image") {
        const ct = encodeURIComponent(file.type || "image/png");
        const res: any = await authFetch(
          `/api/admin/menu/item/image/upload-url?item_id=${editingItem.id}&content_type=${ct}`,
          { method: "POST" }
        );

        await fetch(res.upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setEditingItem({
          ...editingItem,
          imageUrl: res.public_url,
        });

        toast.success("Image uploaded");
      } else {
        if (!editingItem.id) {
          toast.error("Save item first before uploading 3D model");
          return;
        }
        const maxBytes = 12 * 1024 * 1024;
        if (file.size > maxBytes) {
          toast.dismiss(uploadToastId);
          toast.error("GLB too large. Keep it under 12MB for reliable loading.");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        let res: any;
        try {
          res = await authFetch(
            `/api/admin/menu/item/model?item_id=${editingItem.id}`,
            { method: "POST", body: form, signal: controller.signal }
          );
        } finally {
          clearTimeout(timeout);
        }
        if (!res?.model_glb) {
          throw new Error("Model upload failed. No GLB URL returned.");
        }
        setEditingItem({
          ...editingItem,
          modelGlb: res.model_glb || "",
          modelUsdz: res.model_usdz || "",
        });
        setModelPreviewError("");
        toast.dismiss(uploadToastId);
        toast.success("3D model uploaded");
      }
    } catch (err: any) {
      toast.dismiss(uploadToastId);
      const aborted = err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("abort");
      const msg = aborted
        ? "Upload timed out. Try a smaller/optimized GLB file."
        : String(err?.message || "Upload failed");
      if (type === "model") {
        toast.error(`3D model upload failed: ${msg}`);
      } else {
        toast.error(msg);
      }
    }
  };

  const removeMediaAsset = (type: "image" | "model") => {
    if (!editingItem) return;
    if (type === "image") {
      setEditingItem({ ...editingItem, imageUrl: "" });
      toast.success("Image removed. Click Save Changes to persist.");
      return;
    }

    setEditingItem({ ...editingItem, modelGlb: "", modelUsdz: "" });
    setModelPreviewError("");
    toast.success("3D model removed. Click Save Changes to persist.");
  };

  const handleDeleteItem = async () => {
    if (!editingItem?.id) return;
    setConfirmDialog({
      title: "Delete product?",
      message: `Delete "${editingItem.name}" permanently? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await authFetch(`/api/admin/menu/item?item_id=${editingItem.id}`, {
            method: "DELETE",
          });
          toast.success("Product deleted");
          setModalMode(null);
          refreshMenu(true);
        } catch (err: any) {
          toast.error(err?.message || "Delete failed");
        }
      },
    });
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const handleBulkAction = async (action: "archive" | "unarchive") => {
    for (const id of selectedItems) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      await authFetch(`/api/admin/menu/item?item_id=${id}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, is_archived: action === "archive" }),
      });
    }
    setSelectedItems(new Set());
    refreshMenu(true);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    setConfirmDialog({
      title: "Delete selected products?",
      message: `Delete ${selectedItems.size} selected product(s) permanently? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const ids = Array.from(selectedItems);
          let failed = 0;

          for (const id of ids) {
            try {
              await authFetch(`/api/admin/menu/item?item_id=${id}`, {
                method: "DELETE",
              });
            } catch {
              failed += 1;
            }
          }

          setSelectedItems(new Set());
          refreshMenu(true);

          if (failed === 0) {
            toast.success(`${ids.length} product(s) deleted`);
          } else if (failed === ids.length) {
            toast.error("Delete failed");
          } else {
            toast(`Deleted ${ids.length - failed}/${ids.length} products`, {
              icon: "⚠️",
            });
          }
        } catch {
          toast.error("Delete failed");
        }
      },
    });
  };

  const createSubcategory = async (name: string, parentId: string) => {
    if (!canManageCategories) {
      toast.error("Insufficient permissions");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!parentId) {
      toast.error("Select a parent category");
      return;
    }
    const exists = categories.some(
      (c) =>
        c.name.toLowerCase() === trimmed.toLowerCase() &&
        c.parent_id === parentId
    );
    if (exists) {
      toast.error("Subcategory already exists");
      return;
    }
    setIsCreatingSubcategory(true);
    try {
      await authFetch("/api/admin/menu/category", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, parent_id: parentId }),
      });
      setNewSubcategoryName("");
      toast.success("Subcategory added");
      refreshCategories();
    } catch (e: any) {
      if (e?.status === 403) {
        toast.error("Only owners/managers can add categories");
        return;
      }
      toast.error("Failed to add subcategory");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const startRenameSubcategory = (category: CategoryOption) => {
    setEditingSubcategoryId(category.id);
    setEditingSubcategoryName(category.name);
  };

  const cancelRenameSubcategory = () => {
    setEditingSubcategoryId("");
    setEditingSubcategoryName("");
  };

  const renameSubcategory = async () => {
    if (!canManageCategories) {
      toast.error("Insufficient permissions");
      return;
    }
    if (!editingSubcategoryId) return;
    const trimmed = editingSubcategoryName.trim();
    if (!trimmed) {
      toast.error("Subcategory name required");
      return;
    }
    if (trimmed.length > 60) {
      toast.error("Subcategory name too long");
      return;
    }

    const current = categories.find((c) => c.id === editingSubcategoryId);
    if (!current) return;
    if (current.name === trimmed) {
      cancelRenameSubcategory();
      return;
    }

    const duplicate = categories.some(
      (c) =>
        c.id !== editingSubcategoryId &&
        (c.parent_id || "") === (current.parent_id || "") &&
        c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error("Subcategory already exists");
      return;
    }

    setIsRenamingSubcategory(true);
    try {
      await authFetch("/api/admin/menu/category", {
        method: "PUT",
        body: JSON.stringify({
          category_id: editingSubcategoryId,
          name: trimmed,
        }),
      });
      toast.success("Subcategory renamed");
      cancelRenameSubcategory();
      refreshCategories();
    } catch {
      toast.error("Failed to rename subcategory");
    } finally {
      setIsRenamingSubcategory(false);
    }
  };

  const updateOutOfStock = async (item: MenuItem, isOutOfStock: boolean) => {
    const snapshot = items;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isOutOfStock } : i))
    );

    try {
      await authFetch(`/api/admin/menu/item?item_id=${item.id}`, {
        method: "PUT",
        body: JSON.stringify({
          category_id: item.categoryId || undefined,
          name: item.name,
          price: item.price,
          description: item.description || "",
          calories: item.calories,
          is_veg: item.isVeg,
          dietary_manual_override: item.dietaryManualOverride,
          image_url: item.imageUrl || "",
          model_glb: item.modelGlb || "",
          model_usdz: item.modelUsdz || "",
          available_days: item.availableDays || [],
          is_archived: item.isArchived,
          is_out_of_stock: isOutOfStock,
          is_todays_special: item.isTodaysSpecial,
          is_chef_special: item.isChefSpecial,
          special_note: item.specialNote || "",
        }),
      });
    } catch (err) {
      setItems(snapshot);
      toast.error("Update failed");
    }
  };

  const handleBulkStock = async (isOutOfStock: boolean) => {
    const snapshot = items;
    const selected = new Set(selectedItems);
    setItems((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, isOutOfStock } : i))
    );

    try {
      await Promise.all(
        Array.from(selected).map((id) => {
          const item = snapshot.find((i) => i.id === id);
          if (!item) return Promise.resolve();
          return authFetch(`/api/admin/menu/item?item_id=${id}`, {
            method: "PUT",
            body: JSON.stringify({
              category_id: item.categoryId || undefined,
              name: item.name,
              price: item.price,
              description: item.description || "",
              calories: item.calories,
              is_veg: item.isVeg,
              dietary_manual_override: item.dietaryManualOverride,
              image_url: item.imageUrl || "",
              model_glb: item.modelGlb || "",
              model_usdz: item.modelUsdz || "",
              available_days: item.availableDays || [],
              is_archived: item.isArchived,
              is_out_of_stock: isOutOfStock,
              is_todays_special: item.isTodaysSpecial,
              is_chef_special: item.isChefSpecial,
              special_note: item.specialNote || "",
            }),
          });
        })
      );
      setSelectedItems(new Set());
      refreshMenu(true);
    } catch (err) {
      setItems(snapshot);
      toast.error("Bulk update failed");
    }
  };

  const handleSave = async () => {
    if (!editingItem || isSaving) return;
    setIsSaving(true);

    try {
      let itemId = editingItem.id;
      const categoryId = editingItem.categoryId || getDefaultCategoryId();

      if (!categoryId) {
        toast.error("Please create/select a category first");
        return;
      }

      if (modalMode === "add") {
        const res: any = await authFetch("/api/admin/menu/item", {
          method: "POST",
          body: JSON.stringify({
            category_id: categoryId,
            name: editingItem.name,
            price: editingItem.price,
          }),
        });
        itemId = res.id;
      }

      await authFetch(`/api/admin/menu/item?item_id=${itemId}`, {
        method: "PUT",
        body: JSON.stringify({
          category_id: categoryId,
          name: editingItem.name,
          price: editingItem.price,
          description: editingItem.description,
          calories: editingItem.calories,
          is_veg: editingItem.isVeg,
          dietary_manual_override: editingItem.dietaryManualOverride,
          image_url: editingItem.imageUrl,
          model_glb: editingItem.modelGlb,
          model_usdz: editingItem.modelUsdz,
          available_days: editingItem.availableDays,
          is_archived: editingItem.isArchived,
          is_out_of_stock: editingItem.isOutOfStock,
          is_todays_special: editingItem.isTodaysSpecial,
          is_chef_special: editingItem.isChefSpecial,
          special_note: editingItem.specialNote || "",
        }),
      });

      await authFetch(`/api/admin/menu/item/ingredients?item_id=${itemId}`, {
        method: "PUT",
        body: JSON.stringify(
          editingItem.ingredientsStructured.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
          }))
        ),
      });

      await authFetch(`/api/admin/menu/item/modifiers?item_id=${itemId}`, {
        method: "PUT",
        body: JSON.stringify(
          (editingItem.modifierGroups || []).map((g, gi) => ({
            id: g.id,
            title: g.title,
            min_select: g.min_select,
            max_select: g.max_select,
            required: g.required,
            is_combo: g.is_combo,
            sort_order: gi,
            options: (g.options || []).map((o, oi) => ({
              id: o.id,
              label: o.label,
              price_delta: o.price_delta,
              is_available: o.is_available !== false,
              sort_order: oi,
            })),
          }))
        ),
      });

      await authFetch(`/api/admin/menu/item/allergens?item_id=${itemId}`, {
        method: "PUT",
        body: JSON.stringify(editingItem.allergens),
      });

      const existing = items.find((i) => i.id === itemId)?.variants ?? [];
      const existingIds = new Set(existing.map((v) => v.id));
      const currentIds = new Set(editingItem.variants.map((v) => v.id));

      for (const v of editingItem.variants) {
        if (!existingIds.has(v.id)) {
          await authFetch(`/api/admin/menu/item/variant?item_id=${itemId}`, {
            method: "POST",
            body: JSON.stringify({
              label: v.label,
              price: v.price,
              ...(v.stockCount != null ? { stock: v.stockCount } : {}),
            }),
          });
        }
      }

      for (const v of existing) {
        if (!currentIds.has(v.id)) {
          await authFetch(`/api/admin/menu/item/variant?variant_id=${v.id}`, {
            method: "DELETE",
          });
        }
      }

      setModalMode(null);
      toast.success("Edits Saved Successfully");
      refreshMenu(true);
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIAssist = async () => {
    if (!editingItem) return;
    try {
      const res: any = await authFetch("/api/admin/menu/item/ai-assist", {
        method: "POST",
        body: JSON.stringify({
          name: editingItem.name,
          description: editingItem.description,
          ingredients: editingItem.ingredientsStructured.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        }),
      });

      const nextAllergens = Array.isArray(res?.allergens)
        ? res.allergens
          .map((a: any) => ({
            type: String(a?.type || "") as Allergen,
            confidence: String(a?.confidence || "contains") as AllergenConfidence,
          }))
          .filter((a: any) => ALLERGEN_LIST.includes(a.type))
        : editingItem.allergens;

      setEditingItem({
        ...editingItem,
        description: String(res?.description || editingItem.description || ""),
        calories:
          typeof res?.estimated_calories === "number"
            ? Number(res.estimated_calories)
            : editingItem.calories,
        isVeg:
          typeof res?.is_veg === "boolean"
            ? Boolean(res.is_veg)
            : editingItem.isVeg,
        allergens: nextAllergens,
      });
      toast.success("AI suggestions applied");
    } catch {
      toast.error("AI assist failed");
    }
  };

  const handleImportMenu = async () => {
    if (!sourceBranchId) {
      toast.error("Select a source branch");
      return;
    }
    setConfirmDialog({
      title: "Copy menu from branch?",
      message: "This will replace the current branch menu with items from the selected branch. This cannot be undone.",
      onConfirm: async () => {
        setIsImportingMenu(true);
        try {
          await authFetch("/api/admin/menu/import", {
            method: "POST",
            body: JSON.stringify({ source_branch_id: sourceBranchId }),
          });
          await Promise.all([refreshCategories(), refreshMenu(true)]);
          toast.success("Menu copied from selected branch");
        } catch (err: any) {
          toast.error(err?.message || "Failed to copy menu");
        } finally {
          setIsImportingMenu(false);
        }
      },
    });
  };

  const openSyncModal = () => {
    const fallbackSource = sourceBranchId || currentRestaurantId || branches[0]?.restaurant_id || "";
    setSyncSourceBranchId(fallbackSource);
    setSyncTargetBranchIds([]);
    setShowSyncModal(true);
  };

  const toggleSyncTargetBranch = (branchID: string) => {
    setSyncTargetBranchIds((prev) =>
      prev.includes(branchID) ? prev.filter((id) => id !== branchID) : [...prev, branchID]
    );
  };

  const handleConfirmSync = async () => {
    if (!syncSourceBranchId) {
      toast.error("Select source branch");
      return;
    }
    if (syncTargetBranchIds.length === 0) {
      toast.error("Select at least one target branch");
      return;
    }

    setIsSyncingMenu(true);
    try {
      const res: any = await authFetch("/api/admin/menu/sync", {
        method: "POST",
        body: JSON.stringify({
          source_branch_id: syncSourceBranchId,
          target_branch_ids: syncTargetBranchIds,
        }),
      });
      const syncedCount = Number(res?.synced_branches || 0);
      toast.success(`Menu synced to ${syncedCount} branch${syncedCount === 1 ? "" : "es"}`);
      setShowSyncModal(false);
      await Promise.all([refreshCategories(), refreshMenu(true)]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync menu");
    } finally {
      setIsSyncingMenu(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesTab =
      activeTab === "all" || resolveParentName(item) === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesArchive = showArchived ? item.isArchived : !item.isArchived;
    return matchesTab && matchesSearch && matchesArchive;
  });

  const selectedParentId =
    editingParentId ||
    categories.find((c) => c.id === editingItem?.categoryId)?.parent_id ||
    categories.find((c) => c.id === editingItem?.categoryId)?.id ||
    parentCategories[0]?.id ||
    "";

  const subcategoryOptions = selectedParentId
    ? getSubcategories(selectedParentId)
    : [];

  useEffect(() => {
    refreshBranches();
  }, []);

  return (
    <div className="flex h-screen bg-[#F8F9FB] text-slate-900 overflow-hidden font-sans">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between z-20 sticky top-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Menu Engineering
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                <Box className="w-3 h-3" /> {items.length} Products
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canImportMenu && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2">
                <select
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
                >
                  <option value="">Copy menu from branch...</option>
                  {branchOptionsForImport.map((branch) => (
                    <option key={branch.restaurant_id} value={branch.restaurant_id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleImportMenu}
                  disabled={!sourceBranchId || isImportingMenu}
                  className="h-8 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isImportingMenu ? "Copying..." : "Copy Menu"}
                </button>
                <button
                  type="button"
                  onClick={openSyncModal}
                  className="h-8 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Sync Menu
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowArchived(!showArchived);
                setSelectedItems(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showArchived
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {showArchived ? (
                <ArchiveRestore className="w-4 h-4" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              {showArchived ? "Exit Archive" : "Archive"}
            </button>
            <button
              onClick={() => {
                const defaultCategoryId = getDefaultCategoryId();
                const defaultParentId =
                  categories.find((c) => c.id === defaultCategoryId)?.parent_id ||
                  categories.find((c) => c.id === defaultCategoryId)?.id ||
                  "";
                setEditingItem({
                  id: "",
                  name: "",
                  categoryId: defaultCategoryId,
                  price: 0,
                  isAvailable: true,
                  isArchived: false,
                  isOutOfStock: false,
                  isTodaysSpecial: false,
                  isChefSpecial: false,
                  specialNote: "",
                  stockCount: null,
                  variants: [],
                  imageUrl: "",
                  modelGlb: "",
                  modelUsdz: "",
                  description: "",
                  calories: null,
                  isVeg: true,
                  dietaryManualOverride: false,
                  ingredientsStructured: [],
                  modifierGroups: [],
                  allergens: [],
                  availableDays: [...DAYS],
                  updatedBy: "Staff",
                });
                setEditingParentId(defaultParentId);
                setModalMode("add");
                setActiveModalTab("general");
              }}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4" /> New Product
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#F8F9FB]">
          <div className="max-w-7xl mx-auto">
            {canManageCategories && (
              <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 tracking-tight">
                      Add Subcategory
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryManager(true)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    Manage Names →
                  </button>
                </div>
                <div className="px-5 py-4 flex flex-col sm:flex-row items-stretch gap-3">
                  <select
                    value={newSubcategoryParentId || parentCategories[0]?.id || ""}
                    onChange={(e) => setNewSubcategoryParentId(e.target.value)}
                    className="h-10 px-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all min-w-[140px]"
                  >
                    {parentCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="e.g. Pizzas, Burgers, Chinese"
                    className="flex-1 h-10 px-4 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        createSubcategory(
                          newSubcategoryName,
                          newSubcategoryParentId || parentCategories[0]?.id || ""
                        );
                      }
                    }}
                  />
                  <button
                    onClick={() =>
                      createSubcategory(
                        newSubcategoryName,
                        newSubcategoryParentId || parentCategories[0]?.id || ""
                      )
                    }
                    disabled={isCreatingSubcategory || !newSubcategoryName.trim()}
                    className="h-10 px-5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                  {["all", ...parentCategories.map((c) => c.name)].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat as any)}
                      className={`px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === cat
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {filteredItems.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedItems.size === filteredItems.length)
                        setSelectedItems(new Set());
                      else
                        setSelectedItems(
                          new Set(filteredItems.map((i) => i.id))
                        );
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-900 flex items-center gap-2 transition-colors"
                  >
                    {selectedItems.size === filteredItems.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Select All
                  </button>
                )}
              </div>
              <div className="relative min-w-[300px] group">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <AnimatePresence>
              {selectedItems.size > 0 && (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mb-6 bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between shadow-xl"
                >
                  <span className="text-xs font-bold ml-3 tracking-wide">
                    {selectedItems.size} products selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkStock(true)}
                      className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-rose-500/40"
                    >
                      Mark Out of Stock
                    </button>
                    <button
                      onClick={() => handleBulkStock(false)}
                      className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-emerald-400/40"
                    >
                      Mark In Stock
                    </button>
                    <button
                      onClick={() =>
                        handleBulkAction(showArchived ? "unarchive" : "archive")
                      }
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
                    >
                      {showArchived ? (
                        <ArchiveRestore className="w-4 h-4" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      {showArchived ? "Restore Items" : "Archive Items"}
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-rose-500/40"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedItems(new Set())}
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSubcategoryManager && canManageCategories && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4"
                  onClick={() => setShowSubcategoryManager(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl"
                  >
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Manage Subcategory Names
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowSubcategoryManager(false)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Parent Category
                        </label>
                        <select
                          value={newSubcategoryParentId || parentCategories[0]?.id || ""}
                          onChange={(e) => setNewSubcategoryParentId(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all"
                        >
                          {parentCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {getSubcategories(
                          newSubcategoryParentId || parentCategories[0]?.id || ""
                        ).map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50"
                          >
                            {editingSubcategoryId === cat.id ? (
                              <>
                                <input
                                  value={editingSubcategoryName}
                                  onChange={(e) => setEditingSubcategoryName(e.target.value)}
                                  className="flex-1 h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-300"
                                />
                                <button
                                  type="button"
                                  onClick={renameSubcategory}
                                  disabled={isRenamingSubcategory}
                                  className="h-8 px-2 rounded-lg text-[10px] font-bold bg-slate-900 text-white disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelRenameSubcategory}
                                  className="h-8 px-2 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-500"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-xs font-semibold text-slate-700">
                                  {cat.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startRenameSubcategory(cat)}
                                  className="h-8 px-2 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                                >
                                  Rename
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {getSubcategories(
                          newSubcategoryParentId || parentCategories[0]?.id || ""
                        ).length === 0 && (
                            <div className="text-xs text-slate-400 py-4 text-center">
                              No subcategories for selected parent
                            </div>
                          )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm animate-pulse">
                    <div className="h-48 bg-slate-200" />
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-5 w-32 bg-slate-200 rounded" />
                        <div className="h-5 w-16 bg-slate-200 rounded" />
                      </div>
                      <div className="h-3 w-20 bg-slate-100 rounded mb-4" />
                      <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                        <div className="h-8 w-full bg-slate-100 rounded-xl" />
                        <div className="h-8 w-full bg-slate-100 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm"
              >
                <div className="bg-slate-50 p-6 rounded-full mb-6">
                  <ChefHat className="w-16 h-16 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {search ? "No matches found" : "Your menu is currently empty"}
                </h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm text-center px-6">
                  {search
                    ? `We couldn't find any items matching "${search}". Try a different keyword.`
                    : "Kickstart your digital menu by adding your first signature dish or beverage."}
                </p>
                {!search && (
                  <button
                    onClick={() => {
                      const defaultCategoryId = getDefaultCategoryId();
                      const defaultParentId =
                        categories.find((c) => c.id === defaultCategoryId)?.parent_id ||
                        categories.find((c) => c.id === defaultCategoryId)?.id ||
                        "";
                      setEditingItem({
                        id: "",
                        name: "",
                        categoryId: defaultCategoryId,
                        price: 0,
                        isAvailable: true,
                        isArchived: false,
                        isOutOfStock: false,
                        isTodaysSpecial: false,
                        isChefSpecial: false,
                        specialNote: "",
                        stockCount: null,
                        variants: [],
                        imageUrl: "",
                        modelGlb: "",
                        modelUsdz: "",
                        description: "",
                        calories: null,
                        isVeg: true,
                        dietaryManualOverride: false,
                        ingredientsStructured: [],
                        modifierGroups: [],
                        allergens: [],
                        availableDays: [...DAYS],
                        updatedBy: "Staff",
                      });
                      setEditingParentId(defaultParentId);
                      setModalMode("add");
                      setActiveModalTab("general");
                    }}
                    className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Plus className="w-5 h-5" /> Add First Product
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group bg-white rounded-2xl border transition-all duration-300 flex flex-col relative overflow-hidden ${selectedItems.has(item.id)
                      ? "border-indigo-600 ring-4 ring-indigo-600/10"
                      : "border-slate-200 hover:shadow-xl hover:shadow-slate-200/50"
                      }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <button
                        onClick={() => toggleSelection(item.id)}
                        className="absolute top-3 left-3 z-10 p-1 rounded-md bg-white/90 backdrop-blur shadow-sm transition-transform active:scale-90"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            const category = categories.find((c) => c.id === item.categoryId);
                            const parentId = category?.parent_id || category?.id || "";
                            setEditingParentId(parentId);
                            setModalMode("edit");
                          }}
                          className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-slate-600 hover:text-indigo-600 shadow-sm transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      {item.modelGlb && (
                        <div className="absolute bottom-3 left-3 bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg">
                          <Box className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-900 truncate pr-2">
                          {item.name}
                        </h3>
                        <span className="text-sm font-black whitespace-nowrap text-slate-900">
                          ₹{item.price}
                        </span>
                      </div>
                      {(item.isTodaysSpecial || item.isChefSpecial) && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {item.isTodaysSpecial && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                              Today
                            </span>
                          )}
                          {item.isChefSpecial && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                              Chef
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {item.specialNote || item.description || "No description provided."}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {item.parentCategoryName
                            ? `${item.parentCategoryName} • ${item.categoryName || "General"}`
                            : item.categoryName || "Uncategorized"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOutOfStock(item, !item.isOutOfStock)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${item.isOutOfStock
                              ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                          >
                            {item.isOutOfStock ? "Out of Stock" : "In Stock"}
                          </button>
                          <div className="flex -space-x-1">
                            {item.allergens.slice(0, 3).map((a) => (
                              <div
                                key={a.type}
                                className="w-5 h-5 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-amber-700"
                                title={a.type}
                              >
                                {a.type[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {modalMode && editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setModalMode(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {modalMode === "add" ? "Create Product" : "Edit Product"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure details, pricing, and assets.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-[11px] font-bold text-slate-500">Veg</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!editingItem.isVeg}
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          isVeg: !editingItem.isVeg,
                          dietaryManualOverride: true,
                        })
                      }
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all ${editingItem.isVeg ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editingItem.isVeg ? "translate-x-0.5" : "translate-x-6"
                          }`}
                      />
                    </button>
                    <span className="text-[11px] font-bold text-slate-500">Non-Veg</span>
                  </div>
                  <button
                    onClick={() => setModalMode(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X />
                  </button>
                </div>
              </div>

              <div className="flex bg-slate-50/50 px-8 border-b border-slate-100">
                {[
                  { id: "general", label: "General Info" },
                  { id: "variants", label: "Variants & Price" },
                  { id: "modifiers", label: "Modifiers & Combos" },
                  { id: "assets", label: "Media & 3D" },
                  { id: "ingredients", label: "Ingredients" },
                  { id: "availability", label: "Availability" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeModalTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-white">
                {activeModalTab === "general" && (
                  <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-8 space-y-8">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                          Product Name
                        </label>
                        <input
                          value={editingItem.name}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              name: e.target.value,
                            })
                          }
                          className="w-full text-lg font-bold border-b-2 border-slate-100 focus:border-indigo-600 outline-none pb-2 transition-all"
                          placeholder="e.g. Signature Truffle Burger"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Description
                          </label>
                          <button
                            type="button"
                            onClick={handleAIAssist}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100"
                          >
                            AI Improve
                          </button>
                        </div>
                        <textarea
                          value={editingItem.description}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              description: e.target.value,
                            })
                          }
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm min-h-[120px] outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                          placeholder="Describe taste, texture, and presentation..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Base Price (₹)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={editingItem.price || ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  price:
                                    e.target.value === ""
                                      ? 0
                                      : parseFloat(e.target.value),
                                })
                              }
                              className="w-full h-[48px] p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all pl-8"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                              ₹
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Calories (kcal)
                          </label>
                          <input
                            type="number"
                            value={editingItem.calories ?? ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                calories: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className="w-full h-[48px] p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                            placeholder="e.g. 320"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Category Group
                          </label>
                          <div className="relative">
                            <select
                              value={selectedParentId}
                              onChange={(e) => {
                                const nextParentId = e.target.value;
                                const subs = getSubcategories(nextParentId);
                                const nextCategoryId = subs[0]?.id || nextParentId;
                                setEditingParentId(nextParentId);
                                setEditingItem({
                                  ...editingItem,
                                  categoryId: nextCategoryId,
                                });
                              }}
                              className="w-full h-[48px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                            >
                              {parentCategories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                            Subcategory
                          </label>
                          <div className="relative">
                            <select
                              value={editingItem.categoryId || ""}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  categoryId: e.target.value,
                                })
                              }
                              className="w-full h-[48px] px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                            >
                              {subcategoryOptions.length > 0 ? (
                                subcategoryOptions.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))
                              ) : (
                                <option value={selectedParentId}>
                                  {parentCategories.find((c) => c.id === selectedParentId)?.name ||
                                    "General"}
                                </option>
                              )}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-3">
                          Specials
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800">
                            <input
                              type="checkbox"
                              checked={editingItem.isTodaysSpecial}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  isTodaysSpecial: e.target.checked,
                                })
                              }
                            />
                            Today's Special
                          </label>
                          <label className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800">
                            <input
                              type="checkbox"
                              checked={editingItem.isChefSpecial}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  isChefSpecial: e.target.checked,
                                })
                              }
                            />
                            Chef's Special
                          </label>
                        </div>
                        <div className="mt-3">
                          <input
                            value={editingItem.specialNote || ""}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                specialNote: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                            placeholder="Special note (e.g., Only today, limited quantity)"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5" /> Allergen Matrix
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {ALLERGEN_LIST.map((alg) => {
                            const active = editingItem.allergens.some(
                              (a) => a.type === alg
                            );
                            return (
                              <button
                                key={alg}
                                onClick={() => {
                                  const next = active
                                    ? editingItem.allergens.filter(
                                      (a) => a.type !== alg
                                    )
                                    : [
                                      ...editingItem.allergens,
                                      {
                                        type: alg,
                                        confidence: "contains" as const,
                                      },
                                    ];
                                  setEditingItem({
                                    ...editingItem,
                                    allergens: next,
                                  });
                                }}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold transition-all ${active
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                  }`}
                              >
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${active ? "bg-white" : "bg-slate-200"
                                    }`}
                                />
                                {alg}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === "assets" && (
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        Display Image
                      </label>
                      <input
                        type="file"
                        hidden
                        ref={imageInputRef}
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "image")}
                      />
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="group relative aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:bg-slate-100"
                      >
                        {editingItem.imageUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaAsset("image");
                              }}
                              className="absolute top-3 right-3 z-20 rounded-lg bg-white/95 border border-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700 shadow-sm"
                            >
                              Remove
                            </button>
                            <img
                              src={editingItem.imageUrl}
                              className="w-full h-full object-cover"
                            />
                          </>
                        ) : (
                          <div className="text-center">
                            <UploadCloud className="mx-auto text-slate-300 mb-2" />
                            <span className="text-sm font-bold text-slate-900">
                              Upload JPG/PNG
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        3D Asset (.GLB)
                      </label>
                      <input
                        type="file"
                        hidden
                        ref={modelInputRef}
                        accept=".glb"
                        onChange={(e) => handleFileUpload(e, "model")}
                      />
                      <div
                        onClick={() => {
                          if (!editingItem.modelGlb && !editingItem.modelUsdz)
                            modelInputRef.current?.click();
                        }}
                        className={`group relative aspect-video bg-indigo-50/30 border-2 border-dashed border-indigo-100 rounded-3xl flex flex-col items-center justify-center transition-all ${editingItem.modelGlb || editingItem.modelUsdz
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-indigo-50"
                          }`}
                      >
                        {editingItem.modelGlb || editingItem.modelUsdz ? (
                          <div className="w-full h-full overflow-hidden rounded-3xl border border-indigo-100 bg-white">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                modelInputRef.current?.click();
                              }}
                              className="absolute top-3 right-3 z-20 rounded-lg bg-white/95 border border-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 shadow-sm"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaAsset("model");
                              }}
                              className="absolute top-3 right-[86px] z-20 rounded-lg bg-white/95 border border-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700 shadow-sm"
                            >
                              Remove
                            </button>
                            <a
                              href={normalizeAssetUrl(editingItem.modelGlb || editingItem.modelUsdz || "#")}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-3 left-3 z-20 rounded-lg bg-white/95 border border-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm"
                            >
                              Open File
                            </a>
                            {!modelViewerReady ? (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                Loading 3D preview...
                              </div>
                            ) : (
                              <model-viewer
                                key={editingItem.modelGlb || editingItem.modelUsdz}
                                src={normalizeAssetUrl(editingItem.modelGlb)}
                                ios-src={normalizeAssetUrl(editingItem.modelUsdz) || undefined}
                                alt={editingItem.name || "3D model"}
                                auto-rotate
                                ar
                                ar-modes="quick-look scene-viewer webxr"
                                ar-scale="fixed"
                                disable-zoom
                                interaction-prompt="none"
                                camera-orbit="0deg 75deg 1.8m"
                                min-camera-orbit="auto auto 1.8m"
                                max-camera-orbit="auto auto 1.8m"
                                environment-image="neutral"
                                shadow-intensity="1"
                                tone-mapping="commerce"
                                onLoad={() => setModelPreviewError("")}
                                onError={() =>
                                  setModelPreviewError(
                                    "Unable to load model preview. File URL may be inaccessible."
                                  )
                                }
                                style={{ width: "100%", height: "100%", background: "#eef2ff" }}
                              />
                            )}
                            <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                              <div className="inline-flex items-center gap-2 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 border border-indigo-100">
                                <Box className="w-3.5 h-3.5" />
                                3D Preview
                              </div>
                            </div>
                            {modelPreviewError && (
                              <div className="absolute bottom-3 right-3 z-20 max-w-[70%] rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700">
                                {modelPreviewError}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <Box className="mx-auto text-indigo-200 mb-2" />
                            <span className="text-sm font-bold text-indigo-300">
                              Upload GLB for AR
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === "ingredients" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900">
                          Structured Ingredients
                        </h4>
                        <p className="text-[11px] text-indigo-600 font-medium">
                          Define components for accurate tracking and costing.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            ingredientsStructured: [
                              ...editingItem.ingredientsStructured,
                              {
                                id: Date.now().toString(),
                                name: "",
                                quantity: 0,
                                unit: "g",
                              },
                            ],
                          })
                        }
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Ingredient
                      </button>
                    </div>

                    {editingItem.ingredientsStructured.length === 0 ? (
                      <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl">
                        <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <UtensilsCrossed className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">
                          No ingredients listed yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {editingItem.ingredientsStructured.map((ing, idx) => (
                          <div
                            key={ing.id}
                            className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl group hover:border-indigo-200 transition-all"
                          >
                            <div className="flex-1 grid grid-cols-12 gap-4">
                              <div className="col-span-6 space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  Ingredient Name
                                </span>
                                <input
                                  className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-100 focus:border-indigo-600 pb-1"
                                  value={ing.name}
                                  onChange={(e) => {
                                    const list = [
                                      ...editingItem.ingredientsStructured,
                                    ];
                                    list[idx].name = e.target.value;
                                    setEditingItem({
                                      ...editingItem,
                                      ingredientsStructured: list,
                                    });
                                  }}
                                  placeholder="e.g. Extra Virgin Olive Oil"
                                />
                              </div>
                              <div className="col-span-3 space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  Qty
                                </span>
                                <input
                                  type="number"
                                  className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-100 focus:border-indigo-600 pb-1"
                                  value={ing.quantity || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const list = [
                                      ...editingItem.ingredientsStructured,
                                    ];
                                    list[idx].quantity =
                                      e.target.value === ""
                                        ? 0
                                        : parseFloat(e.target.value);
                                    setEditingItem({
                                      ...editingItem,
                                      ingredientsStructured: list,
                                    });
                                  }}
                                />
                              </div>
                              <div className="col-span-3 space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">
                                  Unit
                                </span>
                                <select
                                  value={ing.unit}
                                  onChange={(e) => {
                                    const list = [
                                      ...editingItem.ingredientsStructured,
                                    ];
                                    list[idx].unit = e.target.value as any;
                                    setEditingItem({
                                      ...editingItem,
                                      ingredientsStructured: list,
                                    });
                                  }}
                                  className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-100 focus:border-indigo-600 pb-1"
                                >
                                  <option value="g">Grams (g)</option>
                                  <option value="ml">Milliliters (ml)</option>
                                  <option value="pcs">Pieces (pcs)</option>
                                  <option value="oz">Ounces (oz)</option>
                                </select>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setEditingItem({
                                  ...editingItem,
                                  ingredientsStructured:
                                    editingItem.ingredientsStructured.filter(
                                      (i) => i.id !== ing.id
                                    ),
                                })
                              }
                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === "variants" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <h4 className="font-bold text-slate-900">Serving Tiers</h4>
                      <button
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            variants: [
                              ...editingItem.variants,
                              {
                                id: crypto.randomUUID(),
                                label: "",
                                price: editingItem.price,
                                stockCount: null,
                              },
                            ],
                          })
                        }
                        className="text-indigo-600 font-bold text-xs bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all"
                      >
                        + Add Variant
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editingItem.variants.map((v, i) => (
                        <div
                          key={v.id}
                          className="flex gap-4 p-5 bg-slate-50 border border-slate-100 rounded-2xl items-center group"
                        >
                          <div className="flex-1 grid grid-cols-12 gap-6">
                            <div className="col-span-5 space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Size / Variant Label
                              </span>
                              <input
                                className="w-full bg-transparent border-b border-slate-200 font-bold text-sm outline-none focus:border-indigo-600 pb-1"
                                value={v.label}
                                onChange={(e) => {
                                  const newList = [...editingItem.variants];
                                  newList[i].label = e.target.value;
                                  setEditingItem({ ...editingItem, variants: newList });
                                }}
                                placeholder="e.g. Regular, Large, 500ml"
                              />
                            </div>
                            <div className="col-span-3 space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Price (₹)
                              </span>
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-slate-200 font-bold text-sm outline-none focus:border-indigo-600 pb-1"
                                value={v.price || ""}
                                onChange={(e) => {
                                  const newList = [...editingItem.variants];
                                  newList[i].price = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  setEditingItem({ ...editingItem, variants: newList });
                                }}
                              />
                            </div>
                            <div className="col-span-4 space-y-1">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Stock (Optional)
                              </span>
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-slate-200 font-bold text-sm outline-none focus:border-indigo-600 pb-1"
                                value={v.stockCount ?? ""}
                                placeholder="Unlimited"
                                onChange={(e) => {
                                  const newList = [...editingItem.variants];
                                  newList[i].stockCount = e.target.value === "" ? null : parseInt(e.target.value);
                                  setEditingItem({ ...editingItem, variants: newList });
                                }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setEditingItem({
                                ...editingItem,
                                variants: editingItem.variants.filter((item) => item.id !== v.id),
                              })
                            }
                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeModalTab === "modifiers" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">Modifier Groups</h4>
                        <p className="text-xs text-slate-500">Use as add-ons or combo choices. Enforced at checkout/order add.</p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            modifierGroups: [
                              ...(editingItem.modifierGroups || []),
                              {
                                id: crypto.randomUUID(),
                                title: "",
                                min_select: 0,
                                max_select: 1,
                                required: false,
                                is_combo: false,
                                options: [],
                              },
                            ],
                          })
                        }
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                      >
                        + Add Group
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(editingItem.modifierGroups || []).map((group, gi) => (
                        <div key={group.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                            <input
                              value={group.title}
                              onChange={(e) => {
                                const next = [...(editingItem.modifierGroups || [])];
                                next[gi] = { ...group, title: e.target.value };
                                setEditingItem({ ...editingItem, modifierGroups: next });
                              }}
                              className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                              placeholder="Group title (e.g. Toppings)"
                            />
                            <input
                              type="number"
                              min={0}
                              value={group.min_select}
                              onChange={(e) => {
                                const next = [...(editingItem.modifierGroups || [])];
                                next[gi] = { ...group, min_select: Math.max(0, Number(e.target.value) || 0) };
                                setEditingItem({ ...editingItem, modifierGroups: next });
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Min"
                            />
                            <input
                              type="number"
                              min={1}
                              value={group.max_select}
                              onChange={(e) => {
                                const next = [...(editingItem.modifierGroups || [])];
                                next[gi] = { ...group, max_select: Math.max(1, Number(e.target.value) || 1) };
                                setEditingItem({ ...editingItem, modifierGroups: next });
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Max"
                            />
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={group.required}
                                onChange={(e) => {
                                  const next = [...(editingItem.modifierGroups || [])];
                                  next[gi] = { ...group, required: e.target.checked };
                                  setEditingItem({ ...editingItem, modifierGroups: next });
                                }}
                              />
                              Required
                            </label>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={group.is_combo}
                                onChange={(e) => {
                                  const next = [...(editingItem.modifierGroups || [])];
                                  next[gi] = { ...group, is_combo: e.target.checked };
                                  setEditingItem({ ...editingItem, modifierGroups: next });
                                }}
                              />
                              Combo
                            </label>
                          </div>

                          <div className="mt-3 space-y-2">
                            {(group.options || []).map((opt, oi) => (
                              <div key={opt.id} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                <input
                                  value={opt.label}
                                  onChange={(e) => {
                                    const next = [...(editingItem.modifierGroups || [])];
                                    const opts = [...(group.options || [])];
                                    opts[oi] = { ...opt, label: e.target.value };
                                    next[gi] = { ...group, options: opts };
                                    setEditingItem({ ...editingItem, modifierGroups: next });
                                  }}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  placeholder="Option label"
                                />
                                <input
                                  type="number"
                                  value={opt.price_delta}
                                  onChange={(e) => {
                                    const next = [...(editingItem.modifierGroups || [])];
                                    const opts = [...(group.options || [])];
                                    opts[oi] = { ...opt, price_delta: Number(e.target.value) || 0 };
                                    next[gi] = { ...group, options: opts };
                                    setEditingItem({ ...editingItem, modifierGroups: next });
                                  }}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                  placeholder="Price delta"
                                />
                                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                                  <input
                                    type="checkbox"
                                    checked={opt.is_available !== false}
                                    onChange={(e) => {
                                      const next = [...(editingItem.modifierGroups || [])];
                                      const opts = [...(group.options || [])];
                                      opts[oi] = { ...opt, is_available: e.target.checked };
                                      next[gi] = { ...group, options: opts };
                                      setEditingItem({ ...editingItem, modifierGroups: next });
                                    }}
                                  />
                                  Available
                                </label>
                                <button
                                  onClick={() => {
                                    const next = [...(editingItem.modifierGroups || [])];
                                    next[gi] = { ...group, options: (group.options || []).filter((o) => o.id !== opt.id) };
                                    setEditingItem({ ...editingItem, modifierGroups: next });
                                  }}
                                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <button
                              onClick={() => {
                                const next = [...(editingItem.modifierGroups || [])];
                                next[gi] = {
                                  ...group,
                                  options: [
                                    ...(group.options || []),
                                    { id: crypto.randomUUID(), label: "", price_delta: 0, is_available: true },
                                  ],
                                };
                                setEditingItem({ ...editingItem, modifierGroups: next });
                              }}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              + Add Option
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem({
                                  ...editingItem,
                                  modifierGroups: (editingItem.modifierGroups || []).filter((g) => g.id !== group.id),
                                });
                              }}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Delete Group
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeModalTab === "availability" && (
                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                        <Box className="w-4 h-4" /> Stock Status
                      </h4>
                      <div className="flex items-center justify-between gap-6">
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {editingItem.isOutOfStock ? "Marked Out of Stock" : "Available to Order"}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Disable ordering without archiving the item.
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setEditingItem({
                              ...editingItem,
                              isOutOfStock: !editingItem.isOutOfStock,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${editingItem.isOutOfStock
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          {editingItem.isOutOfStock ? "Mark In Stock" : "Mark Out of Stock"}
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                      <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Weekly Availability
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {DAYS.map((day) => {
                          const active = editingItem.availableDays.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const next = active
                                  ? editingItem.availableDays.filter((d) => d !== day)
                                  : [...editingItem.availableDays, day];
                                setEditingItem({
                                  ...editingItem,
                                  availableDays: next,
                                });
                              }}
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black uppercase transition-all border-2 ${active
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                : "bg-white border-slate-100 text-slate-300 hover:border-slate-200"
                                }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      setEditingItem({
                        ...editingItem,
                        isArchived: !editingItem.isArchived,
                      })
                    }
                    className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center gap-2 transition-colors"
                  >
                    {editingItem.isArchived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {editingItem.isArchived ? "Restore to Menu" : "Archive Product"}
                  </button>
                  {!!editingItem.id && (
                    <button
                      onClick={handleDeleteItem}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Product
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalMode(null)}
                    className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-10 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSyncModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !isSyncingMenu && setShowSyncModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Sync Menu Across Branches</h3>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  onClick={() => !isSyncingMenu && setShowSyncModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  This will overwrite menu categories, menu items, and prices in selected target branches.
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Source Branch
                  </label>
                  <select
                    value={syncSourceBranchId}
                    onChange={(e) => {
                      const nextSource = e.target.value;
                      setSyncSourceBranchId(nextSource);
                      setSyncTargetBranchIds((prev) => prev.filter((id) => id !== nextSource));
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="">Select source branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.restaurant_id} value={branch.restaurant_id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Target Branches
                  </label>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {branchOptionsForSync.length === 0 && (
                      <p className="text-xs text-slate-500">No target branches available.</p>
                    )}
                    {branchOptionsForSync.map((branch) => (
                      <label
                        key={branch.restaurant_id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-slate-700">{branch.name}</span>
                        <input
                          type="checkbox"
                          checked={syncTargetBranchIds.includes(branch.restaurant_id)}
                          onChange={() => toggleSyncTargetBranch(branch.restaurant_id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
                  disabled={isSyncingMenu}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSync}
                  disabled={isSyncingMenu || !syncSourceBranchId || syncTargetBranchIds.length === 0}
                  className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50"
                >
                  {isSyncingMenu ? "Syncing..." : "Confirm Sync"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          if (action) void action();
        }}
      />
    </div>
  );
}
