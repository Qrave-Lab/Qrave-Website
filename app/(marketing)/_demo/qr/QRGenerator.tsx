import { QRCodeSVG } from 'qrcode.react';
import { Wifi } from 'lucide-react';
import { useMenu } from '../../_context/MenuContext';
import QRCustomizer from './QRCustomizer';

export default function QRGenerator() {
    const { state } = useMenu();

    const slug = state.restaurant.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const menuUrl = `${window.location.origin}/menu/${slug}`;

    return (
        <div className="flex h-full flex-col lg:flex-row">
            {/* Left: Customizer */}
            <div className="border-b border-gray-200 lg:w-[380px] lg:border-b-0 lg:border-r bg-white overflow-y-auto">
                <QRCustomizer />
            </div>

            {/* Right: Preview */}
            <div
                className="flex-1 overflow-y-auto bg-[#F3F4F6] p-6"
                style={
                    state.qrConfig.backgroundImageUrl
                        ? {
                            backgroundImage: `linear-gradient(rgba(243,244,246,0.88), rgba(243,244,246,0.88)), url(${state.qrConfig.backgroundImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }
                        : undefined
                }
            >
                <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
                    <div className="w-full max-w-xl">
                        {/* QR Preview Card */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl shadow-black/5">
                            {/* Frame styles */}
                            <div
                                className={`mx-auto inline-block rounded-2xl p-6 ${state.qrConfig.frameStyle === 'circle'
                                    ? 'rounded-full'
                                    : state.qrConfig.frameStyle === 'badge'
                                        ? 'rounded-3xl border-4 border-[#FFC529]/30'
                                        : state.qrConfig.frameStyle === 'rounded'
                                            ? 'rounded-2xl border-2 border-gray-100'
                                            : ''
                                    }`}
                                style={{ backgroundColor: state.qrConfig.bgColor }}
                            >
                                <QRCodeSVG
                                    id="qr-code-svg"
                                    value={menuUrl}
                                    size={state.qrConfig.size}
                                    fgColor={state.qrConfig.fgColor}
                                    bgColor={state.qrConfig.bgColor}
                                    level="H"
                                    includeMargin={false}
                                    imageSettings={
                                        state.qrConfig.logoUrl
                                            ? {
                                                src: state.qrConfig.logoUrl,
                                                x: undefined,
                                                y: undefined,
                                                height: 40,
                                                width: 40,
                                                excavate: true,
                                            }
                                            : undefined
                                    }
                                />
                            </div>

                            {/* Text below QR */}
                            {(state.qrConfig.textBelow || 'SCAN ME') && (
                                <p className="mx-auto mt-4 inline-flex rounded-full bg-black px-6 py-2 text-sm font-bold tracking-wide text-white">
                                    {state.qrConfig.textBelow || 'SCAN ME'}
                                </p>
                            )}

                            {(state.qrConfig.wifiName || state.qrConfig.wifiPassword) && (
                                <div className="mt-5 flex justify-center">
                                    <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#F6F7F9] px-5 py-3">
                                        <div className="rounded-full bg-white p-2 text-gray-700">
                                            <Wifi className="h-4 w-4" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-600">
                                                Free Wi-Fi
                                            </p>
                                            <p className="leading-none">
                                                <span className="text-lg font-bold text-gray-900">
                                                    {state.qrConfig.wifiName || 'Network'}
                                                </span>
                                                <span className="px-1.5 text-gray-400">|</span>
                                                <span className="text-lg font-medium text-gray-500">
                                                    {state.qrConfig.wifiPassword || 'Password'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="mt-6 text-center">
                            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
                                {state.qrConfig.headline || 'Scan to Order'}
                            </h2>
                            <p className="mx-auto mt-3 max-w-md text-lg text-gray-500">
                                {state.qrConfig.subHeadline || 'View menu, order & pay from your phone.'}
                            </p>
                            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#374151]">
                                Scan this QR to view the interactive AR menu experience.
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
