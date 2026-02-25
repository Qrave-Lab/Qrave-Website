import { useRef, useState } from 'react';
import { useMenu } from '../../_context/MenuContext';
import type { MenuItem } from '../../types/menu';
import {
    X,
    Sparkles,
    Info,
    Trash2,
    Upload,
    Box,
    UtensilsCrossed,
    Calendar,
    ShieldCheck,
    Plus,
    AlertTriangle,
    Clock3,
} from 'lucide-react';

interface ItemFormModalProps {
    item: MenuItem | null;
    onClose: () => void;
}

const TABS = [
    'General Info',
    'Variants & Price',
    'Modifiers & Combos',
    'Media & 3D',
    'Ingredients',
    'Availability',
] as const;

const ALLERGENS = [
    'Dairy',
    'Gluten',
    'Peanuts',
    'Tree Nuts',
    'Eggs',
    'Soy',
    'Fish',
    'Shellfish',
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const newId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const newRowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function ItemFormModal({ item, onClose }: ItemFormModalProps) {
    const { state, dispatch } = useMenu();
    const isEdit = !!item;

    const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('General Info');

    // Form state
    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [price, setPrice] = useState(item?.price?.toString() ?? '');
    const [calories, setCalories] = useState(item?.calories?.toString() ?? '');
    const [image, setImage] = useState(item?.image ?? '');
    const [categoryId, setCategoryId] = useState(
        item?.categoryId ?? state.categories[0]?.id ?? ''
    );
    const [subcategoryId, setSubcategoryId] = useState(item?.subcategoryId ?? '');
    const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
    const [inStock, setInStock] = useState(item?.inStock ?? true);
    const [archived, setArchived] = useState(item?.archived ?? false);
    const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? []);
    const [activeDays, setActiveDays] = useState<string[]>(item?.availableDays ?? DAYS);
    const [showGlbNotice, setShowGlbNotice] = useState(false);
    const [variants, setVariants] = useState(
        item?.variants?.map((v) => ({
            id: v.id || newRowId(),
            name: v.name || '',
            price: v.price?.toString() || '',
        })) ?? []
    );
    const [modifierGroups, setModifierGroups] = useState(
        item?.modifierGroups?.map((group) => ({
            id: group.id || newRowId(),
            name: group.name || '',
            required: !!group.required,
            options: (group.options || []).map((opt: any) => ({
                id: opt.id || newRowId(),
                name: opt.name || '',
                price: opt.price?.toString() || '',
            })),
        })) ?? []
    );
    const [ingredients, setIngredients] = useState<string[]>(item?.ingredients ?? []);
    const [availableFrom, setAvailableFrom] = useState(item?.availableFrom ?? '');
    const [availableTo, setAvailableTo] = useState(item?.availableTo ?? '');
    const [isImproving, setIsImproving] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    const handleAiImprove = () => {
        if (!name.trim() || isImproving) return;
        setIsImproving(true);

        // Simulate an API call
        setTimeout(() => {
            const adjectives = ['Mouth-watering', 'Sizzling', 'Deliciously crafted', 'Signature', 'Premium', 'Artisan'];
            const descriptors = ['perfectly balanced', 'rich in flavor', 'prepared to perfection', 'satisfyingly crisp'];
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const desc = descriptors[Math.floor(Math.random() * descriptors.length)];

            let improvedDesc = `${adj} ${name}, ${desc}.`;
            if (ingredients.length > 0) {
                improvedDesc += ` Made with ${ingredients.slice(0, 3).join(', ')}.`;
            } else if (allergens.length > 0) {
                improvedDesc += ` A carefully prepared dish (Contains: ${allergens.join(', ')}).`;
            }

            setDescription(improvedDesc);
            setIsImproving(false);
        }, 800);
    };

    const canSubmit = name.trim() && price.trim() && categoryId;

    const toggleAllergen = (a: string) => {
        setAllergens((prev) =>
            prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
        );
    };

    const toggleDay = (d: string) => {
        setActiveDays((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
        );
    };

    const addVariant = () =>
        setVariants((prev) => [...prev, { id: newRowId(), name: '', price: '' }]);

    const updateVariant = (id: string, field: 'name' | 'price', value: string) =>
        setVariants((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
        );

    const removeVariant = (id: string) =>
        setVariants((prev) => prev.filter((v) => v.id !== id));

    const addModifierGroup = () =>
        setModifierGroups((prev) => [
            ...prev,
            { id: newRowId(), name: '', required: false, options: [] },
        ]);

    const updateModifierGroup = (
        groupId: string,
        field: 'name' | 'required',
        value: string | boolean
    ) =>
        setModifierGroups((prev) =>
            prev.map((group) =>
                group.id === groupId ? { ...group, [field]: value } : group
            )
        );

    const removeModifierGroup = (groupId: string) =>
        setModifierGroups((prev) => prev.filter((group) => group.id !== groupId));

    const addModifierOption = (groupId: string) =>
        setModifierGroups((prev) =>
            prev.map((group) =>
                group.id === groupId
                    ? {
                        ...group,
                        options: [...group.options, { id: newRowId(), name: '', price: '' }],
                    }
                    : group
            )
        );

    const updateModifierOption = (
        groupId: string,
        optionId: string,
        field: 'name' | 'price',
        value: string
    ) =>
        setModifierGroups((prev) =>
            prev.map((group) =>
                group.id === groupId
                    ? {
                        ...group,
                        options: group.options.map((option: any) =>
                            option.id === optionId ? { ...option, [field]: value } : option
                        ),
                    }
                    : group
            )
        );

    const removeModifierOption = (groupId: string, optionId: string) =>
        setModifierGroups((prev) =>
            prev.map((group) =>
                group.id === groupId
                    ? {
                        ...group,
                        options: group.options.filter((option: any) => option.id !== optionId),
                    }
                    : group
            )
        );

    const addIngredient = () => setIngredients((prev) => [...prev, '']);

    const updateIngredient = (index: number, value: string) =>
        setIngredients((prev) => prev.map((ing, i) => (i === index ? value : ing)));

    const removeIngredient = (index: number) =>
        setIngredients((prev) => prev.filter((_, i) => i !== index));

    const handleImageUpload = (file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const next = typeof reader.result === 'string' ? reader.result : '';
            setImage(next);
        };
        reader.readAsDataURL(file);
    };

    const filteredSubcats = (state.subcategories || []).filter(
        (s) => s.categoryGroupId === categoryId
    );

    const handleSubmit = () => {
        if (!canSubmit) return;

        const catName = state.categories.find((c) => c.id === categoryId)?.name || '';
        const normalizedVariants = variants
            .filter((v) => v.name.trim() && v.price.trim())
            .map((v) => ({
                id: v.id,
                name: v.name.trim(),
                price: parseFloat(v.price),
            }));
        const normalizedModifierGroups = modifierGroups
            .filter((group) => group.name.trim())
            .map((group) => ({
                id: group.id,
                name: group.name.trim(),
                required: group.required,
                options: group.options
                    .filter((option: any) => option.name.trim())
                    .map((option: any) => ({
                        id: option.id,
                        name: option.name.trim(),
                        price: option.price.trim() ? parseFloat(option.price) : undefined,
                    })),
            }))
            .filter((group) => group.options.length > 0);
        const normalizedIngredients = ingredients
            .map((ing) => ing.trim())
            .filter((ing) => !!ing);

        if (isEdit && item) {
            dispatch({
                type: 'UPDATE_ITEM',
                payload: {
                    id: item.id,
                    updates: {
                        name: name.trim(),
                        description: description.trim(),
                        price: parseFloat(price),
                        calories: calories ? parseInt(calories) : undefined,
                        image,
                        categoryId,
                        subcategoryId: subcategoryId || undefined,
                        isVeg,
                        inStock,
                        archived,
                        allergens,
                        categoryGroup: catName,
                        variants: normalizedVariants,
                        modifierGroups: normalizedModifierGroups,
                        ingredients: normalizedIngredients,
                        availableDays: activeDays,
                        availableFrom: availableFrom || undefined,
                        availableTo: availableTo || undefined,
                    },
                },
            });
        } else {
            dispatch({
                type: 'ADD_ITEM',
                payload: {
                    id: newId(),
                    name: name.trim(),
                    description: description.trim(),
                    price: parseFloat(price),
                    calories: calories ? parseInt(calories) : undefined,
                    image:
                        image ||
                        '/landing/photo-1546069901-ba9599a7e63c-079676da.webp',
                    categoryId,
                    subcategoryId: subcategoryId || undefined,
                    isVeg,
                    inStock,
                    archived: false,
                    allergens,
                    categoryGroup: catName,
                    variants: normalizedVariants,
                    modifierGroups: normalizedModifierGroups,
                    ingredients: normalizedIngredients,
                    availableDays: activeDays,
                    availableFrom: availableFrom || undefined,
                    availableTo: availableTo || undefined,
                },
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-stretch justify-end bg-black/30 backdrop-blur-sm">
            {/* Backdrop click */}
            <div className="flex-1" onClick={onClose} />

            {/* Panel */}
            <div
                className="relative flex w-full max-w-[720px] flex-col overflow-hidden bg-white shadow-2xl"
                style={{ animation: 'slideInRight 0.3s ease-out' }}
            >
                {/* ── Header ─────────────────────────────── */}
                <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900">
                            {isEdit ? 'Edit Product' : 'Create Product'}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Configure details, pricing, and assets.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Veg/Non-Veg Toggle */}
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-xs font-semibold ${isVeg ? 'text-gray-700' : 'text-gray-400'}`}
                            >
                                Veg
                            </span>
                            <button
                                onClick={() => setIsVeg(!isVeg)}
                                className={`relative h-7 w-12 rounded-full transition-colors ${isVeg ? 'bg-emerald-500' : 'bg-red-500'}`}
                            >
                                <div
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${isVeg ? 'left-1' : 'left-6'}`}
                                />
                            </button>
                            <span
                                className={`text-xs font-semibold ${!isVeg ? 'text-gray-700' : 'text-gray-400'}`}
                            >
                                Non-Veg
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs ────────────────────────────────── */}
                <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative shrink-0 whitespace-nowrap px-3 py-3.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeTab === tab
                                ? 'text-[#D9A016]'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFC529]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ─────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                    {/* ━━━ GENERAL INFO ━━━ */}
                    {activeTab === 'General Info' && (
                        <div className="p-8">
                            <div className="flex gap-8">
                                <div className="flex-1">
                                    {/* Product Name */}
                                    <div className="mb-6">
                                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                            Product Name
                                        </label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full border-b-2 border-gray-200 bg-transparent pb-2 text-xl font-semibold text-gray-900 placeholder:text-gray-300 focus:border-[#FFC529] focus:outline-none transition-colors"
                                            placeholder="e.g. Signature Truffle Burger"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="mb-6">
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                                Description
                                            </label>
                                            <button
                                                onClick={handleAiImprove}
                                                disabled={isImproving || !name.trim()}
                                                className="flex items-center gap-1.5 rounded-lg border border-[#FFC529]/30 bg-[#FFC529]/10 px-3 py-1.5 text-[11px] font-bold text-[#D9A016] hover:bg-[#FFC529]/20 transition-colors disabled:opacity-50"
                                            >
                                                <Sparkles className={`h-3 w-3 ${isImproving ? 'animate-spin' : ''}`} />
                                                {isImproving ? 'GENERATING...' : 'AI IMPROVE'}
                                            </button>
                                        </div>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20 resize-y"
                                            placeholder="Describe taste, texture, and presentation..."
                                        />
                                    </div>
                                </div>

                                {/* Allergen Matrix */}
                                <div className="w-[280px] shrink-0">
                                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                                        <div className="mb-4 flex items-center gap-2">
                                            <Info className="h-4 w-4 text-gray-400" />
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                                Allergen Matrix
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {ALLERGENS.map((a) => {
                                                const active = allergens.includes(a);
                                                return (
                                                    <button
                                                        key={a}
                                                        onClick={() => toggleAllergen(a)}
                                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${active
                                                            ? 'border-[#FFC529]/40 bg-[#FFC529]/10 text-[#D9A016]'
                                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div
                                                            className={`h-2 w-2 rounded-full ${active ? 'bg-[#FFC529]' : 'bg-gray-300'}`}
                                                        />
                                                        {a}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Base Price + Calories */}
                            <div className="mt-6 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        Base Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                                        placeholder="₹"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        Calories (kcal)
                                    </label>
                                    <input
                                        type="number"
                                        value={calories}
                                        onChange={(e) => setCalories(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20"
                                        placeholder="e.g. 320"
                                    />
                                </div>
                            </div>

                            {/* Category Group + Subcategory */}
                            <div className="mt-6 grid grid-cols-2 gap-6">
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        Category Group
                                    </label>
                                    <select
                                        value={categoryId}
                                        onChange={(e) => {
                                            setCategoryId(e.target.value);
                                            setSubcategoryId('');
                                        }}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20 appearance-none cursor-pointer"
                                    >
                                        {state.categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        Subcategory
                                    </label>
                                    <select
                                        value={subcategoryId}
                                        onChange={(e) => setSubcategoryId(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-[#FFC529] focus:outline-none focus:ring-1 focus:ring-[#FFC529]/20 appearance-none cursor-pointer"
                                    >
                                        <option value="">None</option>
                                        {filteredSubcats.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Specials */}
                            <div className="mt-8">
                                <div className="rounded-xl bg-gradient-to-r from-[#FFC529]/15 to-[#FFC529]/5 px-5 py-3">
                                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#D9A016]">
                                        Specials
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ━━━ VARIANTS & PRICE ━━━ */}
                    {activeTab === 'Variants & Price' && (
                        <div className="p-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900">Serving Tiers</h3>
                                <button
                                    onClick={addVariant}
                                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Variant
                                </button>
                            </div>
                            {variants.length === 0 ? (
                                <div className="mt-12 flex flex-col items-center justify-center text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                        <UtensilsCrossed className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">No variants configured yet.</p>
                                    <p className="mt-1 text-xs text-gray-300">Add serving sizes like Regular, Large, Family, etc.</p>
                                </div>
                            ) : (
                                <div className="mt-6 space-y-3">
                                    {variants.map((variant) => (
                                        <div key={variant.id} className="grid grid-cols-[1fr_140px_auto] gap-3 rounded-xl border border-gray-200 bg-white p-3">
                                            <input
                                                value={variant.name}
                                                onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                                placeholder="Variant name (e.g. Large)"
                                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                                                placeholder="Price"
                                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                            />
                                            <button
                                                onClick={() => removeVariant(variant.id)}
                                                className="rounded-lg border border-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ━━━ MODIFIERS & COMBOS ━━━ */}
                    {activeTab === 'Modifiers & Combos' && (
                        <div className="p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Modifier Groups</h3>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Use as add-ons or combo choices. Enforced at checkout/order add.
                                    </p>
                                </div>
                                <button
                                    onClick={addModifierGroup}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-black transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Group
                                </button>
                            </div>
                            {modifierGroups.length === 0 ? (
                                <div className="mt-12 flex flex-col items-center justify-center text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                        <UtensilsCrossed className="h-6 w-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-400">No modifier groups yet.</p>
                                    <p className="mt-1 text-xs text-gray-300">Create groups like "Extra Toppings", "Sides", etc.</p>
                                </div>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    {modifierGroups.map((group) => (
                                        <div key={group.id} className="rounded-xl border border-gray-200 bg-white p-4">
                                            <div className="mb-3 flex items-center gap-3">
                                                <input
                                                    value={group.name}
                                                    onChange={(e) => updateModifierGroup(group.id, 'name', e.target.value)}
                                                    placeholder="Group name (e.g. Extra Toppings)"
                                                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                                />
                                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={group.required}
                                                        onChange={(e) =>
                                                            updateModifierGroup(group.id, 'required', e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-[#FFC529]"
                                                    />
                                                    Required
                                                </label>
                                                <button
                                                    onClick={() => removeModifierGroup(group.id)}
                                                    className="rounded-lg border border-rose-100 px-2.5 py-2 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {group.options.map((option: any) => (
                                                    <div key={option.id} className="grid grid-cols-[1fr_130px_auto] gap-2">
                                                        <input
                                                            value={option.name}
                                                            onChange={(e) =>
                                                                updateModifierOption(group.id, option.id, 'name', e.target.value)
                                                            }
                                                            placeholder="Option name"
                                                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={option.price}
                                                            onChange={(e) =>
                                                                updateModifierOption(group.id, option.id, 'price', e.target.value)
                                                            }
                                                            placeholder="Add-on price"
                                                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => removeModifierOption(group.id, option.id)}
                                                            className="rounded-lg border border-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => addModifierOption(group.id)}
                                                className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ━━━ MEDIA & 3D ━━━ */}
                    {activeTab === 'Media & 3D' && (
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Display Image */}
                                <div>
                                    <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        Display Image
                                    </label>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e.target.files?.[0])}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className="flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-[#F9FAFB] transition-colors hover:border-[#FFC529]/40 hover:bg-[#FFC529]/5"
                                    >
                                        <Upload className="mb-2 h-6 w-6 text-gray-400" />
                                        <span className="text-sm font-semibold text-gray-700">
                                            {image ? 'Replace Image' : 'Upload JPG/PNG'}
                                        </span>
                                    </button>
                                    <div className="mt-3 space-y-3">
                                        {image && (
                                            <img
                                                src={image}
                                                alt="Product preview"
                                                className="h-36 w-full rounded-xl border border-gray-200 object-cover"
                                            />
                                        )}
                                        <input
                                            value={image}
                                            onChange={(e) => setImage(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 focus:border-[#FFC529] focus:outline-none"
                                            placeholder="Image URL..."
                                        />
                                    </div>
                                </div>

                                {/* GLB Upload */}
                                <div>
                                    <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-[#D9A016]">
                                        3D Asset (.GLB)
                                    </label>
                                    <button
                                        onClick={() => setShowGlbNotice(true)}
                                        className="flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-[#F9FAFB] transition-colors hover:border-[#FFC529]/40 hover:bg-[#FFC529]/5"
                                    >
                                        <Box className="mb-2 h-6 w-6 text-[#D9A016]/60" />
                                        <span className="text-sm font-semibold text-[#D9A016]">Upload GLB for AR</span>
                                    </button>
                                </div>
                            </div>

                            {/* GLB Not Available Notice */}
                            {showGlbNotice && (
                                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#FFC529]/30 bg-[#FFC529]/5 p-4">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D9A016]" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Not available for demo</p>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            GLB 3D asset upload and AR preview are available in the full QRAVE dashboard.
                                            Schedule a demo to experience the complete 3D menu feature.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowGlbNotice(false)}
                                        className="ml-auto shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ━━━ INGREDIENTS ━━━ */}
                    {activeTab === 'Ingredients' && (
                        <div className="p-8">
                            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#FFC529]/10 to-transparent px-5 py-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Structured Ingredients</h3>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                        Define components for accurate tracking and costing.
                                    </p>
                                </div>
                                <button
                                    onClick={addIngredient}
                                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-black transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Ingredient
                                </button>
                            </div>

                            {ingredients.length === 0 ? (
                                <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                                    <UtensilsCrossed className="mb-3 h-8 w-8 text-gray-300" />
                                    <p className="text-sm font-medium text-gray-400">No ingredients listed yet.</p>
                                </div>
                            ) : (
                                <div className="mt-6 space-y-2">
                                    {ingredients.map((ingredient, index) => (
                                        <div key={`${index}-${ingredient}`} className="grid grid-cols-[1fr_auto] gap-2">
                                            <input
                                                value={ingredient}
                                                onChange={(e) => updateIngredient(index, e.target.value)}
                                                placeholder="Ingredient name"
                                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                            />
                                            <button
                                                onClick={() => removeIngredient(index)}
                                                className="rounded-lg border border-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ━━━ AVAILABILITY ━━━ */}
                    {activeTab === 'Availability' && (
                        <div className="p-8">
                            {/* Stock Status */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    Stock Status
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            {inStock ? 'Available to Order' : 'Out of Stock'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            Disable ordering without archiving the item.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setInStock(!inStock)}
                                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${inStock
                                            ? 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                            }`}
                                    >
                                        {inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                                    </button>
                                </div>
                            </div>

                            {/* Weekly Availability */}
                            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
                                <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    <Calendar className="h-4 w-4" />
                                    Weekly Availability
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map((day) => {
                                        const active = activeDays.includes(day);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(day)}
                                                className={`rounded-xl px-5 py-3 text-xs font-extrabold tracking-wider transition-all ${active
                                                    ? 'bg-gradient-to-b from-[#FFC529] to-[#F0B820] text-white shadow-lg shadow-[#FFC529]/25'
                                                    : 'border border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={availableFrom}
                                            onChange={(e) => setAvailableFrom(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={availableTo}
                                            onChange={(e) => setAvailableTo(e.target.value)}
                                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-[#FFC529] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────── */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (isEdit && item) {
                                    const nextArchived = !archived;
                                    dispatch({
                                        type: 'UPDATE_ITEM',
                                        payload: { id: item.id, updates: { archived: nextArchived } },
                                    });
                                    setArchived(nextArchived);
                                }
                                onClose();
                            }}
                            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            {archived ? 'Unarchive Product' : 'Archive Product'}
                        </button>
                        {isEdit && item && (
                            <button
                                onClick={() => {
                                    dispatch({ type: 'DELETE_ITEM', payload: item.id });
                                    onClose();
                                }}
                                className="flex items-center gap-2 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Item
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Slide-in animation */}
            <style>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div >
    );
}
