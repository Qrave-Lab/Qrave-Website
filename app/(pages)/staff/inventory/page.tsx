"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { PackageOpen, Truck, FileText, CheckCircle, Plus, Search, MapPin, Store } from 'lucide-react';

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

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'pos' | 'recipes' | 'kitchen'>('pos');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);

  // New Vendor Form
  const [vendorName, setVendorName] = useState('');
  const [leadTime, setLeadTime] = useState('3');

  // PO State
  const [showAddPO, setShowAddPO] = useState(false);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [poIngredient, setPoIngredient] = useState('');
  const [poQuantity, setPoQuantity] = useState('');
  const [poUnit, setPoUnit] = useState('kg');
  const [poItems, setPoItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string}[]>([]);

  // Recipe State
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [recipeParent, setRecipeParent] = useState('');
  const [recipeIngredient, setRecipeIngredient] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');
  const [recipeUnit, setRecipeUnit] = useState('g');
  const [recipeItems, setRecipeItems] = useState<{ingredient_id: string, name: string, quantity: number, unit: string}[]>([]);
  const [recipesList, setRecipesList] = useState<{id: string, name: string, item_count: number}[]>([]);

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

  useEffect(() => {
    if (activeTab === 'vendors') {
      fetchVendors();
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPOItem = () => {
    if (!poIngredient || !poQuantity) return;
    setPoItems([...poItems, {
      ingredient_id: poIngredient,
      name: `Item ${poIngredient.slice(0,4)}`,
      quantity: parseFloat(poQuantity),
      unit: poUnit
    }]);
    setPoIngredient('');
    setPoQuantity('');
  };

  const handleCreatePO = async () => {
    if (!selectedVendor || poItems.length === 0) return;
    try {
      const res = await api<{id: string}>('/api/admin/inventory/advanced/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: selectedVendor,
          status: 'pending',
          items: poItems.map(i => ({
            ingredient_id: i.ingredient_id,
            quantity: i.quantity,
            unit: i.unit
          }))
        })
      });
      setShowAddPO(false);
      setPoList([{
        id: res.id,
        vendor_id: selectedVendor,
        status: 'pending',
        created_at: new Date().toISOString()
      }, ...poList]);
      setPoItems([]);
    } catch(e) {
      console.error(e);
    }
  };

  const handleAddRecipeItem = () => {
    if (!recipeIngredient || !recipeQuantity) return;
    setRecipeItems([...recipeItems, {
      ingredient_id: recipeIngredient,
      name: `Raw ${recipeIngredient.slice(0,4)}`,
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
        body: JSON.stringify({
          menu_item_id: recipeParent,
          items: recipeItems.map(i => ({
            ingredient_id: i.ingredient_id,
            quantity: i.quantity,
            unit: i.unit
          }))
        })
      });
      setShowAddRecipe(false);
      setRecipesList([...recipesList, { id: recipeParent, name: `Menu Item ${recipeParent.slice(0,4)}`, item_count: recipeItems.length }]);
      setRecipeItems([]);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <PackageOpen size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Inventory</h1>
        </div>
        
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'pos' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <FileText size={18} />
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'vendors' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <Truck size={18} />
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'recipes' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <MapPin size={18} />
            Conversions & Recipes
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === 'kitchen' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <Store size={18} />
            Central Kitchen
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
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
                    <div className="mb-4 flex items-center gap-3">
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
                      <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Receive GRN</button>
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
              <button onClick={() => setShowAddRecipe(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow">
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
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Edit Details</button>
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
              <div className="border-t border-slate-100 pt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-900">Add Items</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ingredient UUID" 
                    value={poIngredient}
                    onChange={(e) => setPoIngredient(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
                  <select 
                    value={poUnit}
                    onChange={(e) => setPoUnit(e.target.value)}
                    className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                  </select>
                  <button onClick={handleAddPOItem} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add</button>
                </div>
                {poItems.length > 0 && (
                  <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    {poItems.map((item, i) => (
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Parent Menu Item / Intermediate Good (UUID)</label>
                <input 
                  type="text" 
                  value={recipeParent}
                  onChange={(e) => setRecipeParent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                />
              </div>
              <div className="border-t border-slate-100 pt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-900">Add Raw Ingredients</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Raw Ingredient UUID" 
                    value={recipeIngredient}
                    onChange={(e) => setRecipeIngredient(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900"
                  />
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
