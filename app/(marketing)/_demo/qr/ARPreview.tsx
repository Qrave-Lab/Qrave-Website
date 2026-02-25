import { useState } from 'react';
import { useMenu } from '../../_context/MenuContext';
import { X, Camera, RotateCcw, Maximize2, Circle } from 'lucide-react';

interface ARPreviewProps {
    onClose: () => void;
    initialItemId?: string;
}

export default function ARPreview({ onClose, initialItemId }: ARPreviewProps) {
    const { state } = useMenu();
    const previewItems = state.items.filter((i) => i.inStock && !i.archived);
    const [selectedItemId, setSelectedItemId] = useState(
        initialItemId || previewItems[0]?.id || ''
    );
    const [placed, setPlaced] = useState(false);

    const selectedItem = previewItems.find((i) => i.id === selectedItemId);

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white">
            {/* Camera background simulation */}
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className="h-full w-full"
                    style={{
                        background:
                            'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 30%, #e2e8f0 60%, #cbd5e1 100%)',
                    }}
                />
                {/* Simulated surface/table */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[45%]"
                    style={{
                        background:
                            'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.05) 100%)',
                        transform: 'perspective(800px) rotateX(5deg)',
                        transformOrigin: 'bottom center',
                    }}
                >
                    {/* Grid lines for AR effect */}
                    <div className="h-full w-full opacity-40"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(217,160,22,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(217,160,22,0.1) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                </div>
            </div>

            {/* AR UI Overlay */}
            <div className="relative z-10 flex flex-1 flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-full bg-white/80 p-2.5 backdrop-blur-xl border border-gray-200 shadow-sm"
                    >
                        <X className="h-5 w-5 text-gray-900" />
                    </button>
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 backdrop-blur-xl border border-gray-200 shadow-sm">
                        <Camera className="h-4 w-4 text-[#D9A016]" />
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">AR Preview</span>
                    </div>
                    <button className="rounded-full bg-white/80 p-2.5 backdrop-blur-xl border border-gray-200 shadow-sm">
                        <Maximize2 className="h-5 w-5 text-gray-900" />
                    </button>
                </div>

                {/* Center - AR Food */}
                <div className="flex flex-1 items-center justify-center">
                    {selectedItem && placed ? (
                        <div className="animate-in relative">
                            {/* Shadow */}
                            <div
                                className="absolute -bottom-4 left-1/2 h-6 w-48 -translate-x-1/2 rounded-full opacity-20 blur-xl"
                                style={{ backgroundColor: '#D9A016' }}
                            />
                            {/* Food image */}
                            <div
                                className="relative"
                                style={{
                                    animation: 'float 3s ease-in-out infinite',
                                }}
                            >
                                <img
                                    src={selectedItem.image}
                                    alt={selectedItem.name}
                                    className="h-56 w-56 rounded-3xl object-cover shadow-2xl"
                                    style={{
                                        transform: 'perspective(600px) rotateX(10deg) rotateY(-5deg)',
                                        boxShadow:
                                            '0 40px 80px rgba(0,0,0,0.15), 0 0 20px rgba(217,160,22,0.1)',
                                    }}
                                />
                                {/* Item info overlay */}
                                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white/90 px-6 py-3 text-center backdrop-blur-xl shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <Circle
                                            className={`h-2.5 w-2.5 fill-current ${selectedItem.isVeg ? 'text-emerald-500' : 'text-rose-500'
                                                }`}
                                        />
                                        <h3 className="text-sm font-bold text-gray-900">
                                            {selectedItem.name}
                                        </h3>
                                    </div>
                                    <p className="mt-0.5 text-lg font-black text-[#D9A016]">
                                        ₹{selectedItem.price}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            {/* Scanning animation */}
                            <div className="relative mx-auto h-48 w-48">
                                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[#FFC529]/30 animate-pulse" />
                                <div
                                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FFC529] to-transparent shadow-[0_0_15px_rgba(255,197,41,0.5)]"
                                    style={{
                                        animation: 'scanLine 2s ease-in-out infinite',
                                        top: '50%',
                                    }}
                                />
                            </div>
                            <p className="mt-6 text-sm font-bold text-gray-700 uppercase tracking-tight">
                                Tap a food item below to place it
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400 font-medium">
                                Point your camera at a flat surface
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom: Item selector */}
                <div className="border-t border-gray-200 bg-white/80 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    {placed && (
                        <div className="flex justify-center gap-4 px-5 pt-3">
                            <button
                                onClick={() => setPlaced(false)}
                                className="flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200"
                            >
                                <RotateCcw className="h-3 w-3" /> Reset Position
                            </button>
                        </div>
                    )}
                    <div className="flex gap-3 overflow-x-auto px-5 py-4 scrollbar-hide">
                        {previewItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setSelectedItemId(item.id);
                                    setPlaced(true);
                                }}
                                className={`flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${selectedItemId === item.id && placed
                                    ? 'border-[#FFC529] shadow-lg shadow-[#FFC529]/20'
                                    : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200'
                                    }`}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-16 w-16 object-cover"
                                />
                                <div className="bg-white px-2 py-1 border-t border-gray-50">
                                    <p className="truncate text-[10px] font-bold text-gray-700 w-14">
                                        {item.name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Keyframes */}
            <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.3; }
          50% { top: 85%; opacity: 1; }
        }
        .animate-in {
          animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes popIn {
          0% { transform: scale(0.3) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
