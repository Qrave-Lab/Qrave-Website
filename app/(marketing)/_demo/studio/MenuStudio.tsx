"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { useStudio } from './context/StudioContext';
import ThemeEditor from './components/ThemeEditor';
import LiveMenuPreview from './components/LiveMenuPreview';
import ItemFormModal from '../inventory/ItemFormModal';
import type { MenuItem } from '../../types/menu';

export default function MenuStudio() {
    const router = useRouter();
    const { state, dispatch } = useStudio();

    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [showForm, setShowForm] = useState(false);

    const handleSave = () => {
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
        setTimeout(() => {
            dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
            setTimeout(() => {
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' });
            }, 2000);
        }, 800);
    };

    return (
        <div className="flex h-screen flex-col bg-white overflow-hidden">
            {/* Header */}
            <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => router.push('/demo')}
                        className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-gray-400 transition-all hover:text-gray-900 uppercase group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                        Back
                    </button>
                    <div className="h-5 w-px bg-gray-200" />
                    <div>
                        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">Menu Studio</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="text-[11px] text-gray-400 font-medium mr-2">
                        {state.saveStatus === 'saved' && (
                            <span className="flex items-center gap-1 text-green-600">
                                <Check className="w-3 h-3" />
                                Auto-saved
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={state.saveStatus === 'saving'}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold transition-all active:scale-95 disabled:opacity-70 ${state.saveStatus === 'saved'
                            ? 'bg-green-600 text-white'
                            : 'bg-[#111827] text-white hover:bg-black'
                            }`}
                    >
                        {state.saveStatus === 'saving' ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving…
                            </>
                        ) : state.saveStatus === 'saved' ? (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                Publish
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                <ThemeEditor />
                <LiveMenuPreview
                    onEditItem={(item) => {
                        setEditingItem(item);
                        setShowForm(true);
                    }}
                    onAddItem={() => {
                        setEditingItem(null);
                        setShowForm(true);
                    }}
                />
            </div>

            {/* Editing Modal */}
            {showForm && (
                <ItemFormModal
                    item={editingItem}
                    onClose={() => {
                        setShowForm(false);
                        setEditingItem(null);
                    }}
                />
            )}
        </div>
    );
}
