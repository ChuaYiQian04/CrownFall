export default function CrownScene() {
  return (
    <div className="crown-scene" aria-hidden="true">
      <svg viewBox="0 0 600 550" role="presentation">
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#f8df9f" />
            <stop offset=".3" stopColor="#b18a46" />
            <stop offset=".52" stopColor="#f1d391" />
            <stop offset="1" stopColor="#634822" />
          </linearGradient>
          <linearGradient id="inner" x2="0" y2="1">
            <stop stopColor="#3e3433" />
            <stop offset="1" stopColor="#121722" />
          </linearGradient>
          <radialGradient id="glow">
            <stop stopColor="#d6b56d" stopOpacity=".17" />
            <stop offset="1" stopColor="#d6b56d" stopOpacity="0" />
          </radialGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity=".8" />
          </filter>
        </defs>
        <circle cx="300" cy="265" r="240" fill="url(#glow)" />
        <g fill="none" stroke="#d6b56d" opacity=".18">
          <circle cx="300" cy="265" r="205" />
          <circle cx="300" cy="265" r="217" strokeDasharray="1 12" />
          <path d="M300 25v35m0 410v35M60 265h35m410 0h35" />
          <path d="m300 37 228 342H72Z" opacity=".35" />
        </g>
        <ellipse cx="300" cy="434" rx="164" ry="23" fill="#000" opacity=".35" />
        <g filter="url(#shadow)">
          <path
            d="M140 233 213 298 300 149 388 298 461 233 429 384Q300 439 172 384Z"
            fill="url(#inner)"
            stroke="#7d6338"
            strokeWidth="5"
          />
          <path
            d="m140 233 56 112 21-56 83-140 83 140 21 56 57-112-31 155Q300 436 172 388Z"
            fill="url(#metal)"
          />
          <path
            d="m169 269 29 104 31-53 71-121 71 121 31 53 30-104-20 106Q300 415 190 375Z"
            fill="#152030"
          />
          <path
            d="m194 350 23-61 15 31-27 52m166-52 15-31 22 61-13 22M285 224l15-25 15 25-15 32Z"
            fill="#d4b273"
          />
          <path
            d="M173 379q127 48 257 0l-6 35q-123 48-244 0Z"
            fill="url(#metal)"
            stroke="#efd397"
            strokeWidth="2"
          />
          <path
            d="M181 394q120 46 242 0M184 407q117 44 236 0"
            fill="none"
            stroke="#6e5026"
            strokeWidth="2"
          />
          <path
            d="m300 354 17 24-17 25-17-25Z"
            fill="#528a9b"
            stroke="#f3d899"
            strokeWidth="4"
          />
          <path d="m300 361 8 16-8 15-8-15Z" fill="#a3c5c5" />
          <g fill="#e9ca88" stroke="#6f532c" strokeWidth="2">
            <circle cx="140" cy="230" r="10" />
            <circle cx="300" cy="147" r="12" />
            <circle cx="461" cy="230" r="10" />
            <circle cx="235" cy="397" r="5" />
            <circle cx="366" cy="397" r="5" />
          </g>
        </g>
        <g fill="#d6b56d" opacity=".65">
          <circle cx="150" cy="137" r="1.5" />
          <circle cx="446" cy="143" r="2" />
          <circle cx="97" cy="333" r="1" />
          <circle cx="407" cy="87" r="1" />
          <circle cx="490" cy="364" r="1.5" />
          <circle cx="252" cy="86" r="1.5" />
        </g>
      </svg>
      <span className="artifact-label">
        THE FATE OF THE REALM IS IN YOUR HANDS
      </span>
    </div>
  );
}
