"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { motion, AnimatePresence } from "framer-motion";
import { PackageOpen, PackageCheck, Truck, FileText, Plus, Search, Store, Edit2, Trash2, X, AlertTriangle, ClipboardList, Trash, TrendingUp, ChefHat, Loader2 } from 'lucide-react';
import StaffSidebar from '@/app/components/StaffSidebar';
import { toast } from 'react-hot-toast';
import StockAlertsBanner from '@/app/components/inventory/StockAlertsBanner';
import StockTakePanel from '@/app/components/inventory/StockTakePanel';
import PriceHistoryPanel from '@/app/components/inventory/PriceHistoryPanel';
import TransfersPanel from '@/app/components/inventory/TransfersPanel';
import { CustomSelect } from '@/app/components/ui/CustomSelect';
import { CustomDateTimePicker } from '@/app/components/ui/CustomDateTimePicker';

import { Select } from "@/app/components/ui/Select";
import {
  INPUT, LABEL, BTN_PRIMARY, BTN_SECONDARY, BTN_SMALL, ICON_BTN, ICON_BTN_DANGER, OVERLAY, DIALOG, CARD,
  THEAD_ROW, TH, TBODY, TR, TD, CUSTOM_SELECT_BTN, Pill, CountChip, SectionHeader, EmptyState, plural, fmtDay, type Tone,
} from '@/app/components/inventory/ui';

type Vendor = {
  id: string;
  name: string;
  lead_time_days: number;
  is_active: boolean;
};

type PurchaseOrderLine = {
  id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  received_quantity: number;
  unit: string;
  status: string;
  expected_expires_at?: string | null;
  expected_cost_per_unit?: number;
};

type PurchaseOrder = {
  id: string;
  vendor_id?: string;
  vendor_name?: string;
  status: string;
  expected_at?: string;
  notes?: string;
  created_at: string;
  items?: PurchaseOrderLine[];
};

type ReceiveRow = {
  item_id: string;
  name: string;
  unit: string;
  ordered: number;
  received: number;
  quantity: string;
  cost: string;
  expiry: string;
  close: boolean;
};

const poRemaining = (l: PurchaseOrderLine) =>
  Math.max(0, Number(l.quantity || 0) - Number(l.received_quantity || 0));

const poIsPartlyReceived = (po: PurchaseOrder) =>
  po.status !== 'received' &&
  po.status !== 'cancelled' &&
  (po.items || []).some((l) => Number(l.received_quantity || 0) > 0);

const WASTE_REASON_LABELS: Record<string, string> = {
  "Spoiled / Expired": "Spoiled or expired",
  "Dropped / Spilled": "Dropped or spilled",
  "Staff Meal": "Staff meal",
  "Theft / Missing": "Theft or missing",
};

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InventoryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vendors' | 'pos' | 'recipes' | 'kitchen' | 'stock' | 'stock-take' | 'waste' | 'prices'>('stock');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);

  // New Vendor Form
  const [vendorName, setVendorName] = useState('');
  const [leadTime, setLeadTime] = useState('3');

  // Edit Vendor Form
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editName, setEditName] = useState('');
  const [editLeadTime, setEditLeadTime] = useState('3');
  const [editActive, setEditActive] = useState(true);

  // PO State
  const [showAddPO, setShowAddPO] = useState(false);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [poIngredient, setPoIngredient] = useState('');
  const [poQuantity, setPoQuantity] = useState('');
  const [poUnit, setPoUnit] = useState('kg');
  const [poExpiry, setPoExpiry] = useState('');
  const [poCost, setPoCost] = useState('');
  const [poItems, setPoItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string, expected_expires_at?: string, expected_cost_per_unit?: number}[]>([]);

  // Recipe State
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [recipeParent, setRecipeParent] = useState('');
  const [recipeIngredient, setRecipeIngredient] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');
  const [recipeUnit, setRecipeUnit] = useState('g');
  const [recipeItems, setRecipeItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string}[]>([]);
  const [recipesList, setRecipesList] = useState<{id: string, name: string, item_count: number}[]>([]);

  // Searchable select lists
  const [ingredients, setIngredients] = useState<{id: string, name: string}[]>([]);
  const [menuItems, setMenuItems] = useState<{id: string, name: string}[]>([]);

  // Advanced Inventory States
  const [overviewStocks, setOverviewStocks] = useState<any[]>([]);
  const [purchaseSuggestions, setPurchaseSuggestions] = useState<any[]>([]);
  const [wastageEvents, setWastageEvents] = useState<any[]>([]);
  
  // Stock Take Form
  const [myRole, setMyRole] = useState('');
  const [alertsKey, setAlertsKey] = useState(0);
  
  // Wastage Form
  const [showLogWaste, setShowLogWaste] = useState(false);
  const [wasteIngredient, setWasteIngredient] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteUnit, setWasteUnit] = useState('kg');
  const [wasteReason, setWasteReason] = useState('');
  
  // Edit Par Level Modal
  const [editingParLevel, setEditingParLevel] = useState<any | null>(null);
  const [parLevelValue, setParLevelValue] = useState('');


  // Stock Batches state
  type Batch = {
    id: string;
    ingredient_id: string;
    ingredient_name: string;
    quantity: number;
    cost_per_unit: number;
    received_at: string;
    expires_at?: string;
    supplier_name: string;
    vendor_id?: string;
  };
  const [batches, setBatches] = useState<Batch[]>([]);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [deleteConfirmBatchId, setDeleteConfirmBatchId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchQuery, setBatchQuery] = useState('');
  const [deletingBatchIds, setDeletingBatchIds] = useState<Set<string>>(new Set());

  const handleEditBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      await api('/api/admin/inventory/advanced/batches?id=' + editingBatch.id, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: Number(editingBatch.quantity),
          expires_at: editingBatch.expires_at || undefined,
          cost_per_unit: Number(editingBatch.cost_per_unit),
          received_at: editingBatch.received_at,
          vendor_id: editingBatch.vendor_id || undefined
        })
      });
      toast.success("Batch updated");
      setShowEditBatchModal(false);
      fetchBatches();
      // fetchOverview();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update batch");
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await api<{ vendors: Vendor[] }>('/api/admin/inventory/advanced/vendors');
      setVendors(res.vendors || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api<{ purchase_orders: PurchaseOrder[] }>(
        '/api/admin/inventory/advanced/purchase-orders'
      );
      setPoList(res.purchase_orders || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchIngredientsAndMenuItems = async () => {
    try {
      const [overviewRes, menuRes] = await Promise.all([
        api<{ stocks?: any[] }>('/api/admin/inventory/advanced/overview'),
        api<any[]>('/api/admin/menu')
      ]);

      const ings = (overviewRes?.stocks || []).map((s: any) => ({
        id: s.ingredient_id,
        name: s.ingredient
      }));
      setIngredients(ings);

      const items = (menuRes || []).map((m: any) => ({
        id: m.id,
        name: m.name
      }));
      setMenuItems(items);
    } catch (e) {
      console.error("Failed to load select lists:", e);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api<{ batches: Batch[] }>('/api/admin/inventory/advanced/batches');
      setBatches(res.batches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancedData = async () => {
    try {
      const [overviewRes, suggRes, wasteRes] = await Promise.all([
        api<{ stocks: any[] }>('/api/admin/inventory/advanced/overview'),
        api<{ suggestions: any[] }>('/api/admin/inventory/advanced/purchase-suggestions'),
        api<{ events: any[] }>('/api/admin/inventory/advanced/wastage')
      ]);
      if (overviewRes?.stocks) setOverviewStocks(overviewRes.stocks);
      api<{ role?: string }>('/api/admin/me').then((m) => setMyRole((m?.role || '').toLowerCase())).catch(() => {});
      if (suggRes?.suggestions) setPurchaseSuggestions(suggRes.suggestions);
      if (wasteRes?.events) setWastageEvents(wasteRes.events);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateParLevel = async () => {
    if (!editingParLevel) return;
    try {
      await api(`/api/admin/inventory/advanced/ingredients/${editingParLevel.ingredient_id}/stock`, {
        method: 'POST',
        body: JSON.stringify({
          stock: Number(editingParLevel.stock || 0),
          reorder_threshold: Number(parLevelValue),
          reason: 'Par level update'
        })
      });
      toast.success("Par level updated");
      setEditingParLevel(null);
      fetchAdvancedData();
    } catch(e) {
      toast.error("Failed to update par level");
    }
  };

  const handleLogWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/admin/inventory/advanced/wastage', {
        method: 'POST',
        body: JSON.stringify({
          ingredient_id: wasteIngredient,
          quantity: Number(wasteQuantity),
          unit: wasteUnit,
          reason: wasteReason,
          shift_label: 'Morning'
        })
      });
      toast.success("Wastage logged");
      setShowLogWaste(false);
      setWasteIngredient('');
      setWasteQuantity('');
      setWasteReason('');
      fetchAdvancedData();
      fetchBatches();
    } catch(e) {
      toast.error("Failed to log wastage");
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await api<{ recipes: any[] }>('/api/admin/inventory/advanced/recipes');
      if (res.recipes) setRecipesList(res.recipes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const checkRoleAndLoad = async () => {
      try {
        const me = await api<{ role?: string }>("/api/admin/me");
        const r = String(me?.role || "").toLowerCase();
        if (!["owner", "admin", "manager"].includes(r)) {
          router.replace("/staff");
          return;
        }
      } catch {
        router.replace("/staff");
        return;
      }
      fetchIngredientsAndMenuItems();
      fetchBatches();
      fetchRecipes();
      fetchVendors();
      fetchPurchaseOrders();
      fetchAdvancedData();
    };
    checkRoleAndLoad();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchVendors();
    } else if (activeTab === 'stock') {
      fetchBatches();
    }
  }, [activeTab]);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/admin/inventory/advanced/vendors', {
        method: 'POST',
        body: JSON.stringify({
          name: vendorName,
          lead_time_days: parseInt(leadTime),
          is_active: true
        })
      });
      setShowAddVendor(false);
      setVendorName('');
      fetchVendors();
      toast.success("Supplier added successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to add supplier");
    }
  };

  const handleStartEdit = (v: Vendor) => {
    setEditingVendor(v);
    setEditName(v.name);
    setEditLeadTime(v.lead_time_days.toString());
    setEditActive(v.is_active);
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    try {
      await api(`/api/admin/inventory/advanced/vendors/${editingVendor.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          lead_time_days: parseInt(editLeadTime),
          is_active: editActive
        })
      });
      setEditingVendor(null);
      fetchVendors();
      toast.success("Supplier updated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to update supplier");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await api(`/api/admin/inventory/advanced/vendors/${id}`, {
        method: 'DELETE'
      });
      fetchVendors();
      toast.success("Supplier deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete supplier");
    }
  };

  const handleAddPOItem = () => {
    if (!poIngredient || !poQuantity) return;
    const ing = ingredients.find(i => i.id === poIngredient);
    if (!ing) return;
    setPoItems([...poItems, {
      ingredient_id: ing.id,
      name: ing.name,
      quantity: Number(poQuantity),
      unit: poUnit,
      expected_expires_at: poExpiry ? new Date(poExpiry).toISOString() : undefined,
      expected_cost_per_unit: poCost ? Number(poCost) : undefined
    }]);
    setPoIngredient('');
    setPoQuantity('');
    setPoExpiry('');
    setPoCost('');
  };
  const openReceivePO = (po: PurchaseOrder) => {
    const open = (po.items || []).filter((l) => l.status === 'pending');
    setReceiveRows(
      open.map((l) => ({
        item_id: l.id,
        name: l.ingredient_name || 'Ingredient',
        unit: l.unit,
        ordered: Number(l.quantity || 0),
        received: Number(l.received_quantity || 0),
        quantity: String(poRemaining(l)),
        cost: l.expected_cost_per_unit ? String(l.expected_cost_per_unit) : '',
        expiry: l.expected_expires_at ? String(l.expected_expires_at).slice(0, 10) : '',
        close: false,
      }))
    );
    setReceivingPO(po);
  };

  const updateReceiveRow = (itemId: string, patch: Partial<ReceiveRow>) =>
    setReceiveRows((rows) => rows.map((r) => (r.item_id === itemId ? { ...r, ...patch } : r)));

  const handleReceivePO = async () => {
    if (!receivingPO || isReceiving) return;
    const lines = receiveRows.filter((r) => Number(r.quantity) > 0 || r.close);
    // A PO loaded without its lines (older server) is received in full.
    if (receiveRows.length > 0 && lines.length === 0) {
      toast.error("Enter the quantity that arrived for at least one item");
      return;
    }
    if (lines.some((r) => Number(r.quantity) < 0 || Number(r.cost) < 0)) {
      toast.error("Quantity and cost can't be negative");
      return;
    }
    setIsReceiving(true);
    try {
      const res = await api<{ fully_received?: boolean }>(
        `/api/admin/inventory/advanced/purchase-orders/${receivingPO.id}/receive`,
        {
          method: 'POST',
          body: JSON.stringify({
            items: lines.map((r) => ({
              item_id: r.item_id,
              quantity: Number(r.quantity) || 0,
              ...(r.cost !== '' ? { cost_per_unit: Number(r.cost) } : {}),
              ...(r.expiry ? { expires_at: new Date(r.expiry).toISOString() } : {}),
              close: r.close,
            })),
          }),
        }
      );
      toast.success(
        res?.fully_received === false
          ? "Stock received. The rest of this order is still open."
          : "Stock received. Purchase order complete."
      );
      setReceivingPO(null);
      fetchPurchaseOrders();
      fetchIngredientsAndMenuItems();
      fetchBatches();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to receive PO");
      fetchPurchaseOrders();
    } finally {
      setIsReceiving(false);
    }
  };

  const handleCreatePO = async () => {
    if (!selectedVendor || poItems.length === 0) return;
    try {
      const res = await api<{id: string}>('/api/admin/inventory/advanced/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: selectedVendor,
          status: 'placed',
          items: poItems.map(i => ({
            ingredient_id: i.ingredient_id,
            quantity: i.quantity,
            unit: i.unit,
            status: 'pending',
            expected_expires_at: i.expected_expires_at,
            expected_cost_per_unit: i.expected_cost_per_unit ?? 0
          }))
        })
      });
      setShowAddPO(false);
      setPoList([{
        id: res.id,
        vendor_id: selectedVendor,
        status: 'placed',
        created_at: new Date().toISOString()
      }, ...poList]);
      setPoItems([]);
      fetchPurchaseOrders();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create purchase order");
    }
  };

  const handleAddRecipeItem = () => {
    if (!recipeIngredient || !recipeQuantity) return;
    const ing = ingredients.find(i => i.id === recipeIngredient);
    setRecipeItems([...recipeItems, {
      ingredient_id: recipeIngredient,
      name: ing ? ing.name : `Raw ${recipeIngredient.slice(0,4)}`,
      quantity: parseFloat(recipeQuantity),
      unit: recipeUnit
    }]);
    setRecipeIngredient('');
    setRecipeQuantity('');
  };

  const handleCreateRecipe = async () => {
    if (!recipeParent || recipeItems.length === 0) return;
    try {
      await api('/api/admin/inventory/advanced/recipes', {
        method: 'POST',
        body: JSON.stringify(
          recipeItems.map(i => ({
            intermediate_ingredient_id: recipeParent,
            raw_ingredient_id: i.ingredient_id,
            quantity: i.quantity,
            unit: i.unit
          }))
        )
      });
      setShowAddRecipe(false);
      const parentItem = menuItems.find(m => m.id === recipeParent) || ingredients.find(m => m.id === recipeParent);
      toast.success(`Created recipe for ${parentItem?.name || 'Item'}`);
      // Refresh conversions
      // fetchConversions();
      fetchRecipes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create recipe");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await api(`/api/admin/inventory/advanced/recipes/${id}`, {
        method: 'DELETE'
      });
      fetchRecipes();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete recipe");
    }
  };

  const handleEditRecipe = async (recipeId: string) => {
    try {
      const res = await api<{ items: any[] }>(`/api/admin/inventory/advanced/recipes/${recipeId}`);
      if (res.items) {
        setRecipeParent(recipeId);
        setRecipeItems(res.items.map(i => {
          const ing = ingredients.find(ing => ing.id === i.raw_ingredient_id);
          return {
            ingredient_id: i.raw_ingredient_id,
            name: ing ? ing.name : 'Unknown Ingredient',
            quantity: Number(i.quantity),
            unit: i.unit
          };
        }));
        setShowAddRecipe(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load recipe details");
    }
  };

  const now = Date.now();
  const SOON_MS = 3 * 24 * 60 * 60 * 1000;
  const expiryState = (b: Batch): 'expired' | 'soon' | 'ok' | 'none' => {
    if (!b.expires_at) return 'none';
    const t = new Date(b.expires_at).getTime();
    if (t < now) return 'expired';
    if (t - now < SOON_MS) return 'soon';
    return 'ok';
  };
  const q = batchQuery.trim().toLowerCase();
  const visibleBatches = q
    ? batches.filter(
        (b) =>
          (b.ingredient_name || '').toLowerCase().includes(q) ||
          (b.supplier_name || '').toLowerCase().includes(q)
      )
    : batches;
  const stockValue = batches.reduce((s, b) => s + Number(b.quantity || 0) * Number(b.cost_per_unit || 0), 0);
  const expiredCount = batches.filter((b) => expiryState(b) === 'expired').length;
  const soonCount = batches.filter((b) => expiryState(b) === 'soon').length;

  const poStatus = (po: PurchaseOrder): { tone: Tone; label: string } => {
    if (po.status === 'received') return { tone: 'emerald', label: 'Received' };
    if (po.status === 'cancelled') return { tone: 'neutral', label: 'Cancelled' };
    if (poIsPartlyReceived(po)) return { tone: 'sky', label: 'Partly received' };
    if (po.status === 'placed') return { tone: 'amber', label: 'Awaiting delivery' };
    const s = String(po.status || '');
    return { tone: 'amber', label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Open' };
  };

  const TABS: [typeof activeTab, string, React.ElementType][] = [
    ['stock', 'Stock batches', PackageOpen],
    ['pos', 'Purchase orders', FileText],
    ['vendors', 'Suppliers', Truck],
    ['prices', 'Price history', TrendingUp],
    ['recipes', 'Conversions & recipes', ChefHat],
    ['stock-take', 'Stock take', ClipboardList],
    ['waste', 'Wastage', Trash],
    ['kitchen', 'Central kitchen', Store],
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF7] text-[#0F1117]">
      <StaffSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[#E8E8E3] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 pt-5">
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[#0F1117]">Inventory hub</h1>
              {purchaseSuggestions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('stock')}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-amber-800 ring-1 ring-inset ring-amber-200/70 transition-colors hover:bg-amber-100"
                >
                  {purchaseSuggestions.length} running low
                </button>
              ) : (
                ingredients.length > 0 && <CountChip>{plural(ingredients.length, 'ingredient')}</CountChip>
              )}
            </div>
          </div>

          <nav className="mt-3 flex items-center gap-1 overflow-x-auto px-6" aria-label="Inventory sections">
            {TABS.map(([id, label, Icon]) => {
              const on = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  aria-current={on ? 'page' : undefined}
                  className={`-mb-px flex h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[13px] transition-colors ${
                    on
                      ? 'border-[#fe5c13] font-semibold text-[#0F1117]'
                      : 'border-transparent font-medium text-[#6B7280] hover:text-[#0F1117]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-[#fe5c13]' : 'text-[#9CA3AF]'}`} />
                  {label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto">
          {activeTab === 'stock' && (
            <div className="px-8 py-6">
              <SectionHeader
                title="Stock batches"
                count={loading ? undefined : plural(batches.length, 'batch', 'batches')}
                description="Every delivery you've received, what it cost and when it expires."
              >
                <div className="relative w-60">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={batchQuery}
                    onChange={(e) => setBatchQuery(e.target.value)}
                    placeholder="Search ingredient or supplier"
                    aria-label="Search batches"
                    className={`${INPUT} pl-9 text-[13px]`}
                  />
                </div>
                <button
                  onClick={() => { setSelectedVendor(''); setPoItems([]); setShowAddPO(true); }}
                  className={BTN_PRIMARY}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> New purchase order
                </button>
              </SectionHeader>

              <StockAlertsBanner refreshKey={alertsKey} />

              <dl className="mb-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white md:grid-cols-4">
                {[
                  { label: 'Batches in stock', value: String(batches.length), tone: 'text-[#0F1117]' },
                  { label: 'Stock value', value: fmtINR(stockValue), tone: 'text-[#0F1117]' },
                  { label: 'Expiring in 3 days', value: String(soonCount), tone: soonCount ? 'text-amber-700' : 'text-[#9CA3AF]' },
                  { label: 'Expired', value: String(expiredCount), tone: expiredCount ? 'text-rose-600' : 'text-[#9CA3AF]' },
                ].map((k, i) => (
                  <div key={k.label} className={`px-6 py-4 ${i > 0 ? 'border-l border-[#F0F0EB]' : ''} ${i > 1 ? 'border-t border-[#F0F0EB] md:border-t-0' : ''}`}>
                    <dt className="text-[12px] font-medium text-[#6B7280]">{k.label}</dt>
                    <dd className={`mt-1 text-[20px] font-bold tabular-nums tracking-[-0.02em] ${k.tone}`}>{k.value}</dd>
                  </div>
                ))}
              </dl>

              {purchaseSuggestions.length > 0 && (
                <section className={`${CARD} mb-5`}>
                  <div className="flex items-center gap-2 border-b border-[#F0F0EB] px-5 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h3 className="text-[14px] font-semibold text-[#0F1117]">Reorder suggestions</h3>
                    <CountChip>{purchaseSuggestions.length}</CountChip>
                  </div>
                  <ul className="grid gap-x-6 px-0 md:grid-cols-2 lg:grid-cols-3">
                    {purchaseSuggestions.map((s, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#0F1117]">{s.ingredient}</p>
                          <p className="mt-0.5 text-[12px] tabular-nums text-[#6B7280]">
                            <span className="font-semibold text-rose-600">{s.current_stock}</span> in stock, reorder at {s.reorder_threshold}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVendor('');
                            setPoIngredient(s.ingredient_id);
                            setPoQuantity(s.suggested_order_qty);
                            setShowAddPO(true);
                          }}
                          className={BTN_SMALL}
                        >
                          Order {s.suggested_order_qty}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={CARD}>
                {loading ? (
                  <div className="flex h-56 items-center justify-center gap-2 text-[14px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading stock batches
                  </div>
                ) : batches.length === 0 ? (
                  <EmptyState
                    icon={<PackageOpen className="h-6 w-6" />}
                    title="No stock batches yet"
                    body="Batches appear here when you receive a purchase order or adjust stock."
                  >
                    <button onClick={() => setActiveTab('pos')} className={BTN_SECONDARY}>
                      Go to purchase orders
                    </button>
                  </EmptyState>
                ) : visibleBatches.length === 0 ? (
                  <EmptyState
                    icon={<Search className="h-6 w-6" />}
                    title="No batches match your search"
                    body="Try an ingredient or supplier name."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH}>Ingredient</th>
                          <th className={TH}>Supplier</th>
                          <th className={`${TH} text-right`}>Quantity</th>
                          <th className={`${TH} text-right`}>Unit cost</th>
                          <th className={`${TH} text-right`}>Value</th>
                          <th className={TH}>Received</th>
                          <th className={TH}>Expiry</th>
                          <th className={TH}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className={TBODY}>
                        {visibleBatches.map((b) => {
                          const st = expiryState(b);
                          return (
                            <tr
                              key={b.id}
                              className={`${TR} duration-500 ease-in-out ${deletingBatchIds.has(b.id) ? 'opacity-0 bg-rose-50' : 'opacity-100'}`}
                            >
                              <td className={`${TD} font-semibold text-[#0F1117]`}>{b.ingredient_name}</td>
                              <td className={TD}>{b.supplier_name || <span className="text-[#9CA3AF]">No supplier</span>}</td>
                              <td className={`${TD} text-right font-semibold tabular-nums text-[#0F1117]`}>{b.quantity}</td>
                              <td className={`${TD} text-right tabular-nums`}>{fmtINR(b.cost_per_unit)}</td>
                              <td className={`${TD} text-right font-semibold tabular-nums text-[#0F1117]`}>{fmtINR(b.quantity * b.cost_per_unit)}</td>
                              <td className={`${TD} tabular-nums`}>{fmtDay(b.received_at)}</td>
                              <td className={TD}>
                                {st === 'none' ? (
                                  <span className="text-[#9CA3AF]">No expiry</span>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`tabular-nums ${st === 'expired' ? 'text-[#9CA3AF] line-through decoration-[#C4C4BE]' : 'text-[#0F1117]'}`}>
                                      {fmtDay(b.expires_at!)}
                                    </span>
                                    {st === 'expired' && <Pill tone="rose">Expired</Pill>}
                                    {st === 'soon' && <Pill tone="amber">Expires soon</Pill>}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-0.5">
                                  <button
                                    onClick={() => { setEditingBatch(b); setShowEditBatchModal(true); }}
                                    className={ICON_BTN}
                                    aria-label={`Edit ${b.ingredient_name} batch`}
                                    title="Edit batch"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmBatchId(b.id)}
                                    className={ICON_BTN_DANGER}
                                    aria-label={`Delete ${b.ingredient_name} batch`}
                                    title="Delete batch"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="px-8 py-6">
              <SectionHeader
                title="Suppliers"
                count={loading ? undefined : plural(vendors.length, 'supplier')}
                description="The vendors you buy from and how long they take to deliver."
              >
                <button onClick={() => setShowAddVendor(true)} className={BTN_PRIMARY}>
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> Add supplier
                </button>
              </SectionHeader>

              <section className={CARD}>
                {loading ? (
                  <div className="flex h-56 items-center justify-center gap-2 text-[14px] text-[#6B7280]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading suppliers
                  </div>
                ) : vendors.length === 0 ? (
                  <EmptyState
                    icon={<Truck className="h-6 w-6" />}
                    title="No suppliers yet"
                    body="Add the vendors you buy from so you can raise purchase orders against them."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse text-left">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH}>Supplier</th>
                          <th className={TH}>Status</th>
                          <th className={TH}>Lead time</th>
                          <th className={TH}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className={TBODY}>
                        {vendors.map((v) => (
                          <tr key={v.id} className={TR}>
                            <td className={TD}>
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F3EF] text-[#6B7280]">
                                  <Truck className="h-4 w-4" />
                                </span>
                                <span className="text-[14px] font-semibold text-[#0F1117]">{v.name}</span>
                              </div>
                            </td>
                            <td className={TD}>
                              <Pill tone={v.is_active ? 'emerald' : 'neutral'}>{v.is_active ? 'Active' : 'Inactive'}</Pill>
                            </td>
                            <td className={`${TD} tabular-nums text-[#0F1117]`}>{plural(v.lead_time_days, 'day')}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-0.5">
                                <button onClick={() => handleStartEdit(v)} className={ICON_BTN} aria-label={`Edit ${v.name}`} title="Edit supplier">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteVendor(v.id)} className={ICON_BTN_DANGER} aria-label={`Delete ${v.name}`} title="Delete supplier">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="px-8 py-6">
              <SectionHeader
                title="Purchase orders"
                count={plural(poList.length, 'order')}
                description="Order stock from a supplier, then receive it here when it arrives."
              >
                <button onClick={() => setShowAddPO(true)} className={BTN_PRIMARY}>
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> New purchase order
                </button>
              </SectionHeader>

              <section className={CARD}>
                {poList.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-6 w-6" />}
                    title="No purchase orders yet"
                    body="Create one to start tracking stock that's on its way."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse text-left">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH}>Order</th>
                          <th className={TH}>Supplier</th>
                          <th className={TH}>Status</th>
                          <th className={TH}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className={TBODY}>
                        {poList.map((po) => {
                          const st = poStatus(po);
                          const open = po.status !== 'received' && po.status !== 'cancelled';
                          return (
                            <tr key={po.id} className={TR}>
                              <td className={TD}>
                                <p className="text-[14px] font-semibold tabular-nums text-[#0F1117]">PO #{po.id.slice(0, 8).toUpperCase()}</p>
                                <p className="mt-0.5 text-[12px] tabular-nums text-[#9CA3AF]">{fmtDay(po.created_at)}</p>
                              </td>
                              <td className={TD}>
                                <p className="font-medium text-[#0F1117]">
                                  {po.vendor_name || vendors.find((v) => v.id === po.vendor_id)?.name || '—'}
                                </p>
                                {(po.items?.length ?? 0) > 0 && (
                                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{plural(po.items!.length, 'item')}</p>
                                )}
                              </td>
                              <td className={TD}>
                                <Pill tone={st.tone}>{st.label}</Pill>
                              </td>
                              <td className="px-5 py-2 text-right">
                                {open && (
                                  <button onClick={() => openReceivePO(po)} className={BTN_SMALL}>
                                    <PackageCheck className="h-3.5 w-3.5" /> Receive stock
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="px-8 py-6">
              <SectionHeader
                title="Conversions & recipes"
                count={plural(recipesList.length, 'recipe')}
                description="Link a dish or prep item to the raw ingredients it uses, so stock is deducted automatically."
              >
                <button
                  onClick={() => {
                    setRecipeParent('');
                    setRecipeItems([]);
                    setShowAddRecipe(true);
                  }}
                  className={BTN_PRIMARY}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> New recipe
                </button>
              </SectionHeader>

              <section className={CARD}>
                {recipesList.length === 0 ? (
                  <EmptyState
                    icon={<ChefHat className="h-6 w-6" />}
                    title="No recipes yet"
                    body="Create a recipe so raw ingredients are deducted whenever the dish or prep item is used."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH}>Recipe</th>
                          <th className={TH}>Made from</th>
                          <th className={TH}><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className={TBODY}>
                        {recipesList.map((r) => (
                          <tr key={r.id} className={TR}>
                            <td className={`${TD} text-[14px] font-semibold text-[#0F1117]`}>{r.name}</td>
                            <td className={`${TD} tabular-nums`}>{plural(r.item_count, 'ingredient')}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-0.5">
                                <button onClick={() => handleEditRecipe(r.id)} className={ICON_BTN} aria-label={`Edit ${r.name}`} title="Edit recipe">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteRecipe(r.id)} className={ICON_BTN_DANGER} aria-label={`Delete ${r.name}`} title="Delete recipe">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'stock-take' && (
            <StockTakePanel
              stocks={overviewStocks}
              canReview={['owner', 'manager'].includes(myRole)}
              onEditPar={(item) => {
                setEditingParLevel(item);
                setParLevelValue(String(item.reorder_threshold));
              }}
              onChanged={() => {
                fetchAdvancedData();
                fetchBatches();
                setAlertsKey((k) => k + 1);
              }}
            />
          )}

          {activeTab === 'waste' && (
            <div className="px-8 py-6">
              <SectionHeader
                title="Wastage"
                count={plural(wastageEvents.length, 'entry', 'entries')}
                description="Record stock that was spoiled, spilled or lost so your counts stay accurate."
              >
                <button onClick={() => setShowLogWaste(true)} className={BTN_PRIMARY}>
                  <Plus className="h-4 w-4" strokeWidth={2.5} /> Log wastage
                </button>
              </SectionHeader>

              <section className={CARD}>
                {wastageEvents.length === 0 ? (
                  <EmptyState
                    icon={<Trash className="h-6 w-6" />}
                    title="No wastage recorded"
                    body="When something is spoiled, dropped or goes missing, log it here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left">
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH}>When</th>
                          <th className={TH}>Ingredient</th>
                          <th className={`${TH} text-right`}>Quantity lost</th>
                          <th className={TH}>Reason</th>
                          <th className={TH}>Logged by</th>
                        </tr>
                      </thead>
                      <tbody className={TBODY}>
                        {wastageEvents.map((w, idx) => (
                          <tr key={idx} className={TR}>
                            <td className={`${TD} tabular-nums`}>
                              {new Date(w.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className={`${TD} font-semibold text-[#0F1117]`}>{w.ingredient}</td>
                            <td className={`${TD} text-right font-semibold tabular-nums text-rose-600`}>−{w.quantity} {w.unit}</td>
                            <td className={`${TD} text-[#0F1117]`}>{w.reason ? (WASTE_REASON_LABELS[w.reason] || w.reason) : <span className="text-[#9CA3AF]">No reason</span>}</td>
                            <td className={TD}>{w.staff_name || 'System'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'prices' && <PriceHistoryPanel />}
          {activeTab === 'kitchen' && <TransfersPanel ingredients={overviewStocks} />}
        </main>
      </div>

      {/* Add supplier */}
      {showAddVendor && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Add supplier">
          <div className={`${DIALOG} max-w-md p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Add supplier</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">You can raise purchase orders against this supplier once it's saved.</p>
            <form onSubmit={handleAddVendor} className="mt-5 space-y-4">
              <div>
                <label className={LABEL} htmlFor="vendor-name">Supplier name</label>
                <input id="vendor-name" type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className={INPUT} placeholder="e.g. Metro Cash & Carry" required autoFocus />
              </div>
              <div>
                <label className={LABEL} htmlFor="vendor-lead">Lead time in days</label>
                <input id="vendor-lead" type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} min="0" className={`${INPUT} tabular-nums`} required />
                <p className="mt-1.5 text-[12px] text-[#9CA3AF]">How long they usually take to deliver after you order.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddVendor(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Save supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit supplier */}
      {editingVendor && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Edit supplier">
          <div className={`${DIALOG} max-w-md p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Edit supplier</h3>
            <form onSubmit={handleUpdateVendor} className="mt-5 space-y-4">
              <div>
                <label className={LABEL} htmlFor="edit-vendor-name">Supplier name</label>
                <input id="edit-vendor-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={INPUT} required />
              </div>
              <div>
                <label className={LABEL} htmlFor="edit-vendor-lead">Lead time in days</label>
                <input id="edit-vendor-lead" type="number" value={editLeadTime} onChange={(e) => setEditLeadTime(e.target.value)} min="0" className={`${INPUT} tabular-nums`} required />
              </div>
              <label htmlFor="editActive" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8E8E3] px-3.5 py-3 transition-colors hover:border-[#D6D6CF]">
                <input type="checkbox" id="editActive" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
                <span>
                  <span className="block text-[13px] font-semibold text-[#0F1117]">Active</span>
                  <span className="block text-[12px] text-[#6B7280]">Inactive suppliers stay in your records but can't be ordered from.</span>
                </span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingVendor(null)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Save changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit batch */}
      <AnimatePresence>
        {showEditBatchModal && editingBatch && (
          <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Edit batch">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className={`${DIALOG} max-w-md`}
            >
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div>
                  <h3 className="text-[17px] font-bold text-[#0F1117]">Edit batch</h3>
                  <p className="mt-1 text-[13px] text-[#6B7280]">{editingBatch.ingredient_name}</p>
                </div>
                <button onClick={() => setShowEditBatchModal(false)} className={`${ICON_BTN} -mr-2 -mt-1`} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleEditBatch} className="px-6 pb-6">
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL} htmlFor="batch-qty">Quantity</label>
                    <input id="batch-qty" type="number" step="0.001" required value={editingBatch.quantity} onChange={e => setEditingBatch({ ...editingBatch, quantity: Number(e.target.value) })} className={`${INPUT} tabular-nums`} />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="batch-cost">Cost per unit (₹)</label>
                    <input id="batch-cost" type="number" step="0.01" required value={editingBatch.cost_per_unit} onChange={e => setEditingBatch({ ...editingBatch, cost_per_unit: Number(e.target.value) })} className={`${INPUT} tabular-nums`} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL}>Received</label>
                    <CustomDateTimePicker
                      value={editingBatch.received_at ? new Date(new Date(editingBatch.received_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                      onChange={val => setEditingBatch({ ...editingBatch, received_at: val ? new Date(val).toISOString() : new Date().toISOString() })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL}>Supplier</label>
                    <Select
                      value={editingBatch.vendor_id || ''}
                      onChange={e => setEditingBatch({ ...editingBatch, vendor_id: e.target.value })}
                      className={INPUT}
                    >
                      <option value="">No supplier</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL} htmlFor="batch-expiry">Expiry date</label>
                    <input
                      id="batch-expiry"
                      type="date"
                      value={editingBatch.expires_at ? editingBatch.expires_at.split('T')[0] : ''}
                      onChange={e => setEditingBatch({ ...editingBatch, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className={INPUT}
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={() => setShowEditBatchModal(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                  <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Save changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receive stock against a purchase order */}
      {receivingPO && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Receive stock">
          <div className={`${DIALOG} flex max-h-[90vh] max-w-2xl flex-col`}>
            <div className="px-6 pb-4 pt-6">
              <h3 className="text-[17px] font-bold text-[#0F1117]">Receive stock</h3>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                PO #{receivingPO.id.slice(0, 8).toUpperCase()}. Enter what actually arrived. Anything still to come stays open so you can receive it later.
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-6">
              {receiveRows.length === 0 ? (
                <p className="rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] p-4 text-[13px] text-[#4B5563]">
                  Everything still outstanding on this order will be received in full.
                </p>
              ) : (
                receiveRows.map((row) => {
                  const left = Math.max(0, row.ordered - row.received);
                  const qty = Number(row.quantity) || 0;
                  const short = qty < left;
                  return (
                    <div key={row.item_id} className="rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="text-[14px] font-semibold text-[#0F1117]">{row.name}</span>
                        <span className="text-[12px] tabular-nums text-[#6B7280]">
                          Ordered {row.ordered} {row.unit}
                          {row.received > 0 ? `, ${row.received} already received` : ''}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="block">
                          <span className={LABEL}>Arrived ({row.unit})</span>
                          <input type="number" min="0" step="any" inputMode="decimal" value={row.quantity} onChange={(e) => updateReceiveRow(row.item_id, { quantity: e.target.value })} className={`${INPUT} tabular-nums`} />
                        </label>
                        <label className="block">
                          <span className={LABEL}>Cost per {row.unit} (₹)</span>
                          <input type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={row.cost} onChange={(e) => updateReceiveRow(row.item_id, { cost: e.target.value })} className={`${INPUT} tabular-nums`} />
                        </label>
                        <label className="block">
                          <span className={LABEL}>Expiry date</span>
                          <input type="date" value={row.expiry} onChange={(e) => updateReceiveRow(row.item_id, { expiry: e.target.value })} className={INPUT} />
                        </label>
                      </div>
                      {short && (
                        <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-[#4B5563]">
                          <input type="checkbox" checked={row.close} onChange={(e) => updateReceiveRow(row.item_id, { close: e.target.checked })} className="mt-0.5 h-4 w-4 rounded" />
                          <span>
                            The remaining {Number((left - qty).toFixed(3))} {row.unit} won't arrive. Close this item.
                          </span>
                        </label>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-[#F0F0EB] px-6 py-4">
              <button type="button" onClick={() => setReceivingPO(null)} disabled={isReceiving} className={BTN_SECONDARY}>Cancel</button>
              <button type="button" onClick={handleReceivePO} disabled={isReceiving} className={BTN_PRIMARY}>
                {isReceiving ? <><Loader2 className="h-4 w-4 animate-spin" /> Receiving</> : 'Receive stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New purchase order */}
      {showAddPO && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="New purchase order">
          <div className={`${DIALOG} flex max-h-[90vh] max-w-xl flex-col`}>
            <div className="px-6 pt-6">
              <h3 className="text-[17px] font-bold text-[#0F1117]">New purchase order</h3>
              <p className="mt-1 text-[13px] text-[#6B7280]">Choose a supplier and add what you're ordering.</p>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-5">
              <div>
                <label className={LABEL}>Supplier</label>
                <CustomSelect
                  value={selectedVendor}
                  onChange={(val: string) => setSelectedVendor(val)}
                  options={vendors.map(v => ({ value: v.id, label: v.name }))}
                  placeholder="Choose a supplier"
                  theme="orange"
                  buttonClassName={CUSTOM_SELECT_BTN}
                />
              </div>

              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#0F1117]">Items</p>
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E8E8E3] bg-[#FAFAF7] p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={LABEL}>Ingredient</label>
                    <CustomSelect
                      value={poIngredient}
                      onChange={(val: string) => setPoIngredient(val)}
                      options={ingredients.map(ing => ({ value: ing.id, label: ing.name }))}
                      placeholder="Choose an ingredient"
                      theme="orange"
                      buttonClassName={CUSTOM_SELECT_BTN}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="po-qty">Quantity</label>
                    <div className="flex h-10 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white transition-colors hover:border-[#D6D6CF] focus-within:border-[#fe5c13]">
                      <input id="po-qty" type="number" placeholder="0" value={poQuantity} onChange={(e) => setPoQuantity(e.target.value)} className="w-full min-w-0 bg-transparent px-3.5 text-[14px] tabular-nums text-[#0F1117] outline-none placeholder:text-[#9CA3AF]" />
                      <Select value={poUnit} onChange={(e) => setPoUnit(e.target.value)} className="h-full w-20 shrink-0 border-l border-[#E8E8E3] bg-[#F3F3EF] px-3 text-[13px] font-semibold text-[#374151]">
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="po-cost">Cost per unit (optional)</label>
                    <input id="po-cost" type="number" step="0.01" placeholder="₹0.00" value={poCost} onChange={(e) => setPoCost(e.target.value)} className={`${INPUT} tabular-nums`} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL} htmlFor="po-expiry">Expiry date (optional)</label>
                    <input id="po-expiry" type="date" value={poExpiry} onChange={(e) => setPoExpiry(e.target.value)} className={INPUT} />
                  </div>
                  <div className="sm:col-span-2">
                    <button type="button" onClick={handleAddPOItem} disabled={!poIngredient || !poQuantity} className={`${BTN_SECONDARY} w-full`}>
                      <Plus className="h-4 w-4" /> Add to order
                    </button>
                  </div>
                </div>

                {poItems.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#F0F0EB] rounded-xl border border-[#E8E8E3]">
                    {poItems.map((item, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-[#0F1117]">{item.name}</p>
                          {item.expected_expires_at && (
                            <p className="text-[12px] text-[#9CA3AF]">Expires {fmtDay(item.expected_expires_at)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] tabular-nums text-[#4B5563]">
                            {item.quantity} {item.unit}
                            {item.expected_cost_per_unit ? ` at ${fmtINR(item.expected_cost_per_unit)}` : ''}
                          </span>
                          <button type="button" onClick={() => setPoItems(poItems.filter((_, j) => j !== i))} className={ICON_BTN_DANGER} aria-label={`Remove ${item.name}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
              <button onClick={() => setShowAddPO(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
              <button onClick={handleCreatePO} disabled={!selectedVendor || poItems.length === 0} className={`${BTN_PRIMARY} flex-1`}>
                Place order{poItems.length > 0 ? ` (${plural(poItems.length, 'item')})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / edit recipe */}
      {showAddRecipe && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Recipe">
          <div className={`${DIALOG} max-w-xl p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">{recipeItems.length > 0 && recipeParent ? 'Recipe' : 'New recipe'}</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">Pick what's being made, then list the raw ingredients that go into one portion.</p>
            <div className="mt-5 space-y-5">
              <div>
                <label className={LABEL}>Dish or prep item</label>
                <CustomSelect
                  value={recipeParent}
                  onChange={(val: string) => setRecipeParent(val)}
                  options={[
                    ...menuItems.map(item => ({ value: item.id, label: item.name, group: "Menu items" })),
                    ...ingredients.map(item => ({ value: item.id, label: item.name, group: "Prep items" })),
                  ]}
                  placeholder="Choose a dish or prep item"
                  theme="orange"
                  buttonClassName={CUSTOM_SELECT_BTN}
                />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#0F1117]">Raw ingredients</p>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CustomSelect
                      value={recipeIngredient}
                      onChange={(val: string) => setRecipeIngredient(val)}
                      options={ingredients.map(ing => ({ value: ing.id, label: ing.name }))}
                      placeholder="Ingredient"
                      theme="orange"
                      buttonClassName={CUSTOM_SELECT_BTN}
                    />
                  </div>
                  <input type="number" placeholder="Qty" aria-label="Quantity" value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} className={`${INPUT} w-20 shrink-0 tabular-nums`} />
                  <div className="w-20 shrink-0">
                    <CustomSelect
                      value={recipeUnit}
                      onChange={(val: string) => setRecipeUnit(val)}
                      options={[
                        { value: "g", label: "g" },
                        { value: "ml", label: "ml" },
                        { value: "pcs", label: "pcs" },
                      ]}
                      placeholder="Unit"
                      theme="orange"
                      buttonClassName={CUSTOM_SELECT_BTN}
                    />
                  </div>
                  <button type="button" onClick={handleAddRecipeItem} disabled={!recipeIngredient || !recipeQuantity} className={`${BTN_SECONDARY} shrink-0`}>
                    Add
                  </button>
                </div>
                {recipeItems.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#F0F0EB] rounded-xl border border-[#E8E8E3]">
                    {recipeItems.map((item, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-2">
                        <span className="truncate text-[13px] font-semibold text-[#0F1117]">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] tabular-nums text-[#4B5563]">{item.quantity} {item.unit}</span>
                          <button type="button" onClick={() => setRecipeItems(recipeItems.filter((_, j) => j !== i))} className={ICON_BTN_DANGER} aria-label={`Remove ${item.name}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAddRecipe(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                <button onClick={handleCreateRecipe} disabled={!recipeParent || recipeItems.length === 0} className={`${BTN_PRIMARY} flex-1`}>Save recipe</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete batch */}
      {deleteConfirmBatchId && (
        <div className={`${OVERLAY} z-[60]`} role="dialog" aria-modal="true" aria-label="Delete batch">
          <div className={`${DIALOG} max-w-sm p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Delete this batch?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
              Its quantity comes off your stock. This can't be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button disabled={isDeleting} onClick={() => setDeleteConfirmBatchId(null)} className={`${BTN_SECONDARY} flex-1`}>
                Keep batch
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api('/api/admin/inventory/advanced/batches?id=' + deleteConfirmBatchId, { method: 'DELETE' });
                    setDeletingBatchIds(prev => new Set(prev).add(deleteConfirmBatchId));
                    setDeleteConfirmBatchId(null);
                    setTimeout(() => {
                      fetchBatches();
                      setDeletingBatchIds(prev => {
                        const n = new Set(prev);
                        n.delete(deleteConfirmBatchId);
                        return n;
                      });
                    }, 500);
                    toast.success("Batch deleted");
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to delete batch");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[13px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder level */}
      {editingParLevel && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Reorder level">
          <div className={`${DIALOG} max-w-sm p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Reorder level</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
              You'll be alerted when <span className="font-semibold text-[#0F1117]">{editingParLevel.ingredient}</span> drops below this amount.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateParLevel(); }} className="mt-5 space-y-4">
              <div>
                <label className={LABEL} htmlFor="par-level">Alert below</label>
                <input id="par-level" type="number" step="0.01" value={parLevelValue} onChange={(e) => setParLevelValue(e.target.value)} className={`${INPUT} tabular-nums`} required autoFocus />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingParLevel(null)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log wastage */}
      {showLogWaste && (
        <div className={OVERLAY} role="dialog" aria-modal="true" aria-label="Log wastage">
          <div className={`${DIALOG} max-w-md p-6`}>
            <h3 className="text-[17px] font-bold text-[#0F1117]">Log wastage</h3>
            <p className="mt-1 text-[13px] text-[#6B7280]">The amount comes off stock straight away.</p>
            <form onSubmit={handleLogWaste} className="mt-5 space-y-4">
              <div>
                <label className={LABEL}>Ingredient</label>
                <CustomSelect
                  value={wasteIngredient}
                  onChange={(val: string) => setWasteIngredient(val)}
                  options={ingredients.map(ing => ({ value: ing.id, label: ing.name }))}
                  placeholder="Choose an ingredient"
                  theme="orange"
                  buttonClassName={CUSTOM_SELECT_BTN}
                />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className={LABEL} htmlFor="waste-qty">Quantity lost</label>
                  <input id="waste-qty" type="number" step="0.01" value={wasteQuantity} onChange={(e) => setWasteQuantity(e.target.value)} className={`${INPUT} tabular-nums`} required />
                </div>
                <div className="w-28">
                  <label className={LABEL}>Unit</label>
                  <CustomSelect
                    value={wasteUnit}
                    onChange={(val: string) => setWasteUnit(val)}
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "L", label: "L" },
                      { value: "pcs", label: "pcs" },
                    ]}
                    placeholder="Unit"
                    theme="orange"
                    buttonClassName={CUSTOM_SELECT_BTN}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>Reason</label>
                <CustomSelect
                  value={wasteReason}
                  onChange={(val: string) => setWasteReason(val)}
                  options={[
                    { value: "Spoiled / Expired", label: "Spoiled or expired" },
                    { value: "Dropped / Spilled", label: "Dropped or spilled" },
                    { value: "Staff Meal", label: "Staff meal" },
                    { value: "Theft / Missing", label: "Theft or missing" },
                    { value: "Other", label: "Other" },
                  ]}
                  placeholder="Choose a reason"
                  theme="orange"
                  buttonClassName={CUSTOM_SELECT_BTN}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowLogWaste(false)} className={`${BTN_SECONDARY} flex-1`}>Cancel</button>
                <button type="submit" className={`${BTN_PRIMARY} flex-1`}>Log wastage</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
