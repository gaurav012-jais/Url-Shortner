import React from 'react';

interface AuthIllustrationProps {
  className?: string;
}

export const AuthIllustration: React.FC<AuthIllustrationProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-gradient-to-br from-[#131138] via-[#1a1752] to-[#261559] flex items-center justify-center ${className}`}
    >
      {/* Curved Left Edge Mask for Desktop (matching the semicircle cut in reference) */}
      <div className="hidden md:block absolute -left-12 top-0 bottom-0 w-24 bg-white dark:bg-slate-900 rounded-r-full z-10 pointer-events-none" />

      {/* Atmospheric Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-52 h-52 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Tropical Leaf Silhouettes (Dark botanical shadows in corners) */}
      <svg
        className="absolute top-0 right-0 w-44 h-44 text-indigo-950/70 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M200 0 C150 20 120 70 130 130 C110 110 100 80 110 40 C140 10 170 0 200 0 Z" opacity="0.6" />
        <path d="M200 40 C160 60 140 110 155 170 C135 145 125 110 140 70 C165 45 185 40 200 40 Z" opacity="0.4" />
        <path d="M170 0 C140 30 110 90 120 150 C105 130 95 100 105 60 C125 30 150 10 170 0 Z" opacity="0.3" />
      </svg>
      <svg
        className="absolute bottom-0 right-0 w-48 h-48 text-indigo-950/80 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M200 200 C140 190 100 150 90 90 C110 110 130 130 160 140 C180 170 190 190 200 200 Z" opacity="0.6" />
        <path d="M150 200 C110 180 80 130 85 70 C100 100 120 120 140 130 C145 160 150 185 150 200 Z" opacity="0.4" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-36 h-36 text-indigo-950/60 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M0 200 C40 170 70 130 75 80 C60 110 45 130 20 140 C10 170 5 190 0 200 Z" opacity="0.5" />
      </svg>

      {/* Constellation Network Connecting Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="lineGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="lineGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Lines from center character to glowing badges */}
        <line x1="200" y1="180" x2="200" y2="82" stroke="url(#lineGradCyan)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
        <line x1="190" y1="190" x2="88" y2="160" stroke="#60A5FA" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
        <line x1="210" y1="185" x2="310" y2="150" stroke="url(#lineGradAmber)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
        <line x1="190" y1="230" x2="100" y2="280" stroke="#C084FC" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
        <line x1="215" y1="230" x2="315" y2="275" stroke="#FBBF24" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
        <line x1="200" y1="250" x2="225" y2="330" stroke="#FB7185" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.5" />
      </svg>

      {/* Sparkling Starlight Particles */}
      <span className="absolute top-12 left-1/4 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38BDF8] animate-ping opacity-75" />
      <span className="absolute top-28 right-12 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#FBBF24] animate-pulse" />
      <span className="absolute bottom-20 left-16 w-1.5 h-1.5 rounded-full bg-purple-300 shadow-[0_0_8px_#C084FC] animate-ping opacity-60" />
      <span className="absolute bottom-12 right-20 w-1.5 h-1.5 rounded-full bg-rose-300 shadow-[0_0_8px_#FB7185] animate-pulse" />
      <span className="absolute top-1/2 left-8 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />

      {/* ────────────────── 6 Floating Feature Badges ────────────────── */}

      {/* 1. TOP CENTER: Glowing Link / Redirection Hub */}
      <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] p-[2px] shadow-[0_0_24px_rgba(56,189,248,0.7)] animate-bounce duration-1000">
          <div className="w-full h-full rounded-2xl bg-[#082f49]/80 backdrop-blur-md flex items-center justify-center border border-cyan-300/40">
            <span className="material-symbols-outlined text-cyan-300 text-[26px]">link</span>
          </div>
        </div>
        <span className="w-3 h-3 -mt-1 rotate-45 bg-cyan-400/40 blur-[2px]" />
      </div>

      {/* 2. TOP LEFT: Fast Routing / Telegram Paper Plane */}
      <div className="absolute top-28 sm:top-32 left-4 sm:left-10 z-20">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 p-[2px] shadow-[0_0_18px_rgba(96,165,250,0.6)] hover:scale-110 transition-transform">
          <div className="w-full h-full rounded-full bg-[#1e293b]/85 backdrop-blur-md flex items-center justify-center border border-sky-300/40">
            <span className="material-symbols-outlined text-sky-300 text-[20px]">send</span>
          </div>
        </div>
      </div>

      {/* 3. TOP RIGHT: Custom Domain & Message */}
      <div className="absolute top-24 sm:top-28 right-4 sm:right-10 z-20">
        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-600 to-orange-400 p-[2px] shadow-[0_0_20px_rgba(251,146,60,0.6)] hover:scale-110 transition-transform">
          <div className="w-full h-full rounded-full bg-[#291b0f]/85 backdrop-blur-md flex items-center justify-center border border-amber-300/40">
            <span className="material-symbols-outlined text-amber-300 text-[22px]">mark_email_read</span>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM LEFT: Campaign & Megaphone */}
      <div className="absolute bottom-16 sm:bottom-20 left-6 sm:left-12 z-20">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-fuchsia-600 to-purple-400 p-[2px] shadow-[0_0_18px_rgba(192,132,252,0.6)] hover:scale-110 transition-transform">
          <div className="w-full h-full rounded-full bg-[#2e1065]/85 backdrop-blur-md flex items-center justify-center border border-fuchsia-300/40">
            <span className="material-symbols-outlined text-fuchsia-300 text-[20px]">campaign</span>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM RIGHT: Real-Time Analytics Bar Chart */}
      <div className="absolute bottom-20 sm:bottom-24 right-5 sm:right-12 z-20">
        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-[2px] shadow-[0_0_22px_rgba(251,191,36,0.7)] hover:scale-110 transition-transform">
          <div className="w-full h-full rounded-full bg-[#2d1e04]/85 backdrop-blur-md flex items-center justify-center border border-yellow-300/50">
            <span className="material-symbols-outlined text-yellow-300 text-[22px]">bar_chart</span>
          </div>
        </div>
      </div>

      {/* 6. BOTTOM CENTER-RIGHT: 24/7 SLA & Phone Support */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 sm:left-1/2 -translate-x-1/2 sm:translate-x-4 z-20">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-rose-600 to-pink-400 p-[2px] shadow-[0_0_16px_rgba(251,113,133,0.6)] hover:scale-110 transition-transform">
          <div className="w-full h-full rounded-full bg-[#3b0b1a]/85 backdrop-blur-md flex items-center justify-center border border-pink-300/40">
            <span className="material-symbols-outlined text-pink-300 text-[18px]">support_agent</span>
          </div>
        </div>
      </div>

      {/* ────────────────── Center Illustrated Vector Hero Figure ────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center translate-y-3 sm:translate-y-4">
        {/* Glow halo behind character */}
        <div className="absolute w-36 h-36 rounded-full bg-indigo-500/30 blur-2xl -z-10 animate-pulse" />

        <svg
          className="w-36 h-48 sm:w-44 sm:h-56 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-300"
          viewBox="0 0 180 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Aura Circles */}
          <circle cx="90" cy="115" r="70" stroke="rgba(168,85,247,0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="90" cy="115" r="54" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />

          {/* Right Raised Arm reaching upward towards the Link node */}
          <path
            d="M 98 80 C 105 60 110 40 108 26 C 107 20 104 18 100 22 C 96 26 90 45 88 78 Z"
            fill="#3B82F6"
          />
          {/* Reaching Hand with glowing cyan fingertip */}
          <circle cx="108" cy="22" r="5" fill="#FED7AA" />
          <circle cx="108" cy="22" r="9" fill="rgba(56,189,248,0.5)" className="animate-ping" />

          {/* Left Relaxed Arm */}
          <path
            d="M 68 85 C 55 105 52 120 54 135 C 55 140 60 140 63 135 C 68 120 74 105 78 85 Z"
            fill="#2563EB"
          />
          <circle cx="55" cy="140" r="4.5" fill="#FED7AA" />

          {/* Head & Hair */}
          <ellipse cx="85" cy="58" rx="10" ry="12" fill="#FED7AA" />
          {/* Modern Dark Haircut */}
          <path
            d="M 74 54 C 74 44 80 40 90 40 C 97 40 100 45 99 52 C 95 49 88 50 84 53 C 80 56 76 60 74 54 Z"
            fill="#1E1B4B"
          />

          {/* Torso / Modern Tech Hoodie (Vibrant Violet / Indigo) */}
          <path
            d="M 72 75 C 72 72 78 70 88 70 C 98 70 104 72 104 75 L 102 125 C 102 128 96 130 88 130 C 80 130 74 128 74 125 Z"
            fill="#6366F1"
          />
          {/* Inner Vest / Tech Stripe */}
          <path
            d="M 83 70 L 85 130 L 91 130 L 93 70 Z"
            fill="#4F46E5"
            opacity="0.7"
          />

          {/* Left Floating Leg */}
          <path
            d="M 78 128 C 72 155 65 175 60 200 C 58 206 64 208 67 202 C 76 180 82 160 85 128 Z"
            fill="#1E293B"
          />
          {/* Left Sneaker (White & Violet with cyan trim) */}
          <path
            d="M 58 200 C 56 204 50 208 42 208 C 39 208 40 213 46 213 C 58 213 65 210 68 204 Z"
            fill="#F8FAFC"
          />
          <path d="M 48 208 L 54 204" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />

          {/* Right Bent Floating Leg */}
          <path
            d="M 95 128 C 100 150 110 165 120 185 C 123 190 128 188 125 182 C 115 162 106 148 101 128 Z"
            fill="#0F172A"
          />
          {/* Right Sneaker */}
          <path
            d="M 120 185 C 122 189 128 193 138 194 C 142 194 141 199 135 199 C 122 199 116 195 114 188 Z"
            fill="#F8FAFC"
          />
          <path d="M 126 190 L 132 192" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Floating Pod Aura Ring */}
        <div className="w-24 h-4 rounded-full bg-cyan-400/20 blur-sm -mt-2 animate-pulse" />
      </div>
    </div>
  );
};
