import { useState, useMemo, useEffect } from 'react';
import { useMenu } from '../../_context/MenuContext';
import ItemCard from './ItemCard';
import ItemFormModal from './ItemFormModal';
import CategoryManager from './CategoryManager';
import type { MenuItem } from '../../types/menu';
import {
    Plus,
    Search,
    Package,
    Archive,
    Settings,
} from 'lucide-react';

export default function MenuInventory() {
    const { state, dispatch } = useMenu();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [showCategories, setShowCategories] = useState(false);
    const [selectAll, setSelectAll] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Subcategory inline manager
    const [subCatGroup, setSubCatGroup] = useState(state.categories[0]?.id ?? '');
    const [subCatName, setSubCatName] = useState('');

    useEffect(() => {
        if (!state.categories.some((c) => c.id === subCatGroup)) {
            setSubCatGroup(state.categories[0]?.id ?? '');
        }
    }, [state.categories, subCatGroup]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return state.items
            .filter((i) => (viewMode === 'archived' ? !!i.archived : !i.archived))
            .filter((i) => categoryFilter === 'all' || i.categoryId === categoryFilter)
            .filter(
                (i) =>
                    !q ||
                    i.name.toLowerCase().includes(q) ||
                    i.description.toLowerCase().includes(q)
            );
    }, [state.items, search, categoryFilter, viewMode]);

    const activeCount = useMemo(
        () => state.items.filter((item) => !item.archived).length,
        [state.items]
    );
    const archivedCount = useMemo(
        () => state.items.filter((item) => !!item.archived).length,
        [state.items]
    );

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filtered.map((i) => i.id)));
        }
        setSelectAll(!selectAll);
    };

    const toggleItem = (id: string) => {
        const next = new Set(selectedItems);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedItems(next);
        setSelectAll(next.size === filtered.length);
    };

    useEffect(() => {
        const visibleIds = new Set(filtered.map((i) => i.id));
        const next = new Set(Array.from(selectedItems).filter((id) => visibleIds.has(id)));
        if (next.size !== selectedItems.size) {
            setSelectedItems(next);
        }
        setSelectAll(filtered.length > 0 && next.size === filtered.length);
    }, [filtered, selectedItems]);

    const handleArchiveSelected = () => {
        if (selectedItems.size === 0) return;
        dispatch({
            type: 'SET_ITEMS',
            payload: state.items.map((item) =>
                selectedItems.has(item.id)
                    ? { ...item, archived: viewMode === 'active' }
                    : item
            ),
        });
        setSelectedItems(new Set());
        setSelectAll(false);
    };

    const handleAddSubCategory = () => {
        if (!subCatName.trim() || !subCatGroup) return;
        dispatch({
            type: 'ADD_SUBCATEGORY',
            payload: {
                id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: subCatName.trim(),
                categoryGroupId: subCatGroup,
                sortOrder: (state.subcategories || []).length,
            },
        });
        setSubCatName('');
    };

    // Build category breadcrumb for item
    const getCategoryBreadcrumb = (item: MenuItem) => {
        const cat = state.categories.find((c) => c.id === item.categoryId);
        const sub = item.subcategoryId
            ? (state.subcategories || []).find((s) => s.id === item.subcategoryId)
            : null;
        if (cat && sub) return `${cat.name.toUpperCase()} • ${sub.name.toUpperCase()}`;
        return cat?.name.toUpperCase() || 'UNCATEGORIZED';
    };

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB]">
            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900">Menu Engineering</h1>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <Settings className="h-3 w-3" />
                        {viewMode === 'archived' ? archivedCount : activeCount} Products
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleArchiveSelected}
                        disabled={selectedItems.size === 0}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Archive className="h-3 w-3" />
                        {viewMode === 'active' ? 'Archive' : 'Unarchive'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setCategoryFilter('all');
                            setSearch('');
                            setViewMode('active');
                            setShowForm(true);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[#FFC529] px-4 py-2 text-xs font-bold text-black"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Product
                    </button>
                    <span className="rounded-full bg-[#FFC529]/10 px-3 py-1 text-[11px] font-bold text-[#FFC529]">
                        DEMO MODE
                    </span>
                </div>
            </div>

            {/* ── Subcategory Manager ─────────────────────────── */}
            <div className="border-b border-gray-200 bg-white px-6 py-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Plus className="h-4 w-4 text-[#D9A016]" />
                            Add Subcategory
                        </div>
                        <button
                            onClick={() => setShowCategories(true)}
                            className="text-xs font-semibold text-[#D9A016] hover:text-[#C4900F] transition-colors"
                        >
                            Manage Names →
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={subCatGroup}
                            onChange={(e) => setSubCatGroup(e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                        >
                            {state.categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <input
                            value={subCatName}
                            onChange={(e) => setSubCatName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubCategory()}
                            placeholder="e.g. Pizzas, Burgers, Chinese"
                            className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                        />
                        <button
                            onClick={handleAddSubCategory}
                            disabled={!subCatName.trim()}
                            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FFC529] to-[#F0B820] px-5 py-2.5 text-sm font-bold text-black shadow-md shadow-[#FFC529]/20 disabled:opacity-40 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Category Filter Pills + Search ──────────────── */}
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
                <div className="mr-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold ${viewMode === 'active'
                            ? 'bg-[#FFC529] text-black'
                            : 'text-gray-500'
                            }`}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setViewMode('archived')}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold ${viewMode === 'archived'
                            ? 'bg-[#FFC529] text-black'
                            : 'text-gray-500'
                            }`}
                    >
                        Archived ({archivedCount})
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setCategoryFilter('all')}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${categoryFilter === 'all'
                            ? 'bg-gradient-to-r from-[#FFC529] to-[#F0B820] text-black shadow-md shadow-[#FFC529]/20'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    {state.categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${categoryFilter === cat.id
                                ? 'bg-gradient-to-r from-[#FFC529] to-[#F0B820] text-black shadow-md shadow-[#FFC529]/20'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <label className="ml-2 flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-[#FFC529] focus:ring-[#FFC529]/20"
                    />
                    Select All
                </label>
                <div className="ml-auto relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu..."
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                    />
                </div>
            </div>

            {/* ── Items Grid ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Package className="mb-4 h-12 w-12 text-gray-300" />
                        <p className="text-lg font-semibold text-gray-500">No items found</p>
                        <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                categoryBreadcrumb={getCategoryBreadcrumb(item)}
                                selected={selectedItems.has(item.id)}
                                onToggleSelect={() => toggleItem(item.id)}
                                onToggleStock={() =>
                                    dispatch({
                                        type: 'UPDATE_ITEM',
                                        payload: { id: item.id, updates: { inStock: !item.inStock } },
                                    })
                                }
                                onEdit={() => {
                                    setEditingItem(item);
                                    setShowForm(true);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modals ──────────────────────────────────────── */}
            {showForm && (
                <ItemFormModal
                    item={editingItem}
                    onClose={() => {
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                />
            )}
            {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}
        </div>
    );
}
