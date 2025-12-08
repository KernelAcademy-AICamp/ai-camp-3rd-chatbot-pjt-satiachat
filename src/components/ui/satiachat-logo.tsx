import { cn } from "@/lib/utils";

interface SatiaChatLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  variant?: "default" | "icon-only";
}

const sizeMap = {
  sm: { logo: "w-8 h-8", wordmark: "text-lg" },
  md: { logo: "w-10 h-10", wordmark: "text-xl" },
  lg: { logo: "w-14 h-14", wordmark: "text-2xl" },
  xl: { logo: "w-20 h-20", wordmark: "text-3xl" },
};

export function SatiaChatLogo({
  className,
  size = "md",
  showWordmark = true,
  variant = "default",
}: SatiaChatLogoProps) {
  const { logo, wordmark } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(logo, "flex-shrink-0")}>
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
          style={{ filter: "drop-shadow(0 4px 12px rgba(127, 231, 196, 0.25))" }}
        >
          <defs>
            <linearGradient id="satiachat-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7FE7C4" />
              <stop offset="40%" stopColor="#7FE7C4" />
              <stop offset="75%" stopColor="#6CB8E0" />
              <stop offset="100%" stopColor="#577DFF" />
            </linearGradient>
          </defs>
          <g transform="translate(100, 100)">
            {/* Chat bubble */}
            <path
              d="M -60 -20 C -60 -55, -40 -75, 0 -75 C 40 -75, 65 -55, 65 -20 C 65 15, 50 45, 5 50 C -15 52, -30 48, -38 42 L -42 38 L -62 55 L -52 35 C -60 25, -60 10, -60 -20 Z"
              fill="url(#satiachat-gradient)"
            />
            <g transform="translate(0, -10)">
              {/* Bowl */}
              <path
                d="M -33 4 C -33 15, -26 34, 0 36 C 26 34, 33 15, 33 4 C 20 -3, -20 -3, -33 4 Z"
                fill="#F7F4ED"
              />
              <ellipse cx="0" cy="4" rx="33" ry="8" fill="#F7F4ED" />
              {/* Leaf */}
              <g transform="translate(-4, 0) rotate(20)">
                <path
                  d="M 0 -46 C 12 -40, 15 -26, 11 -12 C 8 -5, 0 0, 0 0 C 0 0, -8 -5, -11 -12 C -15 -26, -12 -40, 0 -46 Z"
                  fill="#F7F4ED"
                />
                <line
                  x1="0"
                  y1="-2"
                  x2="0"
                  y2="-44"
                  stroke="url(#satiachat-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M 0 -14 Q 5 -18 8 -24"
                  fill="none"
                  stroke="url(#satiachat-gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d="M 0 -14 Q -5 -18 -8 -24"
                  fill="none"
                  stroke="url(#satiachat-gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d="M 0 -26 Q 4 -30 6 -35"
                  fill="none"
                  stroke="url(#satiachat-gradient)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <path
                  d="M 0 -26 Q -4 -30 -6 -35"
                  fill="none"
                  stroke="url(#satiachat-gradient)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.45"
                />
              </g>
            </g>
            {/* Blue accent dot */}
            <circle cx="32" cy="-38" r="6" fill="#577DFF" />
          </g>
        </svg>
      </div>
      {showWordmark && variant === "default" && (
        <div className={cn("font-bold", wordmark)}>
          <span className="text-[#7FE7C4]">Satia</span>
          <span className="text-[#577DFF]">Chat</span>
        </div>
      )}
    </div>
  );
}

export function SatiaChatHorizontalLogo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" }) {
  const sizeMap = {
    sm: { width: 180, height: 24 },
    md: { width: 240, height: 32 },
    lg: { width: 320, height: 42 },
    xl: { width: 400, height: 52 },
    "2xl": { width: 480, height: 62 },
    "3xl": { width: 560, height: 72 },
  };
  const { width, height } = sizeMap[size];

  return (
    <div className={cn("flex items-center", className)}>
      <svg viewBox="0 0 280 36" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="satiachat-h-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7FE7C4" />
            <stop offset="40%" stopColor="#7FE7C4" />
            <stop offset="75%" stopColor="#6CB8E0" />
            <stop offset="100%" stopColor="#577DFF" />
          </linearGradient>
        </defs>
        <g transform="translate(21, 20) scale(0.22)">
          <path
            d="M -60 -20 C -60 -55, -40 -75, 0 -75 C 40 -75, 65 -55, 65 -20 C 65 15, 50 45, 5 50 C -15 52, -30 48, -38 42 L -42 38 L -62 55 L -52 35 C -60 25, -60 10, -60 -20 Z"
            fill="url(#satiachat-h-gradient)"
          />
          <g transform="translate(0, -10)">
            <path d="M -33 4 C -33 15, -26 34, 0 36 C 26 34, 33 15, 33 4 C 20 -3, -20 -3, -33 4 Z" fill="#F7F4ED" />
            <ellipse cx="0" cy="4" rx="33" ry="8" fill="#F7F4ED" />
            <g transform="translate(-4, 0) rotate(20)">
              <path
                d="M 0 -46 C 12 -40, 15 -26, 11 -12 C 8 -5, 0 0, 0 0 C 0 0, -8 -5, -11 -12 C -15 -26, -12 -40, 0 -46 Z"
                fill="#F7F4ED"
              />
              <line x1="0" y1="-2" x2="0" y2="-44" stroke="url(#satiachat-h-gradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <path d="M 0 -14 Q 5 -18 8 -24" fill="none" stroke="url(#satiachat-h-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              <path d="M 0 -14 Q -5 -18 -8 -24" fill="none" stroke="url(#satiachat-h-gradient)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
              <path d="M 0 -26 Q 4 -30 6 -35" fill="none" stroke="url(#satiachat-h-gradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
              <path d="M 0 -26 Q -4 -30 -6 -35" fill="none" stroke="url(#satiachat-h-gradient)" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
            </g>
          </g>
          <circle cx="32" cy="-38" r="6" fill="#577DFF" />
        </g>
        <g transform="translate(42, 0)">
          <text x="0" y="21" fontFamily="DM Sans, -apple-system, sans-serif" fontSize="20" fontWeight="700">
            <tspan fill="#7FE7C4">Satia</tspan>
            <tspan fill="#577DFF">Chat</tspan>
          </text>
          <text
            x="43"
            y="30"
            fontFamily="DM Sans, -apple-system, sans-serif"
            fontSize="5.5"
            fontWeight="500"
            fill="#1D1D1F"
            opacity="0.45"
            textAnchor="middle"
            letterSpacing="1"
          >
            FEEL FULL · LIVE LIGHT
          </text>
        </g>
      </svg>
    </div>
  );
}

export function SatiaChatIconBox({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-10 h-10 rounded-lg",
    md: "w-12 h-12 rounded-xl",
    lg: "w-16 h-16 rounded-2xl",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center shadow-glow",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #7FE7C4 0%, #7FE7C4 40%, #6CB8E0 75%, #577DFF 100%)",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[80%] h-[80%]"
      >
        <defs>
          <linearGradient id="satiachat-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7FE7C4" />
            <stop offset="40%" stopColor="#7FE7C4" />
            <stop offset="75%" stopColor="#6CB8E0" />
            <stop offset="100%" stopColor="#577DFF" />
          </linearGradient>
        </defs>
        <g transform="translate(50, 55)">
          {/* Bowl */}
          <path
            d="M -33 4 C -33 15, -26 34, 0 36 C 26 34, 33 15, 33 4 C 20 -3, -20 -3, -33 4 Z"
            fill="#F7F4ED"
          />
          <ellipse cx="0" cy="4" rx="33" ry="8" fill="#F7F4ED" />
          {/* Leaf */}
          <g transform="translate(-4, 0) rotate(20)">
            <path
              d="M 0 -44 C 11 -38, 14 -25, 10 -11 C 7 -4, 0 0, 0 0 C 0 0, -7 -4, -10 -11 C -14 -25, -11 -38, 0 -44 Z"
              fill="#F7F4ED"
            />
            <line
              x1="0"
              y1="-2"
              x2="0"
              y2="-42"
              stroke="url(#satiachat-icon-gradient)"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M 0 -14 Q 5 -18 8 -23"
              fill="none"
              stroke="url(#satiachat-icon-gradient)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M 0 -14 Q -5 -18 -8 -23"
              fill="none"
              stroke="url(#satiachat-icon-gradient)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M 0 -25 Q 4 -29 6 -34"
              fill="none"
              stroke="url(#satiachat-icon-gradient)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.45"
            />
            <path
              d="M 0 -25 Q -4 -29 -6 -34"
              fill="none"
              stroke="url(#satiachat-icon-gradient)"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.45"
            />
          </g>
          {/* Blue accent dot */}
          <circle cx="32" cy="-28" r="6" fill="#577DFF" />
        </g>
      </svg>
    </div>
  );
}
