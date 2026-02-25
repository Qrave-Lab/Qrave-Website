import { useRef } from 'react';
import { useMenu } from '../../_context/MenuContext';
import { Palette, Type, Wifi, ImagePlus, X } from 'lucide-react';

const frameStyles = [
    { value: 'none' as const, label: 'None', icon: '□' },
    { value: 'rounded' as const, label: 'Rounded', icon: '▢' },
    { value: 'circle' as const, label: 'Circle', icon: '○' },
    { value: 'badge' as const, label: 'Badge', icon: '◈' },
];

const presetColors = [
    '#1A1A1A', '#000000', '#1a1a2e', '#0d1117',
    '#FFC529', '#EF4444', '#3B82F6', '#22C55E',
    '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
];

export default function QRCustomizer() {
    const { state, dispatch } = useMenu();
    const { qrConfig } = state;
    const backgroundInputRef = useRef<HTMLInputElement>(null);

    const update = (updates: Partial<typeof qrConfig>) => {
        dispatch({ type: 'UPDATE_QR_CONFIG', payload: updates });
    };

    const handleBackgroundUpload = (file?: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const imageData = typeof reader.result === 'string' ? reader.result : '';
            update({ backgroundImageUrl: imageData });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#D9A016]" />
                <h3 className="text-sm font-bold text-gray-900">QR Customization</h3>
            </div>

            {/* Foreground Color */}
            <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    QR Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                    {presetColors.map((c) => (
                        <button
                            key={c}
                            onClick={() => update({ fgColor: c })}
                            className={`h-8 rounded-lg border transition-transform hover:scale-110 shadow-sm ${qrConfig.fgColor === c
                                ? 'border-[#FFC529] ring-2 ring-[#FFC529]/20'
                                : 'border-gray-100'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <input
                        type="color"
                        value={qrConfig.fgColor}
                        onChange={(e) => update({ fgColor: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-transparent"
                    />
                    <input
                        value={qrConfig.fgColor}
                        onChange={(e) => update({ fgColor: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#FFC529]"
                    />
                </div>
            </div>

            {/* Background Color */}
            <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Background Color
                </label>
                <div className="flex gap-2">
                    {['#FFFFFF', '#F9FAFB', '#F3F4F6', '#FFF8E7', '#111827', '#000000'].map((c) => (
                        <button
                            key={c}
                            onClick={() => update({ bgColor: c })}
                            className={`h-8 w-8 rounded-lg border transition-transform hover:scale-110 shadow-sm ${qrConfig.bgColor === c
                                ? 'border-[#FFC529] ring-2 ring-[#FFC529]/20'
                                : 'border-gray-100'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <input
                        type="color"
                        value={qrConfig.bgColor}
                        onChange={(e) => update({ bgColor: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-transparent"
                    />
                    <input
                        value={qrConfig.bgColor}
                        onChange={(e) => update({ bgColor: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#FFC529]"
                    />
                </div>
            </div>

            {/* Background Image */}
            <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Background Image
                </label>
                <input
                    ref={backgroundInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBackgroundUpload(e.target.files?.[0])}
                />
                {qrConfig.backgroundImageUrl ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-2">
                        <img
                            src={qrConfig.backgroundImageUrl}
                            alt="Background preview"
                            className="h-28 w-full rounded-lg object-cover"
                        />
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                onClick={() => backgroundInputRef.current?.click()}
                                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                Replace Image
                            </button>
                            <button
                                type="button"
                                onClick={() => update({ backgroundImageUrl: '' })}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => backgroundInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-500 hover:bg-gray-100"
                    >
                        <ImagePlus className="h-4 w-4" />
                        Click to upload image
                    </button>
                )}
            </div>

            {/* Frame Style */}
            <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Frame Style
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {frameStyles.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => update({ frameStyle: f.value })}
                            className={`rounded-xl border px-3 py-3 text-center transition-all ${qrConfig.frameStyle === f.value
                                ? 'border-[#FFC529] bg-[#FFC529]/10 text-[#D9A016] shadow-sm'
                                : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            <span className="block text-lg">{f.icon}</span>
                            <span className="mt-1 block text-[10px] font-bold uppercase tracking-tight">{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Text Below */}
            <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Scan Button Text
                </label>
                <input
                    value={qrConfig.textBelow}
                    onChange={(e) => update({ textBelow: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#FFC529]"
                    placeholder="SCAN ME"
                />
            </div>

            {/* Text & Content */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">Text & Content</h4>
                </div>
                <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Main Headline
                    </label>
                    <input
                        value={qrConfig.headline || ''}
                        onChange={(e) => update({ headline: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#FFC529]"
                        placeholder="Scan to Order"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Sub-headline
                    </label>
                    <textarea
                        value={qrConfig.subHeadline || ''}
                        onChange={(e) => update({ subHeadline: e.target.value })}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#FFC529]"
                        placeholder="View menu, order & pay from your phone."
                    />
                </div>
            </div>

            {/* Wi-Fi Details */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-gray-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">Wi-Fi Details (Optional)</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        value={qrConfig.wifiName || ''}
                        onChange={(e) => update({ wifiName: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#FFC529]"
                        placeholder="Network Name"
                    />
                    <input
                        value={qrConfig.wifiPassword || ''}
                        onChange={(e) => update({ wifiPassword: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#FFC529]"
                        placeholder="Password"
                    />
                </div>
            </div>

            {/* Size */}
            <div>
                <label className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>QR Size</span>
                    <span className="text-gray-600">{qrConfig.size}px</span>
                </label>
                <input
                    type="range"
                    min="160"
                    max="400"
                    step="20"
                    value={qrConfig.size}
                    onChange={(e) => update({ size: parseInt(e.target.value) })}
                    className="w-full accent-[#FFC529]"
                />
            </div>
        </div>
    );
}
