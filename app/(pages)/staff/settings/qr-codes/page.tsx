"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  ChevronDown,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Type,
  Wifi,
  Layout,
  ArrowLeft,
  Check,
  Trash2,
  RefreshCw,
  Smartphone
} from "lucide-react";
import { api } from "@/app/lib/api";



type Table = {
  id: string;
  table_number: number;
  is_enabled: boolean;
  zone?: string | null;
};

const getTableLabel = (table: Table) =>
  table.table_number.toString().padStart(2, "0");


const getTableUrl = (table: Table | null, restaurantId?: string) => {
  if (!table || typeof window === "undefined") return "";
  const origin = window.location.origin;
  const base = `${origin}/menu/t/${table.table_number}`;
  return restaurantId ? `${base}?restaurant=${restaurantId}` : base;
};



const templates = [
  { id: "modern", name: "Clean Minimal", class: "bg-white text-gray-900" },
  { id: "dark", name: "Midnight Luxury", class: "bg-gray-950 text-white" },
  { id: "framed", name: "Bold Frame", class: "bg-white text-gray-900 border-8" },
];

const fonts = [
  { id: "sans", name: "Modern Sans", class: "font-sans" },
  { id: "serif", name: "Elegant Serif", class: "font-serif" },
  { id: "mono", name: "Industrial Mono", class: "font-mono" },
];

const brandColors = ["#000000", "#10B981", "#6366F1", "#F43F5E", "#F59E0B"];

export default function QrFlyerGenerator() {
  useEffect(() => {
  getTable();
}, []);

  
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<string | null>("design"); 

  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState<string>("");

  const getTable = async () => {
    const [tablesRes, me] = await Promise.all([
      api<Table[]>("/api/admin/tables", { method: "GET" }),
      api<{
        restaurant_id?: string;
        restaurantId?: string;
        restaurant?: string;
        logo_url?: string | null;
        logo_version?: number | null;
      }>("/api/admin/me", { method: "GET" }),
    ]);
    const next = Array.isArray(tablesRes) ? tablesRes : [];
    setTables(next);
    if (next.length > 0) {
      setSelectedTable(next[0]);
    }
    setRestaurantId(me?.restaurant_id || me?.restaurantId || "");
    setRestaurantName(me?.restaurant?.trim() || "Restaurant");
    const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
    setRestaurantLogoUrl(me?.logo_url ? `${me.logo_url}${suffix}` : "");
  };

  // Design State
  const [template, setTemplate] = useState("modern");
  const [activeFont, setActiveFont] = useState("sans");
  const [brandColor, setBrandColor] = useState("#000000");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(50); // % opacity for readability

  const [headline, setHeadline] = useState("Scan to Order");
  const [subheadline, setSubheadline] = useState("View menu, order & pay from your phone.");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");

  const handlePrint = () => window.print();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  if (!selectedTable) {
  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Loading tables…
    </div>
  );
}


  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      <style jsx global>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          body { background: white; }
          .no-print { display: none !important; }
          #printable-area { 
            display: flex !important;
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            align-items: center;
            justify-content: center;
            background: white;
          }
          #flyer-content {
            width: 100%;
            height: 100%;
            transform: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* --- Sidebar (Controls) --- */}
      <div className="no-print w-96 bg-white border-r border-gray-200 flex flex-col z-20 shadow-xl">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between shrink-0">
          <button onClick={() => router.push("/staff/settings")} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900">QR Flyer Builder</h1>
          <div className="w-5" /> {/* Spacer */}
        </div>

        {/* Scrollable Settings */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* 1. Target Table */}
          <div className="border-b border-gray-100">
            <button 
              onClick={() => toggleSection("target")}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center"><Check className="w-3 h-3" /></div>
                Target Table
              </div>
              {activeSection === "target" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            
            {activeSection === "target" && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-gray-500 mb-3">Select which table this QR code is for.</p>
                <div className="grid grid-cols-4 gap-2">
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm font-bold transition-all ${
                        selectedTable.id === t.id
                          ? "border-gray-900 bg-gray-900 text-white shadow-md transform scale-105"
                          : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                      }`}
                    >
                      <span>{getTableLabel(t)}</span>
                      <span className="text-[9px] font-normal opacity-70 truncate w-full text-center">
                        {t.zone || "Main"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Visual Design */}
          <div className="border-b border-gray-100">
            <button 
              onClick={() => toggleSection("design")}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                <div className="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center"><Layout className="w-3 h-3" /></div>
                Visual Design
              </div>
              {activeSection === "design" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {activeSection === "design" && (
              <div className="px-6 pb-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                
                {/* Template Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Layout Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        className={`px-2 py-2 text-xs font-medium rounded-md border transition-all ${
                          template === t.id ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Selection */}
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Typography</label>
                   <div className="flex rounded-md shadow-sm border border-gray-200 overflow-hidden">
                      {fonts.map(f => (
                         <button
                            key={f.id}
                            onClick={() => setActiveFont(f.id)}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${f.class} ${
                               activeFont === f.id ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                         >
                            Aa
                         </button>
                      ))}
                   </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Accent Color</label>
                  <div className="flex gap-3">
                    {brandColors.map(c => (
                      <button
                        key={c}
                        onClick={() => setBrandColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${brandColor === c ? 'ring-2 ring-offset-2 ring-gray-300' : ''}`}
                        style={{ backgroundColor: c, borderColor: brandColor === c ? "white" : "transparent" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Background Image & Opacity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Background Image</label>
                    {bgImage && (
                       <button onClick={() => setBgImage(null)} className="text-[10px] text-red-500 font-medium hover:underline flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Remove
                       </button>
                    )}
                  </div>
                  
                  {!bgImage ? (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors gap-2"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Click to upload image</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                       <div className="relative h-24 w-full rounded-lg overflow-hidden border border-gray-200">
                          <img src={bgImage} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/10" />
                       </div>
                       
                       {/* Opacity Slider */}
                       <div>
                          <div className="flex justify-between text-xs mb-1">
                             <span className="text-gray-500">Overlay Strength</span>
                             <span className="font-bold">{overlayOpacity}%</span>
                          </div>
                          <input 
                             type="range" min="0" max="90" 
                             value={overlayOpacity}
                             onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                             className="w-full accent-gray-900 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                       </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setBgImage)} />
                </div>

                {/* Logo Upload */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold text-gray-400 uppercase">Brand Logo</label>
                       {logoImage && (
                          <button onClick={() => setLogoImage(null)} className="text-[10px] text-red-500 font-medium hover:underline">Clear</button>
                       )}
                    </div>
                    <div className="flex items-center gap-3">
                       {logoImage ? (
                          <div className="w-12 h-12 border rounded-lg p-1 bg-white">
                             <img src={logoImage} className="w-full h-full object-contain" />
                          </div>
                       ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border border-gray-200">
                             <Upload className="w-4 h-4" />
                          </div>
                       )}
                       <button 
                          onClick={() => logoInputRef.current?.click()} 
                          className="text-xs bg-white border border-gray-300 px-3 py-2 rounded-md font-medium hover:bg-gray-50"
                       >
                          Choose File...
                       </button>
                       <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setLogoImage)} />
                    </div>
                 </div>

              </div>
            )}
          </div>

          {/* 3. Text & Content */}
          <div className="border-b border-gray-100">
            <button 
              onClick={() => toggleSection("content")}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center"><Type className="w-3 h-3" /></div>
                Text & Content
              </div>
              {activeSection === "content" ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {activeSection === "content" && (
               <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Main Headline</label>
                     <input 
                        value={headline} 
                        onChange={e => setHeadline(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Sub-Headline</label>
                     <textarea 
                        value={subheadline} 
                        onChange={e => setSubheadline(e.target.value)}
                        rows={2}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none resize-none"
                     />
                  </div>

                  {/* Wifi Details */}
                  <div className="pt-4 border-t border-gray-100">
                     <div className="flex items-center gap-2 mb-3">
                        <Wifi className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-900 uppercase">Wi-Fi Details (Optional)</span>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <input 
                           placeholder="Network Name"
                           value={wifiSsid} 
                           onChange={e => setWifiSsid(e.target.value)}
                           className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-gray-900 outline-none"
                        />
                        <input 
                           placeholder="Password"
                           value={wifiPass} 
                           onChange={e => setWifiPass(e.target.value)}
                           className="w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-gray-900 outline-none"
                        />
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handlePrint}
            className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Printer className="w-5 h-5" />
            Print Flyer
          </button>
        </div>
      </div>

      {/* --- Preview Area --- */}
      <div className="flex-1 bg-gray-100 relative flex items-center justify-center p-10 overflow-hidden">
        
        {/* Decorative Background for 'Desk' feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        {/* The Flyer Container (Scale it down slightly if on small screens) */}
        <div className="no-print absolute top-6 right-6 flex flex-col gap-2">
           <div className="bg-white px-3 py-1.5 rounded-full shadow text-xs font-bold text-gray-500 flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Live Preview
           </div>
        </div>
        
        <div className="shadow-2xl shadow-gray-400/50 transition-all duration-300 transform">
          
          {/* --- PRINTABLE CONTENT STARTS HERE --- */}
          <div 
             id="printable-area" 
             className="bg-white" 
             style={{ width: '148mm', height: '210mm' }} // A5 Dimensions
          >
            <div 
               id="flyer-content"
               className={`relative w-full h-full flex flex-col items-center text-center overflow-hidden transition-colors duration-500 ${
                  fonts.find(f => f.id === activeFont)?.class
               } ${
                  template === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
               }`}
            >
              
              {bgImage && (
                 <>
                   <img src={bgImage} className="absolute inset-0 w-full h-full object-cover z-0" />
                   {/* Smart Overlay for Readability */}
                   <div 
                      className="absolute inset-0 z-0 transition-colors duration-300"
                      style={{ 
                         backgroundColor: template === 'dark' ? '#000' : '#fff',
                         opacity: overlayOpacity / 100 
                      }} 
                   />
                 </>
              )}
              
              {template === 'framed' && (
                 <div className="absolute inset-4 border-4 z-10 pointer-events-none" style={{ borderColor: brandColor }}></div>
              )}

              {/* Main Content Z-Index ensure it's above background */}
              <div className="relative z-10 flex flex-col h-full w-full items-center p-12">
                
                {/* Header / Logo */}
                <div className="mb-8 mt-4 h-16 flex items-center justify-center">
                   {logoImage || restaurantLogoUrl ? (
                      <img src={logoImage || restaurantLogoUrl} className="h-full object-contain" />
                   ) : (
                      <h1 className="text-3xl font-black tracking-widest uppercase">{restaurantName}</h1>
                   )}
                </div>

                {/* Main QR Card */}
                <div 
                  className={`p-6 rounded-3xl shadow-xl mb-8 transition-all duration-300 ${
                     template === 'dark' ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white'
                  }`}
                  style={{ 
                     boxShadow: template === 'modern' ? `0 20px 40px -10px ${brandColor}40` : ''
                  }}
                >
                 {selectedTable && (
  <QRCodeSVG
    value={getTableUrl(selectedTable, restaurantId)}
    size={220}
    level="H"
    fgColor={template === "dark" ? "#ffffff" : "#000000"}
    bgColor="transparent"
  />
)}

                  
                  {/* Scan Me Badge */}
                  <div 
                     className="mt-4 py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
                     style={{ backgroundColor: brandColor, color: '#fff' }}
                  >
                     <Smartphone className="w-3 h-3" /> Scan Me
                  </div>
                </div>

                {/* Text Content */}
                <div className="max-w-[80%] space-y-3">
                  <h2 className="text-3xl font-bold leading-tight" style={{ color: template === 'modern' ? brandColor : 'inherit' }}>
                     {headline}
                  </h2>
                  <p className={`text-sm leading-relaxed ${template === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                     {subheadline}
                  </p>
                </div>

                {/* Footer Info */}
                <div className="mt-auto w-full space-y-6">
                   
                   {/* Wifi Badge (Conditional) */}
                   {(wifiSsid) && (
                      <div className={`mx-auto inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${
                         template === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                      }`}>
                         <Wifi className="w-4 h-4" />
                         <div className="text-left">
                            <div className="text-[10px] opacity-70 uppercase tracking-wide font-bold">Free Wi-Fi</div>
                            <div className="text-xs font-bold">{wifiSsid} {wifiPass && <span className="opacity-50 font-normal">| {wifiPass}</span>}</div>
                         </div>
                      </div>
                   )}

                   {/* Table Info */}
                   <div className="pt-6 border-t border-current border-opacity-10 flex justify-between items-end opacity-60">
                      <div className="text-left">
                         <div className="text-[10px] uppercase tracking-widest mb-1">Table Number</div>
                         <div className="text-3xl font-black">  {getTableLabel(selectedTable)}
</div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] uppercase tracking-widest mb-1">Zone</div>
                         <div className="text-sm font-bold">{selectedTable.zone}</div>
                      </div>
                   </div>
                </div>

              </div>
            </div>
          </div>
          {/* --- PRINTABLE CONTENT ENDS HERE --- */}

        </div>
      </div>
    </div>
  );
}
