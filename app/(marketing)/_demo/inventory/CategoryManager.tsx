import { useState } from 'react';
import { useMenu } from '../../_context/MenuContext';
import { X, Plus, Edit3, Trash2, Check } from 'lucide-react';

interface CategoryManagerProps {
    onClose: () => void;
}

const newId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function CategoryManager({ onClose }: CategoryManagerProps) {
    const { state, dispatch } = useMenu();
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [tab, setTab] = useState<'categories' | 'subcategories'>('categories');

    const handleAddCategory = () => {
        if (!newName.trim()) return;
        dispatch({
            type: 'ADD_CATEGORY',
            payload: {
                id: newId('cat'),
                name: newName.trim(),
                sortOrder: state.categories.length,
            },
        });
        setNewName('');
    };

    const handleRenameCategory = (id: string) => {
        if (!editingName.trim()) return;
        dispatch({ type: 'UPDATE_CATEGORY', payload: { id, name: editingName.trim() } });
        setEditingId(null);
        setEditingName('');
    };

    const handleRenameSubcategory = (id: string) => {
        if (!editingName.trim()) return;
        dispatch({ type: 'UPDATE_SUBCATEGORY', payload: { id, name: editingName.trim() } });
        setEditingId(null);
        setEditingName('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-900">Manage Names</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setTab('categories')}
                        className={`relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'categories' ? 'text-[#D9A016]' : 'text-gray-400'
                            }`}
                    >
                        Categories
                        {tab === 'categories' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFC529]" />
                        )}
                    </button>
                    <button
                        onClick={() => setTab('subcategories')}
                        className={`relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'subcategories' ? 'text-[#D9A016]' : 'text-gray-400'
                            }`}
                    >
                        Subcategories
                        {tab === 'subcategories' && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFC529]" />
                        )}
                    </button>
                </div>

                {/* Add new */}
                {tab === 'categories' && (
                    <div className="flex gap-2 border-b border-gray-100 px-6 py-4 bg-gray-50/30">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            placeholder="New category name..."
                            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                        />
                        <button
                            onClick={handleAddCategory}
                            disabled={!newName.trim()}
                            className="rounded-lg bg-gradient-to-r from-[#FFC529] to-[#F0B820] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40 shadow-md shadow-[#FFC529]/20"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* List */}
                <div className="max-h-[320px] overflow-y-auto px-6 py-3">
                    {tab === 'categories' && (
                        <>
                            {state.categories.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">No categories yet</p>
                            ) : (
                                <div className="space-y-1">
                                    {state.categories.map((cat) => {
                                        const itemCount = state.items.filter(
                                            (i) => i.categoryId === cat.id && !i.archived
                                        ).length;
                                        const isEditing = editingId === cat.id;

                                        return (
                                            <div
                                                key={cat.id}
                                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors"
                                            >
                                                {isEditing ? (
                                                    <>
                                                        <input
                                                            autoFocus
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) =>
                                                                e.key === 'Enter' && handleRenameCategory(cat.id)
                                                            }
                                                            className="flex-1 rounded-lg border border-[#FFC529] bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => handleRenameCategory(cat.id)}
                                                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 text-sm font-medium text-gray-700">
                                                            {cat.name}
                                                        </span>
                                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                                                            {itemCount} items
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(cat.id);
                                                                setEditingName(cat.name);
                                                            }}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-200"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => dispatch({ type: 'DELETE_CATEGORY', payload: cat.id })}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'subcategories' && (
                        <>
                            {(state.subcategories || []).length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-400">No subcategories yet</p>
                            ) : (
                                <div className="space-y-1">
                                    {(state.subcategories || []).map((sub) => {
                                        const parent = state.categories.find(
                                            (c) => c.id === sub.categoryGroupId
                                        );
                                        const isEditing = editingId === sub.id;

                                        return (
                                            <div
                                                key={sub.id}
                                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors"
                                            >
                                                {isEditing ? (
                                                    <>
                                                        <input
                                                            autoFocus
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            onKeyDown={(e) =>
                                                                e.key === 'Enter' && handleRenameSubcategory(sub.id)
                                                            }
                                                            className="flex-1 rounded-lg border border-[#FFC529] bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => handleRenameSubcategory(sub.id)}
                                                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="flex-1 text-sm font-medium text-gray-700">
                                                            {sub.name}
                                                        </span>
                                                        <span className="rounded-full bg-[#FFC529]/10 px-2 py-0.5 text-[10px] font-bold text-[#D9A016]">
                                                            {parent?.name || '—'}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(sub.id);
                                                                setEditingName(sub.name);
                                                            }}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-200"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => dispatch({ type: 'DELETE_SUBCATEGORY', payload: sub.id })}
                                                            className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
