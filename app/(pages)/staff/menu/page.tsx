"use client";

import { toProxiedMediaUrl } from "@/app/lib/modelUrl";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Search,
  Plus,
  X,
  Pencil,
  Image as ImageIcon,
  Trash2,
  Archive,
  ArchiveRestore,
  Check,
  CheckSquare,
  Square,
  UtensilsCrossed,
  Box,
  UploadCloud,
  Info,
  Calendar,
  ChefHat,
  Loader2,
  History,
  Flame,
  Clock3,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Sparkles,
  Scale,
  Copy,
  RefreshCw,
  Tags,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import StaffSidebar from "@/app/components/StaffSidebar";
import { api, getBackendBase } from "@/app/lib/api";
import { toast } from "react-hot-toast";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import ArSizeStudio, { type ArSizePatch } from "@/app/components/menu/ArSizeStudio";
import { useModelViewerEvents } from "@/app/lib/useModelViewerEvents";
import { CustomDateTimePicker } from "@/app/components/ui/CustomDateTimePicker";
import { ProductSelect, SegmentedControl, CheckRow, DishMultiPicker } from "@/app/components/menu/ProductFormControls";

import { Select } from "@/app/components/ui/Select";
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
type SpiceLevel = "none" | "mild" | "medium" | "hot";

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
  width_cm?: number;
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
  foodCost: number;
  estimatedPrepMinutes: number | null;
  isVeg: boolean;
  dietaryManualOverride: boolean;
  spiceLevel: SpiceLevel;
  isBestSeller: boolean;
  isNew: boolean;
  pairWithItemIds: string[];
  publishAt: string;
  unpublishAt: string;
  scheduledPrice: number | null;
  scheduledPriceEffectiveAt: string;
  ingredientsStructured: StructuredIngredient[];
  modifierGroups: ModifierGroup[];
  allergens: { type: Allergen; confidence: AllergenConfidence }[];
  availableDays: DayOfWeek[];
  updatedBy: string;
  hsn_code?: string;
  gst_rate?: number;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  hasSteam?: boolean;
  steamIntensity?: "none" | "gentle" | "medium" | "heavy";
  steamColor?: "white" | "warm" | "cool";
  modelScale?: number;
};

type CategoryOption = {
  id: string;
  name: string;
  parent_id?: string | null;
  parent_name?: string | null;
  sort_order?: number;
  banner_image_url?: string;
  available_days?: DayOfWeek[];
  available_time_start?: string | null;
  available_time_end?: string | null;
  active_from?: string | null;
  active_until?: string | null;
  is_seasonal?: boolean;
  gst_rate?: number;
};

type MenuHealthItem = {
  id: string;
  name: string;
  category_name: string;
  price: number;
  food_cost: number;
  order_count: number;
  out_of_stock_events: number;
  missing_image: boolean;
  missing_model: boolean;
  missing_category: boolean;
  missing_allergens: boolean;
  is_archived: boolean;
  hidden_but_linked: boolean;
};

type MenuVersion = {
  id: string;
  created_at: string;
  created_by?: string | null;
  source: string;
  snapshot?: Partial<MenuItem>;
};

type BranchOption = {
  restaurant_id: string;
  name: string;
  role: string;
};

const normalizeAssetUrl = (value: string): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Same-origin proxy per storage host: the CDNs send no CORS headers.
  return toProxiedMediaUrl(raw);
};

const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const fromDateTimeLocal = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const authFetch = async (url: string, options: RequestInit = {}) => {
  return await api(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
};

const CustomSelect = ({ value, onChange, options, placeholder, className = "", buttonClassName = "", optionClassName = "" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt: any) => opt.value === value);

  return (
    <div className={`relative group w-full ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 pl-4 pr-10 text-[15px] bg-[#F8F9FA] border border-[#DEE2E6] rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 transition-all flex items-center justify-between hover:bg-slate-100/50 ${buttonClassName} ${isOpen ? "border-[#fe5c13] bg-white ring-4 ring-[#fe5c13]/10" : ""}`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-900" : "text-slate-400"}`}>{selectedOption ? selectedOption.label : placeholder}</span>
      </button>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[70] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-[0_18px_40px_-16px_rgba(15,17,23,0.35)] overflow-hidden p-1.5"
          >
            <div className="max-h-60 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar">
              {options.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-[14px] rounded-lg transition-colors hover:bg-slate-50 flex items-center justify-between ${optionClassName} ${value === opt.value ? "text-slate-900 font-semibold" : "text-slate-700"}`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function MenuPage() {
  const router = useRouter();
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
  const [showBulkPriceEdit, setShowBulkPriceEdit] = useState(false);
  const [isBulkPriceEditing, setIsBulkPriceEditing] = useState(false);
  const [bulkPriceOp, setBulkPriceOp] = useState<"increase" | "decrease" | "set">("increase");
  const [bulkPriceType, setBulkPriceType] = useState<"percentage" | "fixed">("percentage");
  const [bulkPriceValue, setBulkPriceValue] = useState("");
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingParentId, setEditingParentId] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryParentId, setNewSubcategoryParentId] = useState("");
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [showSubcategoryManager, setShowSubcategoryManager] = useState(false);
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string>("");
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [isRenamingSubcategory, setIsRenamingSubcategory] = useState(false);
  const [editingSubcategoryGstRate, setEditingSubcategoryGstRate] = useState<number>(5);
  const [newSubcategoryGstRate, setNewSubcategoryGstRate] = useState<number>(5);
  const [activeModalTab, setActiveModalTab] = useState<
    "general" | "variants" | "assets" | "ingredients" | "modifiers" | "nutrition" | "availability" | "history"
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
  const [isModelDragging, setIsModelDragging] = useState(false);
  const [healthItems, setHealthItems] = useState<MenuHealthItem[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [itemHistory, setItemHistory] = useState<MenuVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  // QR Menu and Ordering plans have no 3D / AR models.
  const [arLocked, setArLocked] = useState(false);
  const staffModelViewerRef = useRef<any>(null);
  const attachStaffViewer = useModelViewerEvents(
    {
      load: () => setModelPreviewError(""),
      error: () => setModelPreviewError("Unable to load model preview. File URL may be inaccessible."),
    },
    staffModelViewerRef,
  );
  const applyArSizePatch = React.useCallback((patch: ArSizePatch) => {
    setEditingItem((prev) =>
      prev
        ? {
            ...prev,
            ...patch,
            variants: patch.variants
              ? prev.variants.map((v) => {
                  const next = patch.variants!.find((p) => p.id === v.id);
                  return next ? { ...v, width_cm: next.width_cm } : v;
                })
              : prev.variants,
          }
        : prev,
    );
  }, []);

  useEffect(() => {
    refreshMenu();
    refreshCategories();
    refreshHealth();
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
      setArLocked((me as any)?.plan_features?.has_ar === false);
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
        isBestSeller: item.isBestSeller ?? item.is_best_seller ?? false,
        isNew: item.isNew ?? item.is_new ?? false,
        spiceLevel: (item.spiceLevel ?? item.spice_level ?? "none") as SpiceLevel,
        hasSteam: Boolean(item.hasSteam ?? item.has_steam ?? false),
        steamIntensity: (item.steamIntensity ?? item.steam_intensity ?? "medium") as any,
        steamColor: (item.steamColor ?? item.steam_color ?? "white") as any,
        modelScale: item.modelScale ?? item.model_scale ?? 1.00,
        specialNote:
          typeof item.specialNote === "object"
            ? item.specialNote?.String ?? ""
            : item.specialNote ?? item.special_note ?? "",
        foodCost:
          typeof item.foodCost === "number"
            ? item.foodCost
            : typeof item.food_cost === "number"
              ? item.food_cost
              : 0,
        estimatedPrepMinutes:
          typeof item.estimatedPrepMinutes === "number"
            ? item.estimatedPrepMinutes
            : typeof item.estimated_prep_minutes === "number"
              ? item.estimated_prep_minutes
              : null,
        pairWithItemIds: Array.isArray(item.pairWithItemIds ?? item.pair_with_item_ids)
          ? (item.pairWithItemIds ?? item.pair_with_item_ids).map(String)
          : [],
        publishAt: toDateTimeLocal(item.publishAt ?? item.publish_at ?? ""),
        unpublishAt: toDateTimeLocal(item.unpublishAt ?? item.unpublish_at ?? ""),
        scheduledPrice:
          typeof item.scheduledPrice === "number"
            ? item.scheduledPrice
            : typeof item.scheduled_price === "number"
              ? item.scheduled_price
              : null,
        scheduledPriceEffectiveAt: toDateTimeLocal(
          item.scheduledPriceEffectiveAt ?? item.scheduled_price_effective_at ?? ""
        ),
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

  const refreshHealth = async () => {
    try {
      setLoadingHealth(true);
      const data = await authFetch("/api/admin/menu/health");
      setHealthItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setHealthItems([]);
    } finally {
      setLoadingHealth(false);
    }
  };

  const refreshHistory = async (itemId: string) => {
    if (!itemId) return;
    try {
      setLoadingHistory(true);
      const data = await authFetch(`/api/admin/menu/item/history?item_id=${itemId}`);
      setItemHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItemHistory([]);
    } finally {
      setLoadingHistory(false);
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

    // Reset file input value to allow re-uploading the same file immediately
    e.target.value = "";

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
        const ct = file.type || "model/gltf-binary";
        const presignRes: any = await authFetch(
          `/api/admin/menu/item/model/upload-url?item_id=${editingItem.id}&content_type=${encodeURIComponent(ct)}`,
          { method: "POST" }
        );

        if (!presignRes?.upload_url || !presignRes?.public_url) {
          throw new Error("Failed to generate model upload URL.");
        }

        // Upload the GLB file directly to S3 (bypassing Vercel proxy completely)
        await fetch(presignRes.upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": ct },
        });

        // Trigger Go backend processing & conversion via lightweight JSON commit request
        const commitRes: any = await authFetch(
          `/api/admin/menu/item/model/commit`,
          {
            method: "POST",
            body: JSON.stringify({
              item_id: editingItem.id,
              model_url: presignRes.public_url,
              filename: file.name,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!commitRes?.model_glb) {
          throw new Error("Model processing failed. No GLB URL returned.");
        }

        setEditingItem({
          ...editingItem,
          modelGlb: commitRes.model_glb || "",
          modelUsdz: commitRes.model_usdz || "",
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
      if (imageInputRef.current) imageInputRef.current.value = "";
      toast.success("Image removed. Click Save Changes to persist.");
      return;
    }

    // Optimistically clear the UI right away.
    setEditingItem({ ...editingItem, modelGlb: "", modelUsdz: "" });
    setModelPreviewError("");
    if (modelInputRef.current) modelInputRef.current.value = "";
    
    // Fire the DELETE in the background so S3 + DB are cleaned up immediately.
    if (modalMode === "add") {
      toast.success("3D model removed");
      return;
    }
    authFetch(`/api/admin/menu/item/model?item_id=${editingItem.id}`, { method: "DELETE" })
      .then(() => toast.success("3D model removed"))
      .catch((err) => {
        // If it's a 404, it means the item was already deleted or doesn't exist in DB.
        if (err?.message?.includes("404") || err?.status === 404) {
          toast.success("3D model removed");
        } else {
          toast.error("Failed to remove 3D model from server. Please try saving again.");
        }
      });
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
          Promise.all([refreshMenu(true), refreshHealth()]);
        } catch (err: any) {
          const msg = err?.message || "";
          if (msg.toLowerCase().includes("foreign key") || msg.toLowerCase().includes("violates")) {
            toast.error("Products with active order history cannot be deleted. Please archive them instead.");
          } else {
            toast.error(msg || "Delete failed");
          }
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
    try {
      for (const id of selectedItems) {
        const item = items.find((i) => i.id === id);
        if (!item) continue;
        await authFetch(`/api/admin/menu/item?item_id=${id}`, {
          method: "PUT",
          body: JSON.stringify(buildItemPayload(item, { isArchived: action === "archive" })),
        });
      }
      toast.success(`Selected product(s) ${action}d`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} product(s)`);
    } finally {
      setSelectedItems(new Set());
      Promise.all([refreshMenu(true), refreshHealth()]);
    }
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
          let errorMessage = "";

          for (const id of ids) {
            try {
              await authFetch(`/api/admin/menu/item?item_id=${id}`, {
                method: "DELETE",
              });
            } catch (err: any) {
              failed += 1;
              errorMessage = err?.message || errorMessage;
            }
          }

          setSelectedItems(new Set());
          Promise.all([refreshMenu(true), refreshHealth()]);

          if (failed === 0) {
            toast.success(`${ids.length} product(s) deleted`);
          } else if (failed === ids.length) {
            if (errorMessage.toLowerCase().includes("foreign key") || errorMessage.toLowerCase().includes("violates")) {
              toast.error("Products with active order history cannot be deleted. Please archive them instead.");
            } else {
              toast.error(errorMessage || "Delete failed");
            }
          } else {
            toast.error(`Deleted ${ids.length - failed}/${ids.length} products. Some could not be deleted due to active order history.`);
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
        body: JSON.stringify({
          name: trimmed,
          parent_id: parentId,
          sort_order: getSubcategories(parentId).length,
          available_days: DAYS,
          gst_rate: newSubcategoryGstRate,
        }),
      });
      setNewSubcategoryName("");
      setShowAddSubcategoryModal(false);
      toast.success("Subcategory added");
      refreshCategories();
    } catch (e: any) {
      if (e?.status === 403) {
        toast.error("Only owners/managers can add categories");
        return;
      }
      if (e?.status === 409) {
        const clash = categories.find(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        );
        const where = clash?.parent_id
          ? categories.find((c) => c.id === clash.parent_id)?.name
          : "";
        toast.error(
          where
            ? `"${trimmed}" already exists under ${where}. Use a different name.`
            : `A category named "${trimmed}" already exists`
        );
        refreshCategories();
        return;
      }
      toast.error(e?.message || "Failed to add subcategory");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const deleteSubcategory = (category: CategoryOption) => {
    if (!canManageCategories) {
      toast.error("Insufficient permissions");
      return;
    }
    const parentName =
      categories.find((c) => c.id === category.parent_id)?.name || "its section";
    const itemCount = items.filter((i) => i.categoryId === category.id).length;
    setConfirmDialog({
      title: `Delete "${category.name}"?`,
      message:
        itemCount > 0
          ? `${itemCount} product(s) in this subcategory will move to ${parentName}. This cannot be undone.`
          : "This subcategory will be removed. This cannot be undone.",
      onConfirm: async () => {
        try {
          await authFetch(`/api/admin/menu/category/${category.id}`, {
            method: "DELETE",
          });
          if (editingSubcategoryId === category.id) cancelRenameSubcategory();
          toast.success("Subcategory deleted");
          await Promise.all([refreshCategories(), refreshMenu(true)]);
        } catch (e: any) {
          if (e?.status === 403) {
            toast.error("Only owners/managers can delete categories");
            return;
          }
          toast.error(e?.message || "Failed to delete subcategory");
        }
      },
    });
  };

  const startRenameSubcategory = (category: CategoryOption) => {
    setEditingSubcategoryId(category.id);
    setEditingSubcategoryName(category.name);
    setEditingSubcategoryGstRate((category as any).gst_rate ?? 5.00);
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
    if (current.name === trimmed && current.gst_rate === editingSubcategoryGstRate) {
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
          sort_order: current.sort_order ?? 0,
          banner_image_url: current.banner_image_url || "",
          available_days: current.available_days || DAYS,
          available_time_start: current.available_time_start || "",
          available_time_end: current.available_time_end || "",
          active_from: current.active_from || "",
          active_until: current.active_until || "",
          is_seasonal: current.is_seasonal || false,
          gst_rate: editingSubcategoryGstRate,
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

  const buildItemPayload = (item: MenuItem, overrides: Partial<MenuItem> = {}) => {
    const next = { ...item, ...overrides };
    return {
      category_id: next.categoryId || undefined,
      name: next.name,
      price: next.price,
      description: next.description || "",
      calories: next.calories,
      food_cost: next.foodCost ?? 0,
      estimated_prep_minutes: next.estimatedPrepMinutes,
      is_veg: next.isVeg,
      dietary_manual_override: next.dietaryManualOverride,
      image_url: next.imageUrl || "",
      model_glb: next.modelGlb || "",
      model_usdz: next.modelUsdz || "",
      available_days: next.availableDays || [],
      is_archived: next.isArchived,
      is_out_of_stock: next.isOutOfStock,
      is_todays_special: next.isTodaysSpecial,
      is_chef_special: next.isChefSpecial,
      is_best_seller: next.isBestSeller,
      is_new: next.isNew,
      spice_level: next.spiceLevel || "none",
      pair_with_item_ids: next.pairWithItemIds || [],
      publish_at: next.publishAt ? fromDateTimeLocal(next.publishAt) : "",
      unpublish_at: next.unpublishAt ? fromDateTimeLocal(next.unpublishAt) : "",
      scheduled_price: next.scheduledPrice,
      scheduled_price_effective_at: next.scheduledPriceEffectiveAt
        ? fromDateTimeLocal(next.scheduledPriceEffectiveAt)
        : "",
      special_note: next.specialNote || "",
      hsn_code: next.hsn_code || "",
      gst_rate: next.gst_rate !== undefined ? next.gst_rate : undefined,
      width_cm: next.width_cm !== undefined ? next.width_cm : null,
      height_cm: next.height_cm !== undefined ? next.height_cm : null,
      depth_cm: next.depth_cm !== undefined ? next.depth_cm : null,
      has_steam: next.hasSteam !== undefined ? next.hasSteam : false,
      steam_intensity: next.steamIntensity || "medium",
      steam_color: next.steamColor || "white",
      model_scale: next.modelScale !== undefined ? next.modelScale : 1.00,
    };
  };

  const moveCategory = async (category: CategoryOption, direction: -1 | 1) => {
    const siblings = categories
      .filter((c) => (c.parent_id || "") === (category.parent_id || ""))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = siblings.findIndex((c) => c.id === category.id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;
    try {
      await Promise.all([
        authFetch("/api/admin/menu/category", {
          method: "PUT",
          body: JSON.stringify({
            category_id: category.id,
            name: category.name,
            sort_order: swapWith.sort_order ?? index + direction,
            banner_image_url: category.banner_image_url || "",
            available_days: category.available_days || DAYS,
            available_time_start: category.available_time_start || "",
            available_time_end: category.available_time_end || "",
            active_from: category.active_from || "",
            active_until: category.active_until || "",
            is_seasonal: category.is_seasonal || false,
          }),
        }),
        authFetch("/api/admin/menu/category", {
          method: "PUT",
          body: JSON.stringify({
            category_id: swapWith.id,
            name: swapWith.name,
            sort_order: category.sort_order ?? index,
            banner_image_url: swapWith.banner_image_url || "",
            available_days: swapWith.available_days || DAYS,
            available_time_start: swapWith.available_time_start || "",
            available_time_end: swapWith.available_time_end || "",
            active_from: swapWith.active_from || "",
            active_until: swapWith.active_until || "",
            is_seasonal: swapWith.is_seasonal || false,
          }),
        }),
      ]);
      toast.success("Category order updated");
      refreshCategories();
    } catch {
      toast.error("Failed to reorder category");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!editingItem?.id) return;
    try {
      await authFetch("/api/admin/menu/item/restore", {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });
      toast.success("Version restored");
      await Promise.all([refreshMenu(true), refreshHealth(), refreshHistory(editingItem.id)]);
      const refreshed = items.find((item) => item.id === editingItem.id);
      if (refreshed) setEditingItem(refreshed);
    } catch (err: any) {
      toast.error(err?.message || "Restore failed");
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
        body: JSON.stringify(buildItemPayload(item, { isOutOfStock })),
      });
    } catch (err) {
      setItems(snapshot);
      toast.error("Update failed");
    }
  };

  const handleBulkPriceEdit = async () => {
    if (selectedItems.size === 0 || !bulkPriceValue) return;
    const value = parseFloat(bulkPriceValue);
    if (isNaN(value) || value < 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsBulkPriceEditing(true);
    const snapshot = items;
    const selected = new Set(selectedItems);
    
    const nextItems = items.map((i) => {
      if (!selected.has(i.id)) return i;
      let newPrice = i.price;
      if (bulkPriceOp === "set") {
        newPrice = value;
      } else {
        const delta = bulkPriceType === "percentage" ? (i.price * value) / 100 : value;
        if (bulkPriceOp === "increase") {
          newPrice = i.price + delta;
        } else if (bulkPriceOp === "decrease") {
          newPrice = Math.max(0, i.price - delta);
        }
      }
      newPrice = Math.round(newPrice * 100) / 100;
      return { ...i, price: newPrice };
    });

    setItems(nextItems);

    try {
      const selectedItemUpdates = nextItems.filter(i => selected.has(i.id));
      let successCount = 0;
      
      for (const updatedItem of selectedItemUpdates) {
        await authFetch("/api/admin/menu/item", {
          method: "PUT",
          body: JSON.stringify(buildItemPayload(updatedItem)),
        });
        successCount++;
      }
      
      toast.success(`Updated prices for ${successCount} items`);
      setSelectedItems(new Set());
      setShowBulkPriceEdit(false);
      setBulkPriceValue("");
      Promise.all([refreshMenu(true), refreshHealth()]);
    } catch (err) {
      setItems(snapshot);
      toast.error("Bulk price update failed");
    } finally {
      setIsBulkPriceEditing(false);
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
            body: JSON.stringify(buildItemPayload(item, { isOutOfStock })),
          });
        })
      );
      setSelectedItems(new Set());
      Promise.all([refreshMenu(true), refreshHealth()]);
    } catch (err) {
      setItems(snapshot);
      toast.error("Bulk update failed");
    }
  };

  const handleSave = async () => {
    if (!editingItem || isSaving) return;

    if (!editingItem.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (editingItem.price === undefined || editingItem.price === null || editingItem.price <= 0) {
      toast.error("A valid price greater than 0 is required");
      return;
    }

    setIsSaving(true);

    try {
      let itemId = editingItem.id;
      const categoryId = editingItem.categoryId || getDefaultCategoryId();

      if (!categoryId) {
        toast.error("Please create/select a category first");
        setIsSaving(false);
        return;
      }

      if (modalMode === "add") {
        const res: any = await authFetch("/api/admin/menu/item", {
          method: "POST",
          body: JSON.stringify({
            id: itemId,
            category_id: categoryId,
            name: editingItem.name,
            price: editingItem.price,
          }),
        });
        itemId = res.id;
      }

      await authFetch(`/api/admin/menu/item?item_id=${itemId}`, {
        method: "PUT",
        body: JSON.stringify(buildItemPayload({ ...editingItem, categoryId })),
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
              width_cm: v.width_cm,
              ...(v.stockCount != null ? { stock: v.stockCount } : {}),
            }),
          });
        }
      }

      // Existing size options that changed (label, price, stock or AR size).
      // Without this, a new AR size for e.g. "Large" was silently dropped.
      for (const v of editingItem.variants) {
        const before = existing.find((e) => e.id === v.id);
        if (!before) continue;
        const sameWidth = (Number(before.width_cm) || null) === (Number(v.width_cm) || null);
        if (
          before.label === v.label &&
          Number(before.price) === Number(v.price) &&
          (before.stockCount ?? null) === (v.stockCount ?? null) &&
          sameWidth
        ) continue;
        await authFetch(`/api/admin/menu/item/variant?variant_id=${v.id}`, {
          method: "PUT",
          body: JSON.stringify({
            label: v.label,
            price: Math.round(Number(v.price)),
            width_cm: v.width_cm ?? null,
            ...(v.stockCount != null ? { stock: v.stockCount } : {}),
          }),
        });
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
      Promise.all([refreshMenu(true), refreshHealth()]);
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
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
          await Promise.all([refreshCategories(), refreshMenu(true), refreshHealth()]);
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
      await Promise.all([refreshCategories(), refreshMenu(true), refreshHealth()]);
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
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[#E8E8E3] bg-white px-8 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">
              Menu engineering
            </h1>
            <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
              {items.length} {items.length === 1 ? "product" : "products"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canImportMenu && (
              <>
                <div className="flex h-10 items-center rounded-xl border border-[#E8E8E3] bg-white pl-1">
                  <div className="w-52">
                    <CustomSelect
                      value={sourceBranchId}
                      onChange={(val: any) => setSourceBranchId(val)}
                      options={branchOptionsForImport.map((branch) => ({
                        value: branch.restaurant_id,
                        label: branch.name,
                      }))}
                      placeholder="Copy menu from branch"
                      buttonClassName="!h-8 !min-h-8 !py-0 !px-3 !rounded-lg !border-0 !bg-transparent !text-[13px] !font-medium !text-[#0F1117] hover:!bg-[#FAFAF7]"
                      optionClassName="!py-2 !text-[13px]"
                    />
                  </div>
                  {sourceBranchId && (
                    <button
                      type="button"
                      onClick={() => setSourceBranchId("")}
                      disabled={isImportingMenu}
                      aria-label="Clear branch"
                      title="Clear branch"
                      className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <span className="h-5 w-px bg-[#E8E8E3]" aria-hidden />
                  <button
                    type="button"
                    onClick={handleImportMenu}
                    disabled={!sourceBranchId || isImportingMenu}
                    title={sourceBranchId ? "Copy this branch's menu here" : "Choose a branch first"}
                    className="flex h-full items-center gap-1.5 rounded-r-xl px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:bg-[#FAFAF7] disabled:cursor-not-allowed disabled:text-[#C4C4BE] disabled:hover:bg-transparent"
                  >
                    {isImportingMenu ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    {isImportingMenu ? "Copying" : "Copy menu"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openSyncModal}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                >
                  <RefreshCw className="h-4 w-4 text-[#6B7280]" />
                  Sync menu
                </button>
                <span className="mx-1 hidden h-6 w-px bg-[#E8E8E3] sm:block" aria-hidden />
              </>
            )}
            {canManageCategories && (
              <button
                onClick={() => setShowSubcategoryManager(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1117] transition-colors hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
              >
                <Tags className="h-4 w-4 text-[#6B7280]" />
                Categories
              </button>
            )}
            <button
              onClick={() => {
                setShowArchived(!showArchived);
                setSelectedItems(new Set());
              }}
              aria-pressed={showArchived}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${showArchived
                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100/70"
                : "border-[#E8E8E3] bg-white text-[#0F1117] hover:border-[#D6D6CF] hover:bg-[#FAFAF7]"
                }`}
            >
              {showArchived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4 text-[#6B7280]" />
              )}
              {showArchived ? "Exit archive" : "Archive"}
            </button>
            <button
              onClick={() => {
                const defaultCategoryId = getDefaultCategoryId();
                const defaultParentId =
                  categories.find((c) => c.id === defaultCategoryId)?.parent_id ||
                  categories.find((c) => c.id === defaultCategoryId)?.id ||
                  "";
                setEditingItem({
                  id: generateUUID(),
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
                  hasSteam: false,
                  steamIntensity: "medium",
                  steamColor: "white",
                  modelScale: 1.00,
                  description: "",
                  calories: null,
                  foodCost: 0,
                  estimatedPrepMinutes: null,
                  isVeg: true,
                  dietaryManualOverride: false,
                  spiceLevel: "none",
                  isBestSeller: false,
                  isNew: true,
                  pairWithItemIds: [],
                  publishAt: "",
                  unpublishAt: "",
                  scheduledPrice: null,
                  scheduledPriceEffectiveAt: "",
                  ingredientsStructured: [],
                  modifierGroups: [],
                  allergens: [],
                  availableDays: [...DAYS],
                  updatedBy: "Staff",
                });
                setEditingParentId(defaultParentId);
                setItemHistory([]);
                setModalMode("add");
                setActiveModalTab("general");
              }}
              className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> New product
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#FAFAF7]">
          <div className="flex flex-col">
            <div className="bg-white border-b border-slate-200 shadow-sm flex flex-col sticky top-0 z-30">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 md:px-6 bg-white">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl overflow-x-auto scrollbar-hide max-w-[80vw]">
                    {["all", ...parentCategories.map((c) => c.name)].map(
                      (cat) => (
                        <button
                          key={cat}
                          onClick={() => setActiveTab(cat as any)}
                          className={`px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap ${
                            activeTab === cat
                              ? "bg-white text-gray-900 shadow-sm ring-1 ring-slate-200/60"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                          }`}
                        >
                          {cat}
                        </button>
                      ),
                    )}
                  </div>
                  {filteredItems.length > 0 && (
                    <>
                      <div className="w-px h-6 bg-slate-200 hidden sm:block shrink-0" />
                      <button
                        onClick={() => {
                          if (selectedItems.size === filteredItems.length)
                            setSelectedItems(new Set());
                          else
                            setSelectedItems(
                              new Set(filteredItems.map((i) => i.id)),
                            );
                        }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors shrink-0"
                      >
                        {selectedItems.size === filteredItems.length ? (
                          <CheckSquare className="w-4 h-4 text-[#fe5c13]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Select All
                      </button>
                    </>
                  )}
                </div>
                <div className="relative w-full xl:w-[320px] group shrink-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#fe5c13] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search menu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#fe5c13]/10 focus:border-[#fe5c13] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className={filteredItems.length === 0 && !loading ? "flex-1 w-full" : "px-4 md:px-8 pt-8 pb-8"}>
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
                      onClick={() => setShowBulkPriceEdit(true)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Prices
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
                      {/* Parent Section Selector */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">
                          Parent category section
                        </label>
                        <CustomSelect
                          value={newSubcategoryParentId || parentCategories[0]?.id || ""}
                          onChange={(val: string) => setNewSubcategoryParentId(val)}
                          options={parentCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                          placeholder="Select Parent Category..."
                        />
                      </div>

                      {/* Add New Sub-Category Button */}
                      <button
                        type="button"
                        onClick={() => setShowAddSubcategoryModal(true)}
                        className="w-full h-12 rounded-xl border-2 border-dashed border-[#fe5c13]/30 bg-[#fe5c13]/5 text-[#fe5c13] font-bold text-xs hover:bg-[#fe5c13]/10 hover:border-[#fe5c13]/50 transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Sub-Category
                      </button>

                      <div className="h-px bg-slate-100 my-2" />

                      {/* Existing Sub-Categories List */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-500 mb-2.5 ml-1">
                          Existing sub-categories
                        </label>
                        <div className="max-h-[260px] overflow-y-auto space-y-2.5 pr-1 py-1 custom-scrollbar">
                        <motion.div className="space-y-2.5">
                          {getSubcategories(
                            newSubcategoryParentId || parentCategories[0]?.id || ""
                          ).map((cat, idx) => (
                            <motion.div
                              key={cat.id}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                layout: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                              }}
                              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-[#fe5c13]/30 hover:shadow-md hover:shadow-slate-100 transition-all group"
                            >
                            <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {editingSubcategoryId === cat.id ? (
                              <div className="flex-1 flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <input
                                    autoFocus
                                    value={editingSubcategoryName}
                                    onChange={(e) => setEditingSubcategoryName(e.target.value)}
                                    className="flex-1 h-9 px-3 text-sm bg-slate-50 border border-[#fe5c13] rounded-xl outline-none focus:ring-4 focus:ring-[#fe5c13]/10 transition-all font-semibold"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") renameSubcategory();
                                      if (e.key === "Escape") cancelRenameSubcategory();
                                    }}
                                  />
                                  <Select
                                    value={editingSubcategoryGstRate}
                                    onChange={(e) => setEditingSubcategoryGstRate(parseFloat(e.target.value))}
                                    className="w-28 h-9 px-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] transition-all cursor-pointer"
                                  >
                                    <option value={0}>0% GST</option>
                                    <option value={5}>5% GST</option>
                                    <option value={12}>12% GST</option>
                                    <option value={18}>18% GST</option>
                                    <option value={28}>28% GST</option>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={renameSubcategory}
                                    disabled={isRenamingSubcategory}
                                    className="px-3 h-8 rounded-lg text-[10px] font-bold bg-[#fe5c13] text-gray-900 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                  >
                                    Apply Changes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelRenameSubcategory}
                                    className="px-3 h-8 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-bold text-slate-700 leading-tight">
                                      {cat.name}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#fe5c13]/10 text-[#fe5c13] border border-[#fe5c13]/25">
                                      {cat.gst_rate ?? 5}% GST
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 capitalize mt-0.5">
                                    Position: {((cat as any).sort_order ?? 0) + 1}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => moveCategory(cat, -1)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#fe5c13] hover:bg-[#fe5c13]/10 flex items-center justify-center transition-colors"
                                    title="Move up"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveCategory(cat, 1)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#fe5c13] hover:bg-[#fe5c13]/10 flex items-center justify-center transition-colors"
                                    title="Move down"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-px h-4 bg-slate-100 mx-1" />
                                  <button
                                    type="button"
                                    onClick={() => startRenameSubcategory(cat)}
                                    className="h-8 px-3 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSubcategory(cat)}
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                                    title="Delete subcategory"
                                    aria-label={`Delete ${cat.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </motion.div>
                          ))}
                        </motion.div>
                        {getSubcategories(
                          newSubcategoryParentId || parentCategories[0]?.id || ""
                        ).length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <Box className="w-6 h-6 text-[#fe5c13]" />
                              </div>
                              <p className="text-[14px] font-bold text-slate-600 mb-1">Empty Category</p>
                              <p className="text-[12px] text-slate-400">Add subcategories to organize your items better.</p>
                            </div>
                          )}
                      </div>
                    </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAddSubcategoryModal && canManageCategories && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
                  onClick={() => setShowAddSubcategoryModal(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-visible flex flex-col"
                  >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#fe5c13]/10 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-[#fe5c13]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Add New Sub-Category
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            Create a new category for your items
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddSubcategoryModal(false)}
                        className="p-2 rounded-xl hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-[13px] font-medium text-slate-500 mb-2 ml-1">
                          Sub-category name
                        </label>
                        <input
                          value={newSubcategoryName}
                          onChange={(e) => setNewSubcategoryName(e.target.value)}
                          placeholder="e.g. Classic Burgers..."
                          className="w-full h-12 px-4 text-sm font-semibold bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 transition-all placeholder:text-slate-300 placeholder:font-medium"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newSubcategoryName.trim() && !isCreatingSubcategory) {
                              createSubcategory(
                                newSubcategoryName,
                                newSubcategoryParentId || parentCategories[0]?.id || "",
                              );
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-slate-500 mb-2 ml-1">
                          GST slab
                        </label>
                        <CustomSelect
                          value={newSubcategoryGstRate}
                          onChange={(val: number) => setNewSubcategoryGstRate(val)}
                          options={[
                            { value: 0, label: "0% GST" },
                            { value: 5, label: "5% GST" },
                            { value: 12, label: "12% GST" },
                            { value: 18, label: "18% GST" },
                            { value: 28, label: "28% GST" },
                          ]}
                          placeholder="GST Rate"
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 mt-auto">
                      <button
                        type="button"
                        onClick={() => setShowAddSubcategoryModal(false)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/50 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          createSubcategory(
                            newSubcategoryName,
                            newSubcategoryParentId || parentCategories[0]?.id || "",
                          )
                        }
                        disabled={isCreatingSubcategory || !newSubcategoryName.trim()}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#fe5c13] text-gray-900 hover:brightness-95 active:scale-95 shadow-lg shadow-[#fe5c13]/20 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                      >
                        {isCreatingSubcategory ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create Sub-Category
                          </>
                        )}
                      </button>
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
                className="flex flex-col items-center justify-center py-32 lg:py-48 bg-white border-y border-slate-100 w-full"
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
                        id: generateUUID(),
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
                        hasSteam: false,
                        steamIntensity: "medium",
                        steamColor: "white",
                        modelScale: 1.00,
                        description: "",
                        calories: null,
                        foodCost: 0,
                        estimatedPrepMinutes: null,
                        isVeg: true,
                        dietaryManualOverride: false,
                        spiceLevel: "none",
                        isBestSeller: false,
                        isNew: true,
                        pairWithItemIds: [],
                        publishAt: "",
                        unpublishAt: "",
                        scheduledPrice: null,
                        scheduledPriceEffectiveAt: "",
                        ingredientsStructured: [],
                        modifierGroups: [],
                        allergens: [],
                        availableDays: [...DAYS],
                        updatedBy: "Staff",
                      });
                      setEditingParentId(defaultParentId);
                      setItemHistory([]);
                      setModalMode("add");
                      setActiveModalTab("general");
                    }}
                    className="mt-8 bg-[#fe5c13] text-gray-900 px-8 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:brightness-95 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Plus className="w-5 h-5" /> Add First Product
                  </button>
                )}
                {!search && (
                  <button
                    onClick={async () => {
                      try {
                        await api("/api/admin/onboarding/sample-data", { method: "POST" });
                        toast.success("Sample menu added. Replace it with your own dishes anytime.");
                        window.location.reload();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Couldn't load the sample menu");
                      }
                    }}
                    className="mt-4 text-sm font-semibold text-slate-500 underline hover:text-slate-700"
                  >
                    Or load a sample menu to try things out
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                    className={`group bg-white rounded-[28px] border transition-all duration-500 flex flex-col relative overflow-hidden ${selectedItems.has(item.id)
                      ? "border-[#fe5c13] ring-8 ring-[#fe5c13]/5 px-[1px] py-[1px]"
                      : "border-slate-100 hover:shadow-2xl hover:shadow-[#fe5c13]/10"
                      }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      <button
                        onClick={() => toggleSelection(item.id)}
                        className="absolute top-3 left-3 z-10 p-1 rounded-md bg-white/90 backdrop-blur shadow-sm transition-transform active:scale-90"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-[#fe5c13]" />
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
                      <div className="absolute top-3 right-3 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <button
                          onClick={() => {
                            setEditingItem({
                              ...item,
                              id: "",
                              name: `${item.name} (Copy)`
                            });
                            const category = categories.find(
                              (c) => c.id === item.categoryId,
                            );
                            const parentId =
                              category?.parent_id || category?.id || "";
                            setEditingParentId(parentId);
                            setItemHistory([]);
                            setModalMode("add");
                          }}
                          className="p-2.5 bg-white shadow-xl rounded-xl text-slate-600 hover:text-emerald-600 border border-slate-50 transition-all active:scale-90"
                          title="Duplicate Product"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            const category = categories.find((c) => c.id === item.categoryId);
                            const parentId = category?.parent_id || category?.id || "";
                            setEditingParentId(parentId);
                            refreshHistory(item.id);
                            setModalMode("edit");
                          }}
                          className="p-2.5 bg-white shadow-xl rounded-xl text-slate-600 hover:text-[#fe5c13] border border-slate-50 transition-all active:scale-90"
                          title="Edit Product"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      {item.modelGlb && (
                        <div className="absolute bottom-3 left-3 bg-[#fe5c13] text-gray-900 p-1.5 rounded-lg shadow-lg">
                          <Box className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-900 truncate pr-2">
                          {item.name}
                        </h3>
                        <span className="text-sm font-bold whitespace-nowrap text-slate-900">
                          ₹{item.price}
                        </span>
                      </div>
                      {(item.isTodaysSpecial || item.isChefSpecial || item.isBestSeller || item.isNew || (item.spiceLevel && item.spiceLevel !== "none")) && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {item.isTodaysSpecial && (
                            <span className="rounded-lg bg-amber-50 border border-amber-200/50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                              Specials
                            </span>
                          )}
                          {item.isChefSpecial && (
                            <span className="rounded-lg bg-indigo-50 border border-indigo-200/50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                              Signature
                            </span>
                          )}
                          {item.isBestSeller && (
                            <span className="rounded-lg bg-[#fe5c13]/10 border border-[#fe5c13]/20 px-2 py-0.5 text-[11px] font-semibold text-gray-800">
                              Bestseller
                            </span>
                          )}
                          {item.isNew && (
                            <span className="rounded-lg bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                              New
                            </span>
                          )}
                          {item.spiceLevel && item.spiceLevel !== "none" && (
                            <span className="rounded-lg bg-rose-50 border border-rose-200/50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" /> {item.spiceLevel}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[12px] font-medium text-slate-400 line-clamp-2 leading-snug mb-4">
                        {item.specialNote || item.description || "Freshly prepared for you."}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-medium text-slate-300">
                            Category
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 truncate max-w-[100px]">
                            {item.categoryName || "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOutOfStock(item, !item.isOutOfStock)}
                            aria-pressed={!item.isOutOfStock}
                            title={item.isOutOfStock ? "Out of stock. Click to mark it available" : "Available. Click to mark it out of stock"}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${item.isOutOfStock
                              ? "border-rose-200/70 bg-rose-50 text-rose-700 hover:border-rose-300 focus-visible:ring-rose-300"
                              : "border-emerald-200/70 bg-emerald-50 text-emerald-700 hover:border-emerald-300 focus-visible:ring-emerald-300"
                              }`}
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.isOutOfStock ? "bg-rose-500" : "bg-emerald-500"}`} aria-hidden />
                            {item.isOutOfStock ? "Out of stock" : "Active"}
                          </button>
                          {item.estimatedPrepMinutes ? (
                            <span className="text-[10px] font-bold text-slate-500">
                              {item.estimatedPrepMinutes} min
                            </span>
                          ) : null}
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
                    </motion.div>
                  ))}
              </div>
            )}
            </div>
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
              className="absolute inset-0 bg-[#0F1117]/50 backdrop-blur-sm"
              onClick={() => setModalMode(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-[28px] shadow-[0_40px_100px_-30px_rgba(15,17,23,0.5)] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-10 pt-8 pb-7 flex items-end justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-display text-[30px] leading-none tracking-[-0.01em] text-[#0F1117] font-normal">
                      {modalMode === "add" ? "Create product" : "Edit product"}
                    </h2>
                    <p className="mt-2 text-[14px] text-[#6B7280]">
                      Configure details, pricing, and assets.
                    </p>
                  </div>
                  {modalMode === "edit" &&
                    editingItem &&
                    (healthItems.find((h) => h.id === editingItem.id)?.order_count ?? 0) > 0 && (
                      <div className="ml-4 px-3 py-1 bg-[#FFF4EC] rounded-full flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-[#D97706]">
                          🔥 {healthItems.find((h) => h.id === editingItem.id)?.order_count} sold
                        </span>
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 rounded-full border border-[#DEE2E6] bg-white px-4 py-2">
                    <span className="text-[13px] font-medium text-[#4B5563]">Veg</span>
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
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${editingItem.isVeg ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${editingItem.isVeg ? "translate-x-0.5" : "translate-x-6"
                          }`}
                      />
                    </button>
                    <span className="text-[13px] font-medium text-[#4B5563]">Non-veg</span>
                  </div>
                  <button
                    onClick={() => setModalMode(null)}
                    className="p-2 -mr-2 rounded-full transition-colors text-[#6B7280] hover:bg-[#E9ECEF] hover:text-[#0F1117]"
                  >
                    <X />
                  </button>
                </div>
              </div>

              <div className="flex gap-7 px-10 border-b border-[#E9ECEF] overflow-x-auto">
                {[
                  { id: "general", label: "General info" },
                  { id: "variants", label: "Variants & price" },
                  { id: "modifiers", label: "Modifiers & combos" },
                  { id: "assets", label: "Media & 3D" },
                  { id: "ingredients", label: "Ingredients" },
                  { id: "nutrition", label: "Nutrition" },
                  { id: "availability", label: "Availability" },
                  { id: "history", label: "Version history" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`-mb-px whitespace-nowrap border-b-2 py-4 text-[14px] transition-colors ${activeModalTab === tab.id
                      ? "border-[#fe5c13] font-semibold text-[#0F1117]"
                      : "border-transparent font-medium text-[#6B7280] hover:text-[#0F1117]"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-10 pb-10 pt-8 bg-white">
                {activeModalTab === "general" && (
                  <div className="grid grid-cols-12 gap-x-12">
                    <div className="col-span-8">
                      {/* Dish */}
                      <section className="pb-9">
                        <label htmlFor="pf-name" className="sr-only">Product name</label>
                        <input
                          id="pf-name"
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="font-display w-full bg-transparent pb-2.5 text-[24px] leading-snug tracking-[-0.01em] text-[#0F1117] placeholder:text-[#9CA3AF] border-b border-[#DEE2E6] focus:border-[#0F1117] outline-none transition-colors"
                          
                          placeholder="Name this dish"
                        />
                        <label htmlFor="pf-desc" className="mt-6 mb-2 block text-[13px] font-medium text-[#4B5563]">
                          Description
                        </label>
                        <textarea
                          id="pf-desc"
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          className="w-full min-h-[112px] resize-y rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] p-4 text-[15px] leading-relaxed text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                          placeholder="What guests taste, the texture, how it arrives at the table"
                        />
                      </section>

                      {/* Pricing & kitchen */}
                      <section className="border-t border-[#E9ECEF] py-9">
                        <h3 className="font-display mb-6 text-[19px] text-[#0F1117]">
                          Pricing and kitchen
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                          <div>
                            <label htmlFor="pf-price" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Base price</label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[#6B7280]">₹</span>
                              <input
                                id="pf-price"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="any"
                                value={editingItem.price || ""}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? 0 : Number(e.target.value);
                                  if (Number.isFinite(value) && value >= 0) setEditingItem({ ...editingItem, price: value });
                                }}
                                placeholder="0"
                                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full h-12 pl-9 pr-4 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 flex items-baseline justify-between">
                              <label htmlFor="pf-cost" className="block text-[13px] font-medium text-[#4B5563]">Food cost</label>
                              {editingItem.price > 0 && editingItem.foodCost > 0 && (() => {
                                const margin = Math.round(((editingItem.price - editingItem.foodCost) / editingItem.price) * 100);
                                return (
                                  <span className={`text-[12px] tabular-nums ${margin < 0 ? "text-[#B42318]" : margin < 60 ? "text-[#B45309]" : "text-[#6B7280]"}`}>
                                    {margin}% margin
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-[#6B7280]">₹</span>
                              <input
                                id="pf-cost"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="any"
                                value={editingItem.foodCost || ""}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? 0 : Number(e.target.value);
                                  if (Number.isFinite(value) && value >= 0) setEditingItem({ ...editingItem, foodCost: value });
                                }}
                                placeholder="0"
                                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full h-12 pl-9 pr-4 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label htmlFor="pf-prep" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Prep time</label>
                            <div className="relative">
                              <input
                                id="pf-prep"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={editingItem.estimatedPrepMinutes ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : Number(e.target.value);
                                  if (value === null || (Number.isInteger(value) && value >= 0)) setEditingItem({ ...editingItem, estimatedPrepMinutes: value });
                                }}
                                placeholder="15"
                                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full h-12 pl-4 pr-14 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                              />
                              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6B7280]">min</span>
                            </div>
                          </div>
                          <div>
                            <label htmlFor="pf-kcal" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Calories</label>
                            <div className="relative">
                              <input
                                id="pf-kcal"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                value={editingItem.calories ?? ""}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : Number(e.target.value);
                                  if (value === null || (Number.isInteger(value) && value >= 0)) setEditingItem({ ...editingItem, calories: value });
                                }}
                                placeholder="320"
                                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full h-12 pl-4 pr-14 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                              />
                              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#6B7280]">kcal</span>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Placement & tax */}
                      <section className="border-t border-[#E9ECEF] py-9">
                        <h3 className="font-display mb-6 text-[19px] text-[#0F1117]">
                          Menu placement and tax
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                          <div>
                            <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">Category</span>
                            <ProductSelect
                              ariaLabel="Category"
                              value={selectedParentId}
                              options={parentCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                              placeholder="Choose a category"
                              onChange={(nextParentId) => {
                                const subs = getSubcategories(nextParentId);
                                const nextCategoryId = subs[0]?.id || nextParentId;
                                setEditingParentId(nextParentId);
                                setEditingItem({ ...editingItem, categoryId: nextCategoryId });
                              }}
                            />
                          </div>
                          <div>
                            <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">Subcategory</span>
                            <ProductSelect
                              ariaLabel="Subcategory"
                              value={editingItem.categoryId || selectedParentId}
                              options={
                                subcategoryOptions.length > 0
                                  ? subcategoryOptions.map((cat) => ({ value: cat.id, label: cat.name }))
                                  : [{ value: selectedParentId, label: parentCategories.find((c) => c.id === selectedParentId)?.name || "General" }]
                              }
                              onChange={(categoryId) => setEditingItem({ ...editingItem, categoryId })}
                            />
                          </div>
                          <div>
                            <label htmlFor="pf-hsn" className="mb-2 block text-[13px] font-medium text-[#4B5563]">HSN code</label>
                            <input
                              id="pf-hsn"
                              type="text"
                              inputMode="numeric"
                              value={editingItem.hsn_code || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, hsn_code: e.target.value.replace(/\D/g, "") })}
                              placeholder="21069099"
                              className="w-full h-12 px-4 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] tabular-nums tracking-wide text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                            />
                          </div>
                          <div>
                            <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">GST rate</span>
                            <ProductSelect
                              ariaLabel="GST rate"
                              value={editingItem.gst_rate === undefined || editingItem.gst_rate === null ? "" : String(editingItem.gst_rate)}
                              options={[
                                { value: "", label: "Category default" },
                                { value: "0", label: "0%" },
                                { value: "5", label: "5%" },
                                { value: "12", label: "12%" },
                                { value: "18", label: "18%" },
                                { value: "28", label: "28%" },
                              ]}
                              onChange={(v) => setEditingItem({ ...editingItem, gst_rate: v === "" ? undefined : parseFloat(v) })}
                            />
                          </div>
                        </div>
                      </section>

                      {/* On the menu */}
                      <section className="border-t border-[#E9ECEF] pt-9">
                        <h3 className="font-display text-[19px] text-[#0F1117]">
                          How it appears on the menu
                        </h3>
                        <p className="mt-1 mb-6 text-[14px] text-[#6B7280]">Badges guests see next to the dish.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <CheckRow
                            label="Today's special"
                            description="Pinned to the top for today"
                            checked={!!editingItem.isTodaysSpecial}
                            onChange={(v) => setEditingItem({ ...editingItem, isTodaysSpecial: v })}
                          />
                          <CheckRow
                            label="Chef's special"
                            description="Marked as a house recommendation"
                            checked={!!editingItem.isChefSpecial}
                            onChange={(v) => setEditingItem({ ...editingItem, isChefSpecial: v })}
                          />
                          <CheckRow
                            label="Best seller"
                            checked={!!editingItem.isBestSeller}
                            onChange={(v) => setEditingItem({ ...editingItem, isBestSeller: v })}
                          />
                          <CheckRow
                            label="New"
                            checked={!!editingItem.isNew}
                            onChange={(v) => setEditingItem({ ...editingItem, isNew: v })}
                          />
                        </div>
                        {(editingItem.isTodaysSpecial || editingItem.isChefSpecial || !!editingItem.specialNote) && (
                          <div className="mt-4">
                            <label htmlFor="pf-note" className="mb-2 block text-[13px] font-medium text-[#4B5563]">Special note</label>
                            <input
                              id="pf-note"
                              value={editingItem.specialNote || ""}
                              onChange={(e) => setEditingItem({ ...editingItem, specialNote: e.target.value })}
                              placeholder="Only 20 plates tonight"
                              className="w-full h-12 px-4 rounded-xl border border-[#DEE2E6] bg-[#F8F9FA] text-[15px] text-[#0F1117] outline-none placeholder:text-[#9CA3AF] hover:border-[#CED4DA] focus:bg-white focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/12 transition-all"
                            />
                          </div>
                        )}
                        <div className="mt-6">
                          <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">Spice level</span>
                          <SegmentedControl<SpiceLevel>
                            ariaLabel="Spice level"
                            value={editingItem.spiceLevel || "none"}
                            onChange={(spiceLevel) => setEditingItem({ ...editingItem, spiceLevel })}
                            options={[
                              { value: "none", label: "None" },
                              { value: "mild", label: "Mild" },
                              { value: "medium", label: "Medium" },
                              { value: "hot", label: "Hot" },
                            ]}
                          />
                        </div>
                        <div className="mt-6">
                          <span className="mb-2 block text-[13px] font-medium text-[#4B5563]">Pairs well with</span>
                          <DishMultiPicker
                            value={editingItem.pairWithItemIds || []}
                            onChange={(pairWithItemIds) => setEditingItem({ ...editingItem, pairWithItemIds })}
                            options={items
                              .filter((item) => item.id !== editingItem.id)
                              .map((item) => ({ value: String(item.id), label: item.name }))}
                          />
                        </div>
                      </section>
                    </div>

                    <aside className="col-span-4">
                      <div className="sticky top-0 rounded-2xl border border-[#E9ECEF] bg-[#F8F9FA] p-6">
                        <h4 className="font-display text-[19px] text-[#0F1117]">
                          Allergens
                        </h4>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                          Tick everything this dish contains. Guests can filter by these.
                        </p>
                        <ul className="mt-5 divide-y divide-[#E9ECEF]">
                          {ALLERGEN_LIST.map((alg) => {
                            const active = editingItem.allergens.some((a) => a.type === alg);
                            return (
                              <li key={alg}>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={active}
                                  onClick={() => {
                                    const next = active
                                      ? editingItem.allergens.filter((a) => a.type !== alg)
                                      : [...editingItem.allergens, { type: alg, confidence: "contains" as const }];
                                    setEditingItem({ ...editingItem, allergens: next });
                                  }}
                                  className="group flex w-full items-center gap-3 rounded-md py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40"
                                >
                                  <span
                                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${active ? "border-[#fe5c13] bg-[#fe5c13]" : "border-[#CED4DA] bg-white group-hover:border-[#6B7280]"}`}
                                  >
                                    {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                  </span>
                                  <span className={`text-[14px] ${active ? "font-medium text-[#0F1117]" : "text-[#4B5563] group-hover:text-[#0F1117]"}`}>
                                    {alg}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="mt-4 border-t border-[#E9ECEF] pt-4 text-[13px] text-[#6B7280]">
                          {editingItem.allergens.length === 0
                            ? "No allergens marked"
                            : `Contains ${editingItem.allergens.map((a) => a.type).join(", ")}`}
                        </p>
                      </div>
                    </aside>
                  </div>
                )}

                {activeModalTab === "assets" && (
                  <div className="space-y-8">
                    {/* Media Uploads Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: 2D Image */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block mb-2 text-[13px] font-medium text-[#4B5563]">
                            Display Image (2D)
                          </label>
                        </div>
                        <input
                          type="file"
                          hidden
                          ref={imageInputRef}
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, "image")}
                        />
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className="group relative w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all hover:bg-slate-100"
                        >
                          {editingItem.imageUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMediaAsset("image");
                                }}
                                className="absolute top-3 right-3 z-20 rounded-lg bg-white/95 border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm"
                              >
                                Remove
                              </button>
                              <div className="absolute inset-0 z-0 bg-slate-100">
                                <img
                                  src={editingItem.imageUrl}
                                  alt="blur-bg"
                                  className="w-full h-full object-cover opacity-40 blur-xl scale-110"
                                />
                              </div>
                              <img
                                src={editingItem.imageUrl}
                                alt="Upload preview"
                                className="relative z-10 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                              />
                            </>
                          ) : (
                            <>
                              <div className="rounded-2xl bg-white p-3 shadow-sm mb-3">
                                <ImageIcon className="w-5 h-5 text-indigo-400" />
                              </div>
                              <span className="text-xs font-bold text-slate-400">
                                Click to upload image
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: 3D Asset */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block mb-2 text-[13px] font-medium text-[#4B5563]">
                            AR Asset (3D)
                          </label>
                          {arLocked && (
                            <span className="text-[10px] font-bold text-amber-700">
                              Needs the AR or Full Access plan
                            </span>
                          )}
                        </div>
                        <input
                          type="file"
                          hidden
                          ref={modelInputRef}
                          accept=".glb,.gltf,.usdz"
                          onChange={(e) => handleFileUpload(e, "model")}
                        />
                        <div
                          className={`relative w-full h-64 rounded-3xl border-2 overflow-hidden transition-all ${
                            editingItem.modelGlb || editingItem.modelUsdz
                              ? "border-slate-200 bg-white"
                              : "border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer flex flex-col items-center justify-center"
                          }`}
                          onClick={() => {
                            if (arLocked) {
                              toast.error("3D / AR models need the AR or Full Access plan.");
                              return;
                            }
                            if (!editingItem.modelGlb && !editingItem.modelUsdz) {
                              modelInputRef.current?.click();
                            }
                          }}
                        >
                          {(editingItem.modelGlb || editingItem.modelUsdz) ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (arLocked) {
                                    toast.error("3D / AR models need the AR or Full Access plan.");
                                    return;
                                  }
                                  modelInputRef.current?.click();
                                }}
                                className="absolute top-3 right-3 z-20 rounded-lg bg-white/95 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMediaAsset("model");
                                }}
                                className="absolute top-3 right-[86px] z-20 rounded-lg bg-white/95 border border-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm"
                              >
                                Remove
                              </button>
                              <a
                                href={normalizeAssetUrl(editingItem.modelGlb || editingItem.modelUsdz || "#")}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute top-3 left-3 z-20 rounded-lg bg-white/95 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                              >
                                Open file
                              </a>

                              {/* Steam rendering temporarily disabled
                              editingItem.hasSteam && (
                                <>
                                  <style dangerouslySetInnerHTML={{__html: `
                                    @keyframes adminSteamRise {
                                      0% { transform: translateY(20px) scale(0.8) rotate(0deg); opacity: 0; filter: blur(8px); }
                                      30% { opacity: ${editingItem.steamIntensity === 'heavy' ? '0.85' : editingItem.steamIntensity === 'gentle' ? '0.4' : '0.65'}; filter: blur(12px); transform: translateY(-30px) scale(1.2) rotate(5deg); }
                                      70% { opacity: ${editingItem.steamIntensity === 'heavy' ? '0.6' : editingItem.steamIntensity === 'gentle' ? '0.2' : '0.4'}; filter: blur(16px); transform: translateY(-70px) scale(1.5) rotate(-5deg); }
                                      100% { transform: translateY(-120px) scale(2.0) rotate(10deg); opacity: 0; filter: blur(20px); }
                                    }
                                    .admin-steam-particle {
                                      position: absolute;
                                      bottom: 0;
                                      border-radius: 50%;
                                      background: radial-gradient(circle, ${editingItem.steamColor === 'warm' ? 'rgba(255,220,160,0.8)' : editingItem.steamColor === 'cool' ? 'rgba(180,220,255,0.8)' : 'rgba(255,255,255,0.8)'} 0%, rgba(255,255,255,0) 60%);
                                      animation: adminSteamRise infinite ease-in;
                                      mix-blend-mode: ${editingItem.steamColor === 'warm' ? 'screen' : 'normal'};
                                    }
                                  `}} />
                                  <div className="absolute inset-x-0 bottom-[10%] h-1/2 pointer-events-none z-10 overflow-visible flex justify-center">
                                    {editingItem.steamIntensity !== "none" && (
                                      <div className="relative w-full max-w-[200px] h-full">
                                        <div className="admin-steam-particle w-16 h-20 left-[10%]" style={{ animationDelay: "0s", animationDuration: "5s" }} />
                                        <div className="admin-steam-particle w-24 h-24 left-[30%]" style={{ animationDelay: "1.2s", animationDuration: "6s" }} />
                                        <div className="admin-steam-particle w-20 h-24 left-[50%]" style={{ animationDelay: "0.5s", animationDuration: "5.5s" }} />
                                        
                                        {(editingItem.steamIntensity === "medium" || editingItem.steamIntensity === "heavy") && (
                                          <>
                                            <div className="admin-steam-particle w-28 h-28 left-[20%]" style={{ animationDelay: "2.1s", animationDuration: "7s" }} />
                                            <div className="admin-steam-particle w-24 h-24 left-[60%]" style={{ animationDelay: "1.8s", animationDuration: "5.2s" }} />
                                          </>
                                        )}
                                        {editingItem.steamIntensity === "heavy" && (
                                          <>
                                            <div className="admin-steam-particle w-32 h-32 left-[40%]" style={{ animationDelay: "0.8s", animationDuration: "6.5s" }} />
                                            <div className="admin-steam-particle w-24 h-28 left-[70%]" style={{ animationDelay: "3.2s", animationDuration: "5.8s" }} />
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )*/}

                              {!modelViewerReady ? (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                  Loading 3D preview...
                                </div>
                              ) : (
                                <model-viewer
                                  ref={attachStaffViewer}
                                  key={editingItem.modelGlb || editingItem.modelUsdz}
                                  src={normalizeAssetUrl(editingItem.modelGlb)}
                                  ios-src={normalizeAssetUrl(editingItem.modelUsdz) || undefined}
                                  alt={editingItem.name || "3D model"}
                                  auto-rotate
                                  ar
                                  ar-modes="webxr scene-viewer quick-look"
                                  ar-scale="fixed"
                                  camera-controls
                                  interaction-prompt="auto"
                                  camera-orbit="0deg 75deg 1.8m"
                                  shadow-intensity="1"
                                  tone-mapping="commerce"
                                  style={{ width: "100%", height: "100%", background: "#eef2ff" }}
                                />
                              )}
                              {modelPreviewError && (
                                <div className="absolute bottom-3 right-3 z-20 max-w-[70%] rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700">
                                  {modelPreviewError}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <Box className="mx-auto text-indigo-200 mb-2 w-8 h-8" />
                              <span className="text-sm font-bold text-indigo-300">
                                Upload GLB/USDZ
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3D Studio Configurations (Only shown if 3D asset exists) */}
                    {(editingItem.modelGlb || editingItem.modelUsdz) && (
                      <div className="pt-6 border-t border-slate-100 space-y-6">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">
                            3D Studio Configurations
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Configs: Steam Control (Temporarily Disabled) */}
                          {/* 
                          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-medium text-slate-800">
                                Steam
                              </h4>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingItem.hasSteam || false}
                                  onChange={(e) => {
                                    setEditingItem({
                                      ...editingItem,
                                      hasSteam: e.target.checked,
                                    });
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                              </label>
                            </div>
                            
                            {editingItem.hasSteam && (
                              <div className="space-y-4 pt-4 border-t border-slate-200">
                                <div>
                                  <label className="text-[13px] font-medium text-slate-500 block mb-2">Intensity</label>
                                  <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
                                    {["none", "gentle", "medium", "heavy"].map((level) => (
                                      <button
                                        key={level}
                                        onClick={() => setEditingItem({ ...editingItem, steamIntensity: level as any })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-colors ${(editingItem.steamIntensity || "medium") === level ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:text-slate-700 border border-transparent"}`}
                                      >
                                        {level}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[13px] font-medium text-slate-500 block mb-2">Color</label>
                                  <div className="flex gap-2">
                                    {[
                                      { id: "white", label: "White", bg: "bg-slate-200" },
                                      { id: "warm", label: "Warm", bg: "bg-orange-200" },
                                      { id: "cool", label: "Cool", bg: "bg-blue-200" }
                                    ].map((c) => (
                                      <button
                                        key={c.id}
                                        onClick={() => setEditingItem({ ...editingItem, steamColor: c.id as any })}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold shadow-sm ${(editingItem.steamColor || "white") === c.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                                      >
                                        <div className={`w-2.5 h-2.5 rounded-full ${c.bg} border border-slate-300`} />
                                        {c.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          */}
                          {/* Real-world AR size */}
                          <div className="md:col-span-2">
                            {editingItem.modelGlb ? (
                              <ArSizeStudio
                                glbUrl={normalizeAssetUrl(editingItem.modelGlb)}
                                ready={modelViewerReady}
                                widthCm={editingItem.width_cm}
                                legacyScale={editingItem.modelScale}
                                variants={editingItem.variants}
                                onChange={applyArSizePatch}
                              />
                            ) : (
                              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                                Upload a GLB file to set the real-world size. Customers on iPhone and Android both use it.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeModalTab === "ingredients" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900">
                          Structured Ingredients
                        </h4>
                        <p className="text-[11px] text-[#fe5c13] font-medium">
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
                        className="bg-[#fe5c13] text-gray-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:brightness-95 transition-all shadow-sm"
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
                            className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl group hover:border-[#fe5c13] transition-all"
                          >
                            <div className="flex-1 grid grid-cols-12 gap-4">
                              <div className="col-span-6 space-y-1">
                                <span className="text-xs font-medium text-slate-500">
                                  Ingredient name
                                </span>
                                <input
                                  className="w-full bg-transparent font-medium text-sm outline-none border-b border-slate-100 focus:border-[#fe5c13] pb-1"
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
                                <span className="text-xs font-medium text-slate-500">
                                  Qty
                                </span>
                                <input
                                  type="number"
                                  className="w-full bg-transparent font-medium text-sm outline-none border-b border-slate-100 focus:border-[#fe5c13] pb-1"
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
                                <span className="text-xs font-medium text-slate-500">
                                  Unit
                                </span>
                                <Select
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
                                  className="w-full bg-transparent font-medium text-sm outline-none border-b border-slate-100 focus:border-[#fe5c13] pb-1"
                                >
                                  <option value="g">Grams (g)</option>
                                  <option value="ml">Milliliters (ml)</option>
                                  <option value="pcs">Pieces (pcs)</option>
                                  <option value="oz">Ounces (oz)</option>
                                </Select>
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
                        className="text-[#fe5c13] font-bold text-xs bg-slate-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all"
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
                              <span className="text-xs font-medium text-slate-500">
                                Size / variant label
                              </span>
                              <input
                                className="w-full bg-transparent border-b border-slate-200 font-medium text-sm outline-none focus:border-[#fe5c13] pb-1"
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
                              <span className="text-xs font-medium text-slate-500">
                                Price (₹)
                              </span>
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-slate-200 font-medium text-sm outline-none focus:border-[#fe5c13] pb-1"
                                value={v.price || ""}
                                onChange={(e) => {
                                  const newList = [...editingItem.variants];
                                  newList[i].price = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  setEditingItem({ ...editingItem, variants: newList });
                                }}
                              />
                            </div>
                            <div className="col-span-4 space-y-1">
                              <span className="text-xs font-medium text-slate-500">
                                Stock (optional)
                              </span>
                              <input
                                type="number"
                                className="w-full bg-transparent border-b border-slate-200 font-medium text-sm outline-none focus:border-[#fe5c13] pb-1"
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
                        className="rounded-xl bg-[#fe5c13] px-4 py-2 text-xs font-bold text-gray-900 hover:brightness-95"
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

                {activeModalTab === "nutrition" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-900">
                          Nutrition &amp; Macros
                        </h4>
                        <p className="text-[11px] text-[#fe5c13] font-medium">
                          Track total kcal and macros. Uncheck custom to auto-calculate from recipe.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_custom_macros"
                          checked={(editingItem as any).is_custom_macros || false}
                          onChange={(e) => setEditingItem({ ...editingItem, is_custom_macros: e.target.checked } as any)}
                        />
                        <label htmlFor="is_custom_macros" className="text-sm font-semibold text-slate-700">Custom Macros Override</label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Kcal</label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!(editingItem as any).is_custom_macros}
                          value={(editingItem as any).kcal || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, kcal: parseFloat(e.target.value) || 0 } as any)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Protein (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!(editingItem as any).is_custom_macros}
                          value={(editingItem as any).protein_g || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, protein_g: parseFloat(e.target.value) || 0 } as any)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Carbs (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!(editingItem as any).is_custom_macros}
                          value={(editingItem as any).carbs_g || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, carbs_g: parseFloat(e.target.value) || 0 } as any)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Fat (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!(editingItem as any).is_custom_macros}
                          value={(editingItem as any).fat_g || 0}
                          onChange={(e) => setEditingItem({ ...editingItem, fat_g: parseFloat(e.target.value) || 0 } as any)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeModalTab === "availability" && (
                  <div className="space-y-8">
                    <div className="bg-slate-50/60 p-8 rounded-3xl border border-slate-200">
                      <div className="mb-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-900 flex items-center gap-2">
                          <Clock3 className="w-4 h-4 text-[#fe5c13]" /> Scheduled Publishing & Pricing
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Automate when this product goes live, unpublishes, or shifts to a promotional price.
                        </p>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-slate-500">
                            Publish at
                          </label>
                          <CustomDateTimePicker
                            value={editingItem.publishAt}
                            onChange={(val) => setEditingItem({ ...editingItem, publishAt: val })}
                            placeholder="Set publish date & time..."
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-slate-500">
                            Unpublish at
                          </label>
                          <CustomDateTimePicker
                            value={editingItem.unpublishAt}
                            onChange={(val) => setEditingItem({ ...editingItem, unpublishAt: val })}
                            placeholder="Set unpublish date & time..."
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-slate-500">
                            Scheduled price (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                              ₹
                            </span>
                            <input
                              type="number"
                              placeholder="e.g. 299"
                              value={editingItem.scheduledPrice ?? ""}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  scheduledPrice: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              className="w-full h-11 pl-8 pr-3.5 text-sm font-semibold bg-white border border-slate-200/90 rounded-2xl outline-none transition-all hover:bg-slate-50/80 hover:border-slate-300 focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-medium text-slate-500">
                            Price effective at
                          </label>
                          <CustomDateTimePicker
                            value={editingItem.scheduledPriceEffectiveAt}
                            onChange={(val) =>
                              setEditingItem({ ...editingItem, scheduledPriceEffectiveAt: val })
                            }
                            placeholder="Set effective date & time..."
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
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
                      <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
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
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-medium transition-all border-2 ${active
                                ? "bg-[#fe5c13] border-[#fe5c13] text-gray-900 shadow-lg"
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

                {activeModalTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                          Saved Versions
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Restore previous price, availability, scheduling, and merchandising states.
                        </p>
                      </div>
                      {!!editingItem.id && (
                        <button
                          type="button"
                          onClick={() => refreshHistory(editingItem.id)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Refresh
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {!editingItem.id ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Save this product once to start tracking versions.
                        </div>
                      ) : loadingHistory ? (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          Loading history...
                        </div>
                      ) : itemHistory.length === 0 ? (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                          No saved versions yet.
                        </div>
                      ) : (
                        itemHistory.map((version) => (
                          <div key={version.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {new Date(version.created_at).toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-500">
                                {version.created_by || "System"} • {version.source.replaceAll("_", " ")}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(version.id)}
                              className="rounded-xl border border-[#fe5c13] bg-slate-50 px-3 py-2 text-xs font-bold text-gray-900 hover:bg-indigo-100"
                            >
                              Restore
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-10 py-5 border-t border-[#E9ECEF] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      setEditingItem({
                        ...editingItem,
                        isArchived: !editingItem.isArchived,
                      })
                    }
                    className="text-[13px] font-medium text-[#6B7280] hover:text-[#0F1117] flex items-center gap-2 transition-colors"
                  >
                    {editingItem.isArchived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {editingItem.isArchived ? "Restore to menu" : "Archive product"}
                  </button>
                  {!!editingItem.id && (
                    <button
                      onClick={handleDeleteItem}
                      className="text-[13px] font-medium text-rose-600 hover:text-rose-700 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete product
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalMode(null)}
                    className="px-5 py-2.5 text-[14px] font-medium text-[#4B5563] hover:text-[#0F1117] rounded-xl transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-11 px-8 bg-[#0F1117] text-white text-[14px] font-medium rounded-xl hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
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
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-500">
                    Source branch
                  </label>
                  <Select
                    value={syncSourceBranchId}
                    onChange={(e) => {
                      const nextSource = e.target.value;
                      setSyncSourceBranchId(nextSource);
                      setSyncTargetBranchIds((prev) => prev.filter((id) => id !== nextSource));
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/15"
                  >
                    <option value="">Select source branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.restaurant_id} value={branch.restaurant_id}>
                        {branch.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-500">
                    Target branches
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
                          className="h-4 w-4 rounded border-slate-300 text-[#fe5c13] focus:ring-yellow-500"
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
                  className="h-9 rounded-lg bg-[#fe5c13] px-4 text-xs font-bold text-gray-900 disabled:opacity-50"
                >
                  {isSyncingMenu ? "Syncing..." : "Confirm Sync"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkPriceEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Bulk Edit Prices ({selectedItems.size} items)</h2>
                <button
                  onClick={() => setShowBulkPriceEdit(false)}
                  className="p-2 -mr-2 rounded-full transition-colors text-[#6B7280] hover:bg-[#E9ECEF] hover:text-[#0F1117]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Action</label>
                  <div className="flex gap-2">
                    {["increase", "decrease", "set"].map((op) => (
                      <button
                        key={op}
                        onClick={() => setBulkPriceOp(op as any)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          bulkPriceOp === op
                            ? "border-[#fe5c13] bg-orange-50 text-[#fe5c13]"
                            : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                        }`}
                      >
                        {op.charAt(0).toUpperCase() + op.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {bulkPriceOp !== "set" && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Value type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBulkPriceType("percentage")}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                          bulkPriceType === "percentage"
                            ? "border-[#fe5c13] bg-orange-50 text-[#fe5c13]"
                            : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        onClick={() => setBulkPriceType("fixed")}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                          bulkPriceType === "fixed"
                            ? "border-[#fe5c13] bg-orange-50 text-[#fe5c13]"
                            : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                        }`}
                      >
                        Fixed Amount (₹)
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">
                    {bulkPriceOp === "set" ? "New Price (₹)" : bulkPriceType === "percentage" ? "Percentage (%)" : "Amount (₹)"}
                  </label>
                  <input
                    type="number"
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                    placeholder="Enter value"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#fe5c13] focus:ring-4 focus:ring-[#fe5c13]/10 text-slate-900 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setShowBulkPriceEdit(false)}
                  className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPriceEdit}
                  disabled={!bulkPriceValue || isBulkPriceEditing}
                  className="flex-1 py-3 bg-[#fe5c13] hover:bg-[#e04f0f] text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {isBulkPriceEditing ? "Updating..." : "Apply Changes"}
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
