import { Smartphone } from 'lucide-react';

interface MobilePreviewProps {
    previewUrl: string;
}

export default function MobilePreview({ previewUrl }: MobilePreviewProps) {
    return (
        <div className="flex h-full flex-col items-center justify-start p-6">
            <div className="mb-4 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Live Preview
                </h3>
            </div>

            {/* Phone Frame */}
            <div className="relative mx-auto w-[280px]">
                {/* Phone outer shell */}
                <div className="rounded-[40px] border-[4px] border-gray-200 bg-white p-2 shadow-2xl shadow-black/5 ring-1 ring-black/5">
                    {/* Speaker/Sensors */}
                    <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-100" />

                    {/* Screen */}
                    <div className="overflow-hidden rounded-[32px] bg-gray-50 border border-gray-100 aspect-[420/760]">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Menu Preview"
                                className="w-full h-full object-contain bg-white"
                                style={{ imageRendering: 'auto' }}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Syncing...</p>
                            </div>
                        )}
                    </div>

                    {/* Home indicator */}
                    <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-gray-100" />
                </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-gray-400">
                Preview updates automatically as you edit the canvas
            </p>
        </div>
    );
}
