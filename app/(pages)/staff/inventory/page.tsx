"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { motion, AnimatePresence } from "framer-motion";
import { PackageOpen, Truck, FileText, CheckCircle, Plus, Search, MapPin, Store, Edit2, Trash2, X } from 'lucide-react';
import StaffSidebar from '@/app/components/StaffSidebar';
import { toast } from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'vendors' | 'pos' | 'recipes' | 'kitchen' | 'stock'>('stock');
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


  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This will deduct its quantity from your inventory stock and cannot be undone.")) return;
    try {
      await api('/api/admin/inventory/advanced/batches?id=' + batchId, { method: 'DELETE' });
      toast.success("Batch deleted");
      fetchBatches();
      // fetchOverview(); // Optional if overview is used
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete batch");
    }
  };

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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <StaffSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header & Tab Bar */}
        <header className="border-b border-slate-200 bg-white px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <PackageOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Inventory Hub</h1>
              <p className="text-xs text-slate-500">Manage suppliers, purchase orders, recipes, and kitchen stock</p>
            </div>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'stock' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <PackageOpen size={15} />
              Stock Batches
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'pos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <FileText size={15} />
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'vendors' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <Truck size={15} />
              Suppliers
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'recipes' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <MapPin size={15} />
              Conversions & Recipes
            </button>
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${activeTab === 'kitchen' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
            >
              <Store size={15} />
              Central Kitchen
            </button>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'stock' && (
          <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Stock Batches</h2>
                <p className="mt-1 text-slate-500">Real-time inventory levels, batch arrivals, and expiry tracking.</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Loading stock batches...</div>
            ) : batches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PackageOpen size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No stock batches found</h3>
                <p className="mt-1 text-slate-500">Receive a Purchase Order or adjust stock to see active batches here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Ingredient</th>
                      <th className="px-6 py-4">Supplier</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Unit Cost</th>
                      <th className="px-6 py-4">Total Value</th>
                      <th className="px-6 py-4">Arrived At</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batches.map((b) => {
                      const isExpired = b.expires_at ? new Date(b.expires_at) < new Date() : false;
                      const isCloseToExpiry = b.expires_at 
                        ? (new Date(b.expires_at).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000 
                        : false;
                      
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-950">{b.ingredient_name}</td>
                          <td className="px-6 py-4 text-slate-500">{b.supplier_name}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{b.quantity}</td>
                          <td className="px-6 py-4 font-mono">{fmtINR(b.cost_per_unit)}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-950">{fmtINR(b.quantity * b.cost_per_unit)}</td>
                          <td className="px-6 py-4 text-slate-500">
                            {new Date(b.received_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingBatch(b); setShowEditBatchModal(true); }}
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(b.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
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
          <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Suppliers</h2>
                <p className="mt-1 text-slate-500">Manage your vendor directory and lead times.</p>
              </div>
              <button 
                onClick={() => setShowAddVendor(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow"
              >
                <Plus size={18} />
                Add Vendor
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400">Loading vendors...</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map(v => (
                  <div key={v.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute right-4 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleStartEdit(v)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                        title="Edit Supplier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteVendor(v.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mb-4 flex items-center gap-3 pr-10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{v.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${v.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Lead Time</span>
                        <span className="font-semibold text-slate-900">{v.lead_time_days} Days</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Orders</h2>
                <p className="mt-1 text-slate-500">Create POs and receive goods via GRN.</p>
              </div>
              <button onClick={() => setShowAddPO(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow">
                <Plus size={18} />
                Create PO
              </button>
            </div>
            
            {poList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FileText size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Purchase Orders yet</h3>
                <p className="mt-1 text-slate-500">Create your first PO to start tracking incoming stock.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {poList.map(po => (
                  <div key={po.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">PO #{po.id.slice(0,8).toUpperCase()}</div>
                      <div className="text-xs text-slate-500 mt-1">Created: {new Date(po.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 uppercase tracking-widest">{po.status}</span>
                      {po.status !== 'received' && (
                        <button 
                          onClick={() => handleReceivePO(po)}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Receive GRN
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Recipes & Conversions</h2>
                <p className="mt-1 text-slate-500">Map your raw ingredients to intermediate manufactured goods.</p>
              </div>
              <button 
                onClick={() => {
                  setRecipeParent('');
                  setRecipeItems([]);
                  setShowAddRecipe(true);
                }} 
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow"
              >
                <Plus size={18} />
                Create Recipe
              </button>
            </div>
            
            {recipesList.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <MapPin size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Recipes defined</h3>
                <p className="mt-1 text-slate-500">Create a recipe to automatically deduct raw ingredients when intermediate goods are used.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {recipesList.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-500 mt-1">Contains {r.item_count} ingredients</div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleEditRecipe(r.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit Details
                      </button>
                      <button 
                        onClick={() => handleDeleteRecipe(r.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete Recipe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="animate-in fade-in duration-300 slide-in-from-bottom-4">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Central Kitchen Transfers</h2>
                <p className="mt-1 text-slate-500">Manage stock transfers between your commissaries and branches.</p>
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow">
                <Plus size={18} />
                New Transfer
              </button>
            </div>
            
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Store size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No active transfers</h3>
              <p className="mt-1 text-slate-500">Dispatch stock to a branch to see it here.</p>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Select Vendor</label>
                <select 
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="" disabled>Choose a supplier...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <label className="block text-sm font-semibold text-slate-900">Add Items</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ingredient</label>
                    <select 
                      value={poIngredient}
                      onChange={(e) => setPoIngredient(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="" disabled>Choose Ingredient...</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Parent Menu Item / Intermediate Good</label>
                <select 
                  value={recipeParent}
                  onChange={(e) => setRecipeParent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="" disabled>Choose Parent Item...</option>
                  <optgroup label="Menu Items">
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Intermediate Goods">
                    {ingredients.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="border-t border-slate-100 pt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-900">Add Raw Ingredients</label>
                <div className="flex gap-2">
                  <select 
                    value={recipeIngredient}
                    onChange={(e) => setRecipeIngredient(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  >
                    <option value="" disabled>Choose Raw Ingredient...</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={recipeQuantity}
                    onChange={(e) => setRecipeQuantity(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
                  <select 
                    value={recipeUnit}
                    onChange={(e) => setRecipeUnit(e.target.value)}
                    className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900"
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <button onClick={handleAddRecipeItem} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add</button>
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
    </div>
  );
}
