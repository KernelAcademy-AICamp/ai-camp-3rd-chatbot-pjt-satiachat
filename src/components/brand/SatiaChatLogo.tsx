import { cn } from "@/lib/utils";

interface SatiaChatLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { logo: 32, text: "text-lg" },
  md: { logo: 48, text: "text-xl" },
  lg: { logo: 64, text: "text-2xl" },
  xl: { logo: 100, text: "text-3xl" },
};

export function SatiaChatLogo({
  size = "md",
  showText = true,
  animate = false,
  className,
}: SatiaChatLogoProps) {
  const { logo, text } = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("flex-shrink-0", animate && "animate-float")}
        style={{ width: logo, height: logo }}
      >
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
        >
          <defs>
            <linearGradient id="satiaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
              fill="url(#satiaGradient)"
            />
            <g transform="translate(0, -10)">
              {/* Rice bowl */}
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
                  stroke="url(#satiaGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M 0 -14 Q 5 -18 8 -24"
                  fill="none"
                  stroke="url(#satiaGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d="M 0 -14 Q -5 -18 -8 -24"
                  fill="none"
                  stroke="url(#satiaGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                <path
                  d="M 0 -26 Q 4 -30 6 -35"
                  fill="none"
                  stroke="url(#satiaGradient)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <path
                  d="M 0 -26 Q -4 -30 -6 -35"
                  fill="none"
                  stroke="url(#satiaGradient)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  opacity="0.45"
                />
              </g>
            </g>
            {/* Blue dot */}
            <circle cx="32" cy="-38" r="6" fill="#577DFF" />
          </g>
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold", text)}>
          <span className="text-[#7FE7C4]">Satia</span>
          <span className="text-[#577DFF]">Chat</span>
        </span>
      )}
    </div>
  );
}

export function SatiaChatLogoMark({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="satiaGradientMark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7FE7C4" />
            <stop offset="40%" stopColor="#7FE7C4" />
            <stop offset="75%" stopColor="#6CB8E0" />
            <stop offset="100%" stopColor="#577DFF" />
          </linearGradient>
        </defs>
        <g transform="translate(100, 100)">
          <path
            d="M -60 -20 C -60 -55, -40 -75, 0 -75 C 40 -75, 65 -55, 65 -20 C 65 15, 50 45, 5 50 C -15 52, -30 48, -38 42 L -42 38 L -62 55 L -52 35 C -60 25, -60 10, -60 -20 Z"
            fill="url(#satiaGradientMark)"
          />
          <g transform="translate(0, -10)">
            <path
              d="M -33 4 C -33 15, -26 34, 0 36 C 26 34, 33 15, 33 4 C 20 -3, -20 -3, -33 4 Z"
              fill="#F7F4ED"
            />
            <ellipse cx="0" cy="4" rx="33" ry="8" fill="#F7F4ED" />
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
                stroke="url(#satiaGradientMark)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          </g>
          <circle cx="32" cy="-38" r="6" fill="#577DFF" />
        </g>
      </svg>
    </div>
  );
}
