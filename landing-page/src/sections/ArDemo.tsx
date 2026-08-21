import { BlurWords, Reveal } from '../components/Reveal'
import { motion } from 'framer-motion'

export default function ArDemo() {
  return (
    <section id="ar-demo" className="px-6 py-12 md:px-16 md:py-24 bg-[#f2f1ee]">
      <div className="rounded-[2.5rem] bg-white p-8 md:p-14 lg:p-20 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.04)]">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          
          {/* Left Column */}
          <div className="flex flex-col justify-between h-full py-2 lg:py-6">
            <div>
              <Reveal>
                <span className="text-[14px] font-bold tracking-tightest">qrave®</span>
              </Reveal>
              <h2 className="mt-6 text-[3.5rem] font-semibold leading-[0.95] tracking-tighter md:text-[5.5rem] lg:text-[6.5rem]">
                <BlurWords text="See your menu" />
                <br />
                <span className="text-neutral-400">
                  <BlurWords text="come alive." stagger={0.1} />
                </span>
              </h2>
            </div>

            {/* Crosses / Separator */}
            <div className="my-16 flex items-center justify-between opacity-20 max-w-[280px]">
              <span className="text-lg font-light">+</span>
              <span className="text-lg font-light">+</span>
            </div>

            <div className="max-w-[360px]">
              <Reveal>
                <h3 className="text-[15px] font-bold tracking-tight">Try the AR Demo</h3>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mt-3 text-[13px] leading-[1.6] tracking-tight text-neutral-500 md:text-sm">
                  Scan the QR code to experience exactly how your guests will view and interact with your dishes in immersive 3D space directly from their table.
                </p>
              </Reveal>
              <Reveal delay={0.2} className="mt-8">
                <button className="flex items-center justify-between gap-4 rounded-full bg-black px-6 py-3 text-[13px] font-semibold tracking-tight text-white transition-transform duration-300 hover:scale-105">
                  Scan the QR
                  <span className="h-1.5 w-1.5 rounded-full bg-white ml-2"></span>
                </button>
              </Reveal>
            </div>
          </div>

          {/* Right Column (QR & App Preview) */}
          <div className="relative w-full h-[450px] lg:h-auto lg:min-h-[600px]">
            <Reveal className="h-full w-full">
              <motion.div 
                className="group relative h-full w-full overflow-hidden rounded-[2rem] bg-[#0c0c0c] flex items-center justify-center shadow-xl"
                whileHover={{ scale: 1.015 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {/* Background Texture / Image (Camera Lens) */}
                <img
                  src="/media/p5.jpg"
                  alt="AR Background"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity grayscale transition-all duration-700 group-hover:opacity-40 group-hover:scale-105"
                />
                
                {/* QR Code Frosted Glass Container */}
                <div className="relative z-10 flex flex-col items-center p-6 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2">
                   <div className="w-[220px] h-[220px] bg-white rounded-2xl flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                     <img 
                       src="/media/qr.png" 
                       alt="QR Demo" 
                       className="w-full h-full object-contain"
                     />
                   </div>
                   <div className="mt-6">
                     <span className="text-white/95 font-medium tracking-tight text-[11px] bg-black/60 px-5 py-2.5 rounded-full border border-white/10 backdrop-blur-sm shadow-md">
                       Point your camera
                     </span>
                   </div>
                </div>

                {/* Bottom Bar overlay */}
                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-full bg-black/95 px-5 py-3.5 backdrop-blur-md text-white border border-white/5 shadow-2xl transition-transform duration-500 group-hover:-translate-y-1">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-black text-[10px] font-bold">
                      ➔
                    </span>
                    <div className="flex flex-col">
                      <p className="text-[12px] font-bold tracking-tight leading-none">AR Experience Demo</p>
                      <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold mt-1 leading-none">Powered by QRAVE®</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-tight text-white/90 mr-2">Interactive 3D</span>
                </div>
              </motion.div>
            </Reveal>
          </div>

        </div>
      </div>
    </section>
  )
}
