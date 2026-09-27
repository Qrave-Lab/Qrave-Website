"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { motion, AnimatePresence } from "framer-motion";
import { PackageOpen, Truck, FileText, CheckCircle, Plus, Search, MapPin, Store, Edit2, Trash2, X, AlertTriangle, ClipboardList, Trash } from 'lucide-react';
import StaffSidebar from '@/app/components/StaffSidebar';
import { toast } from 'react-hot-toast';
import { CustomSelect } from '@/app/components/ui/CustomSelect';

type Vendor = {
  id: string;
  name: string;
  lead_time_days: number;
  is_active: boolean;
};

type PurchaseOrder = {
  id: string;
  vendor_id?: string;
  status: string;
  expected_at?: string;
  notes?: string;
  created_at: string;
};

const fmtINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'pos' | 'recipes' | 'kitchen' | 'stock' | 'stock-take' | 'waste'>('stock');
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
  const [stockTakeCounts, setStockTakeCounts] = useState<Record<string, string>>({});
  
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
      if (suggRes?.suggestions) setPurchaseSuggestions(suggRes.suggestions);
      if (wasteRes?.events) setWastageEvents(wasteRes.events);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveStockTake = async () => {
    try {
      const promises = Object.entries(stockTakeCounts).map(([id, qty]) => {
        const item = overviewStocks.find(s => s.ingredient_id === id);
        if (!item) return null;
        return api(`/api/admin/inventory/advanced/ingredients/${id}/stock`, {
          method: 'POST',
          body: JSON.stringify({
            stock: Number(qty),
            reorder_threshold: Number(item.reorder_threshold || 0),
            reason: 'Physical Stock Take'
          })
        });
      }).filter(Boolean);
      await Promise.all(promises);
      toast.success("Stock take saved successfully");
      setStockTakeCounts({});
      fetchAdvancedData();
      fetchBatches();
    } catch(e) {
      toast.error("Failed to save stock take");
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
    fetchIngredientsAndMenuItems();
    fetchBatches();
    fetchRecipes();
    fetchVendors();
    fetchAdvancedData();
  }, []);

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
  const handleReceivePO = async (po: PurchaseOrder) => {
    try {
      await api(`/api/admin/inventory/advanced/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ items: [] })
      });
      setPoList(poList.map(p => p.id === po.id ? { ...p, status: 'received' } : p));
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Failed to receive PO");
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
            expected_expires_at: i.expected_expires_at
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
    } catch(e) {
      console.error(e);
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

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900 overflow-hidden">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header & Tab Bar */}
        <header className="border-b border-slate-200 bg-white shrink-0">
          <div className="px-8 pt-5 pb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs shrink-0">
                <PackageOpen size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Inventory Hub</h1>
                <p className="text-xs font-medium text-slate-500">Manage suppliers, purchase orders, recipes, and kitchen stock</p>
              </div>
            </div>
          </div>
          
          <div className="px-8 pb-3.5 pt-0">
            <nav className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 shadow-xs w-full">
              <button
                onClick={() => setActiveTab('stock')}
                title="Stock Batches"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stock'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <PackageOpen size={14} className={`shrink-0 ${activeTab === 'stock' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Stock Batches</span>
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                title="Purchase Orders"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pos'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <FileText size={14} className={`shrink-0 ${activeTab === 'pos' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Purchase Orders</span>
              </button>
              <button
                onClick={() => setActiveTab('vendors')}
                title="Suppliers"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'vendors'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Truck size={14} className={`shrink-0 ${activeTab === 'vendors' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Suppliers</span>
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                title="Conversions & Recipes"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'recipes'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <MapPin size={14} className={`shrink-0 ${activeTab === 'recipes' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Conversions &amp; Recipes</span>
              </button>
              <button
                onClick={() => setActiveTab('stock-take')}
                title="Stock Take"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stock-take'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ClipboardList size={14} className={`shrink-0 ${activeTab === 'stock-take' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Stock Take</span>
              </button>
              <button
                onClick={() => setActiveTab('waste')}
                title="Wastage"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'waste'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Trash size={14} className={`shrink-0 ${activeTab === 'waste' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Wastage</span>
              </button>
              <button
                onClick={() => setActiveTab('kitchen')}
                title="Central Kitchen"
                className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'kitchen'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Store size={14} className={`shrink-0 ${activeTab === 'kitchen' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="truncate">Central Kitchen</span>
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-white flex flex-col">
        {activeTab === 'stock' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Stock Batches</h2>
                  {!loading && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Real-time inventory levels, batch arrivals, and expiry tracking.</p>
              </div>
            </div>
            
            {/* Low Stock Alerts */}
            {purchaseSuggestions.length > 0 && (
              <div className="mx-8 mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <AlertTriangle size={18} />
                  <h3>Low Stock Alerts ({purchaseSuggestions.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {purchaseSuggestions.map((s, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-amber-100 flex justify-between items-center shadow-sm">
                      <div>
                        <div className="font-semibold text-slate-900">{s.ingredient}</div>
                        <div className="text-xs text-slate-500">Current: <span className="font-bold text-rose-600">{s.current_stock}</span> / Par: {s.reorder_threshold}</div>
                      </div>
                      <button onClick={() => {
                        setSelectedVendor('');
                        setPoIngredient(s.ingredient_id);
                        setPoQuantity(s.suggested_order_qty);
                        setShowAddPO(true);
                      }} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors">
                        Order {s.suggested_order_qty}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {loading ? (
              <div className="py-24 text-center text-sm text-slate-400">Loading stock batches...</div>
            ) : batches.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center my-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
                  <PackageOpen size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No stock batches found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">Receive a Purchase Order or adjust stock to see active batches here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-8 py-3.5">Ingredient</th>
                      <th className="px-8 py-3.5">Supplier</th>
                      <th className="px-8 py-3.5">Quantity</th>
                      <th className="px-8 py-3.5">Unit Cost</th>
                      <th className="px-8 py-3.5">Total Value</th>
                      <th className="px-8 py-3.5">Arrived At</th>
                      <th className="px-8 py-3.5">Expiry Date</th>
                      <th className="px-8 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((b) => {
                      const isExpired = b.expires_at ? new Date(b.expires_at) < new Date() : false;
                      const isCloseToExpiry = b.expires_at 
                        ? (new Date(b.expires_at).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000 
                        : false;
                      
                      return (
                        <tr key={b.id} className={`hover:bg-slate-50/50 transition-all duration-500 ease-in-out ${deletingBatchIds.has(b.id) ? 'opacity-0 -translate-x-4 bg-rose-50' : 'opacity-100 translate-x-0'}`}>
                          <td className="px-8 py-4 font-semibold text-slate-950">{b.ingredient_name}</td>
                          <td className="px-8 py-4 text-slate-500">{b.supplier_name}</td>
                          <td className="px-8 py-4 font-mono font-bold text-slate-900">{b.quantity}</td>
                          <td className="px-8 py-4 font-mono">{fmtINR(b.cost_per_unit)}</td>
                          <td className="px-8 py-4 font-mono font-bold text-slate-950">{fmtINR(b.quantity * b.cost_per_unit)}</td>
                          <td className="px-8 py-4 text-slate-500">
                            {new Date(b.received_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-8 py-4">
                            {b.expires_at ? (
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold tracking-wide ${
                                isExpired 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                  : isCloseToExpiry 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {new Date(b.expires_at).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                                {isExpired && ' (Expired)'}
                                {!isExpired && isCloseToExpiry && ' (Expiring Soon)'}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">No Expiry</span>
                            )}
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingBatch(b); setShowEditBatchModal(true); }}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmBatchId(b.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              >
                                <Trash2 size={16} />
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
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Suppliers</h2>
                  {!loading && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {vendors.length} {vendors.length === 1 ? 'supplier' : 'suppliers'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Manage your vendor directory and lead times.</p>
              </div>
              <button 
                onClick={() => setShowAddVendor(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow self-start sm:self-auto"
              >
                <Plus size={16} />
                Add Supplier
              </button>
            </div>

            {loading ? (
              <div className="py-24 text-center text-sm text-slate-400">Loading suppliers...</div>
            ) : vendors.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center my-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
                  <Truck size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No suppliers found</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">Add your first supplier to track inventory sources.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-8 py-3.5">Supplier Name</th>
                      <th className="px-8 py-3.5">Status</th>
                      <th className="px-8 py-3.5">Lead Time</th>
                      <th className="px-8 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                              <Truck size={18} />
                            </div>
                            <span className="font-semibold text-slate-950">{v.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {v.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-8 py-4 font-semibold text-slate-900">
                          {v.lead_time_days} Days
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleStartEdit(v)}
                              className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                              title="Edit Supplier"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteVendor(v.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete Supplier"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Purchase Orders</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {poList.length} {poList.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Create POs and receive goods via GRN.</p>
              </div>
              <button 
                onClick={() => setShowAddPO(true)} 
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow self-start sm:self-auto"
              >
                <Plus size={16} />
                Create PO
              </button>
            </div>
            
            {poList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center my-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
                  <FileText size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No Purchase Orders yet</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">Create your first PO to start tracking incoming stock.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-8 py-3.5">PO Number</th>
                      <th className="px-8 py-3.5">Created Date</th>
                      <th className="px-8 py-3.5">Status</th>
                      <th className="px-8 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poList.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4 font-mono font-bold text-slate-900">
                          PO #{po.id.slice(0,8).toUpperCase()}
                        </td>
                        <td className="px-8 py-4 text-slate-500">
                          {new Date(po.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-8 py-4">
                          <span className="inline-flex rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 uppercase tracking-wider">
                            {po.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          {po.status !== 'received' && (
                            <button 
                              onClick={() => handleReceivePO(po)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Receive GRN
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Recipes & Conversions</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {recipesList.length} {recipesList.length === 1 ? 'recipe' : 'recipes'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Map your raw ingredients to intermediate manufactured goods.</p>
              </div>
              <button 
                onClick={() => {
                  setRecipeParent('');
                  setRecipeItems([]);
                  setShowAddRecipe(true);
                }} 
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow self-start sm:self-auto"
              >
                <Plus size={16} />
                Create Recipe
              </button>
            </div>
            
            {recipesList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center my-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
                  <MapPin size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No Recipes defined</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">Create a recipe to automatically deduct raw ingredients when intermediate goods are used.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-8 py-3.5">Recipe Name</th>
                      <th className="px-8 py-3.5">Composition</th>
                      <th className="px-8 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recipesList.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4 font-semibold text-slate-950">
                          {r.name}
                        </td>
                        <td className="px-8 py-4 text-slate-500">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Contains {r.item_count} ingredients
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditRecipe(r.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteRecipe(r.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stock-take' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Physical Stock Take</h2>
                <p className="mt-1 text-xs text-slate-500">Reconcile theoretical system stock with physical counts, and set Par Levels.</p>
              </div>
              <button 
                onClick={handleSaveStockTake}
                disabled={Object.keys(stockTakeCounts).length === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                Save Variances
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-3.5">Ingredient</th>
                    <th className="px-8 py-3.5">System Stock</th>
                    <th className="px-8 py-3.5">Par Level (Reorder Pt)</th>
                    <th className="px-8 py-3.5">Actual Physical Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overviewStocks.map((item) => (
                    <tr key={item.ingredient_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 font-semibold text-slate-950">{item.ingredient}</td>
                      <td className="px-8 py-4 font-mono">{item.stock}</td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{item.reorder_threshold}</span>
                          <button onClick={() => {
                            setEditingParLevel(item);
                            setParLevelValue(item.reorder_threshold.toString());
                          }} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter count..."
                          value={stockTakeCounts[item.ingredient_id] ?? ''}
                          onChange={e => setStockTakeCounts({...stockTakeCounts, [item.ingredient_id]: e.target.value})}
                          className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'waste' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Wastage Log</h2>
                <p className="mt-1 text-xs text-slate-500">Track spoiled, dropped, or unaccounted inventory loss.</p>
              </div>
              <button 
                onClick={() => setShowLogWaste(true)}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-rose-700"
              >
                <Plus size={16} />
                Log Waste
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-3.5">Date</th>
                    <th className="px-8 py-3.5">Ingredient</th>
                    <th className="px-8 py-3.5">Quantity Lost</th>
                    <th className="px-8 py-3.5">Reason</th>
                    <th className="px-8 py-3.5">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wastageEvents.map((w, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 text-slate-500">{new Date(w.created_at).toLocaleString()}</td>
                      <td className="px-8 py-4 font-semibold text-slate-950">{w.ingredient}</td>
                      <td className="px-8 py-4 font-mono font-bold text-rose-600">-{w.quantity} {w.unit}</td>
                      <td className="px-8 py-4 text-slate-700">{w.reason}</td>
                      <td className="px-8 py-4 text-slate-500">{w.staff_name || 'System'}</td>
                    </tr>
                  ))}
                  {wastageEvents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-slate-500">No wastage events recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-200">
            <div className="border-b border-slate-100 bg-white px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Central Kitchen Transfers</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Manage stock transfers between your commissaries and branches.</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow self-start sm:self-auto">
                <Plus size={16} />
                New Transfer
              </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center my-auto">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200/60">
                <Store size={28} />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No active transfers</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">Dispatch stock to a branch to see it here.</p>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Add New Supplier</h3>
            <form onSubmit={handleAddVendor} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Name</label>
                <input 
                  type="text" 
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. Sysco Foods"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lead Time (Days)</label>
                <input 
                  type="number" 
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  min="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddVendor(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 hover:shadow"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Edit Supplier</h3>
            <form onSubmit={handleUpdateVendor} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. Sysco Foods"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lead Time (Days)</label>
                <input 
                  type="number" 
                  value={editLeadTime}
                  onChange={(e) => setEditLeadTime(e.target.value)}
                  min="0"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="editActive"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="editActive" className="text-sm font-medium text-slate-700">Active</label>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingVendor(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 hover:shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      <AnimatePresence>
        {showEditBatchModal && editingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-slate-100 px-6 py-4 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Edit Stock Batch</h3>
                <button onClick={() => setShowEditBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditBatch} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={editingBatch.quantity}
                      onChange={e => setEditingBatch({...editingBatch, quantity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingBatch.cost_per_unit}
                      onChange={e => setEditingBatch({...editingBatch, cost_per_unit: Number(e.target.value)})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Received At</label>
                    <input
                      type="datetime-local"
                      required
                      value={new Date(new Date(editingBatch.received_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)}
                      onChange={e => setEditingBatch({...editingBatch, received_at: new Date(e.target.value).toISOString()})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                    <select
                      value={editingBatch.vendor_id || ''}
                      onChange={e => setEditingBatch({...editingBatch, vendor_id: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Direct Input / No Supplier</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Expected Expiry Date</label>
                    <input
                      type="date"
                      value={editingBatch.expires_at ? editingBatch.expires_at.split('T')[0] : ''}
                      onChange={e => setEditingBatch({...editingBatch, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button type="button" onClick={() => setShowEditBatchModal(false)} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500/20">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add PO Modal */}
      {showAddPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Create Purchase Order</h3>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Select Vendor</label>
                <CustomSelect
                  value={selectedVendor}
                  onChange={(val: string) => setSelectedVendor(val)}
                  options={vendors.map(v => ({ value: v.id, label: v.name }))}
                  placeholder="Choose a supplier..."
                  theme="emerald"
                />
              </div>
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-900">Add Items</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ingredient</label>
                    <CustomSelect
                      value={poIngredient}
                      onChange={(val: string) => setPoIngredient(val)}
                      options={ingredients.map(ing => ({ value: ing.id, label: ing.name }))}
                      placeholder="Choose Ingredient..."
                      theme="emerald"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                    <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={poQuantity}
                        onChange={(e) => setPoQuantity(e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
                      />
                      <select 
                        value={poUnit}
                        onChange={(e) => setPoUnit(e.target.value)}
                        className="bg-slate-100 border-l border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="kg">kg</option>
                        <option value="L">L</option>
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={poExpiry}
                      onChange={(e) => setPoExpiry(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cost Per Unit (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={poCost}
                      onChange={(e) => setPoCost(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 pt-1">
                    <button 
                      onClick={handleAddPOItem} 
                      className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 py-2.5 text-sm font-semibold text-white transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus size={16} />
                      Add to List
                    </button>
                  </div>
                </div>
                {poItems.length > 0 && (
                  <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    {poItems.map((item, i) => (
                      <li key={i} className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          {item.expected_expires_at && (
                            <span className="text-xs text-slate-400 font-normal">Exp: {new Date(item.expected_expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        <span>
                          {item.quantity} {item.unit}
                          {item.expected_cost_per_unit ? ` @ ${fmtINR(item.expected_cost_per_unit)}/unit` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowAddPO(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreatePO}
                  disabled={!selectedVendor || poItems.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 hover:shadow disabled:opacity-50"
                >
                  Create PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {showAddRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Create Recipe</h3>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Parent Menu Item / Intermediate Good</label>
                <CustomSelect
                  value={recipeParent}
                  onChange={(val: string) => setRecipeParent(val)}
                  options={[
                    ...menuItems.map(item => ({
                      value: item.id,
                      label: item.name,
                      group: "Menu Items",
                    })),
                    ...ingredients.map(item => ({
                      value: item.id,
                      label: item.name,
                      group: "Intermediate Goods",
                    })),
                  ]}
                  placeholder="Choose Parent Item or Intermediate Good..."
                  theme="emerald"
                />
              </div>
              <div className="border-t border-slate-100 pt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-900">Add Raw Ingredients</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CustomSelect
                      value={recipeIngredient}
                      onChange={(val: string) => setRecipeIngredient(val)}
                      options={ingredients.map(ing => ({
                        value: ing.id,
                        label: ing.name,
                      }))}
                      placeholder="Choose Raw Ingredient..."
                      theme="emerald"
                    />
                  </div>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={recipeQuantity}
                    onChange={(e) => setRecipeQuantity(e.target.value)}
                    className="w-24 min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-semibold"
                  />
                  <div className="w-24">
                    <CustomSelect
                      value={recipeUnit}
                      onChange={(val: string) => setRecipeUnit(val)}
                      options={[
                        { value: "g", label: "g" },
                        { value: "ml", label: "ml" },
                        { value: "pcs", label: "pcs" },
                      ]}
                      placeholder="Unit"
                      theme="emerald"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddRecipeItem} 
                    className="min-h-[46px] rounded-xl bg-slate-900 hover:bg-black px-5 text-sm font-semibold text-white transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
                {recipeItems.length > 0 && (
                  <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    {recipeItems.map((item, i) => (
                      <li key={i} className="flex justify-between text-sm font-medium text-slate-700">
                        <span>{item.name}</span>
                        <span>{item.quantity} {item.unit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowAddRecipe(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateRecipe}
                  disabled={!recipeParent || recipeItems.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 hover:shadow disabled:opacity-50"
                >
                  Save Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Confirmation Modal */}
      {deleteConfirmBatchId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mb-4 mx-auto text-rose-600">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Delete Batch?</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              This will deduct its quantity from your inventory stock and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmBatchId(null)}
                className="flex-1 py-2.5 rounded-xl text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
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
                className="flex-1 py-2.5 rounded-xl text-white font-bold bg-rose-600 hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Par Level Modal */}
      {editingParLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-2 text-xl font-bold text-slate-900">Set Par Level</h3>
            <p className="text-sm text-slate-500 mb-6">Receive an alert when <strong>{editingParLevel.ingredient}</strong> stock drops below this number.</p>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateParLevel(); }} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Reorder Threshold</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={parLevelValue}
                  onChange={(e) => setParLevelValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingParLevel(null)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700 hover:shadow">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {showLogWaste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md scale-100 rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-6 text-xl font-bold text-slate-900">Log Wastage</h3>
            <form onSubmit={handleLogWaste} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Ingredient</label>
                <CustomSelect
                  value={wasteIngredient}
                  onChange={(val: string) => setWasteIngredient(val)}
                  options={ingredients.map(ing => ({ value: ing.id, label: ing.name }))}
                  placeholder="Choose Ingredient..."
                  theme="slate"
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Quantity Lost</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={wasteQuantity}
                    onChange={(e) => setWasteQuantity(e.target.value)}
                    className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10 font-semibold"
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">Unit</label>
                  <CustomSelect
                    value={wasteUnit}
                    onChange={(val: string) => setWasteUnit(val)}
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "L", label: "L" },
                      { value: "pcs", label: "pcs" },
                    ]}
                    placeholder="Unit"
                    theme="slate"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">Reason</label>
                <CustomSelect
                  value={wasteReason}
                  onChange={(val: string) => setWasteReason(val)}
                  options={[
                    { value: "Spoiled / Expired", label: "Spoiled / Expired" },
                    { value: "Dropped / Spilled", label: "Dropped / Spilled" },
                    { value: "Staff Meal", label: "Staff Meal" },
                    { value: "Theft / Missing", label: "Theft / Missing" },
                    { value: "Other", label: "Other" },
                  ]}
                  placeholder="Select Reason..."
                  theme="slate"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowLogWaste(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-rose-700 hover:shadow">Submit Waste</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
