import type { MenuItem } from '../../types/menu';
import { Edit3, ImageIcon } from 'lucide-react';

interface ItemCardProps {
    item: MenuItem;
    categoryBreadcrumb: string;
    selected: boolean;
    onToggleSelect: () => void;
    onToggleStock: () => void;
    onEdit: () => void;
}

export default function ItemCard({
    item,
    categoryBreadcrumb,
    selected,
    onToggleSelect,
    onToggleStock,
    onEdit,
}: ItemCardProps) {
    const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price);

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:border-[#FFC529]/30 hover:shadow-xl hover:shadow-black/5">
            {/* Image */}
            <div className="relative h-44 overflow-hidden bg-gray-100">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                        <ImageIcon className="h-10 w-10" />
                    </div>
                )}

                {/* Checkbox overlay */}
                <div className="absolute left-3 top-3">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggleSelect}
                        className="h-4 w-4 rounded border-gray-300 bg-white/80 text-[#FFC529] backdrop-blur-sm focus:ring-[#FFC529]/20 cursor-pointer"
                    />
                </div>

                {/* Edit icon */}
                <button
                    onClick={onEdit}
                    className="absolute right-3 top-3 rounded-lg bg-white/90 p-2 text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-[#D9A016] hover:shadow-md"
                >
                    <Edit3 className="h-3.5 w-3.5" />
                </button>

                {/* Veg/Non-veg indicator */}
                <div className="absolute bottom-3 left-3">
                    <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm backdrop-blur-sm ${item.isVeg
                                ? 'border-emerald-400 bg-emerald-50/90'
                                : 'border-red-400 bg-red-50/90'
                            }`}
                    >
                        <div
                            className={`h-2.5 w-2.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{item.name}</h3>
                    <span className="ml-2 shrink-0 text-sm font-extrabold text-gray-900">
                        {formatPrice(item.price)}
                    </span>
                </div>
                <p className="mb-3 line-clamp-1 text-xs leading-relaxed text-gray-400">
                    {item.description || 'No description provided.'}
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {categoryBreadcrumb}
                    </span>
                    <button
                        type="button"
                        onClick={onToggleStock}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.inStock
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                            }`}
                    >
                        {item.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                    </button>
                </div>
            </div>
        </div>
    );
}
