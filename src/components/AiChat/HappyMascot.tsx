import React from 'react';

interface HappyMascotProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isThinking?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { box: 22, face: 20 },
  sm: { box: 32, face: 28 },
  md: { box: 44, face: 40 },
  lg: { box: 56, face: 52 },
  xl: { box: 76, face: 70 },
};

export default function HappyMascot({
  size = 'md',
  isThinking = false,
  animated = true,
  className = ''
}: HappyMascotProps) {
  const { box } = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: box, height: box }}
    >
      <style>{`
        @keyframes happyFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-3px) rotate(2deg);
          }
        }
        @keyframes happyBlink {
          0%, 90%, 100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }
        @keyframes happyWink {
          0%, 88%, 100% {
            transform: scaleY(1);
          }
          94% {
            transform: scaleY(0.1);
          }
        }
        @keyframes happySparkle {
          0%, 100% {
            transform: scale(0.8) rotate(0deg);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.2) rotate(45deg);
            opacity: 1;
          }
        }
        @keyframes happyPulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(33, 139, 159, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(137, 197, 64, 0.65));
          }
        }
        @keyframes happyThinkingBob {
          0%, 100% {
            transform: translateY(0) rotate(-3deg);
          }
          50% {
            transform: translateY(-4px) rotate(3deg);
          }
        }
        .happy-mascot-container {
          animation: ${animated ? (isThinking ? 'happyThinkingBob 1.6s ease-in-out infinite' : 'happyFloat 3.2s ease-in-out infinite') : 'none'};
          will-change: transform;
        }
        .happy-glow {
          animation: ${animated ? 'happyPulseGlow 4s ease-in-out infinite' : 'none'};
        }
        .happy-eye-left {
          transform-origin: 35px 44px;
          animation: ${animated && !isThinking ? 'happyBlink 4s infinite ease-in-out' : 'none'};
        }
        .happy-eye-right {
          transform-origin: 65px 44px;
          animation: ${animated && !isThinking ? 'happyWink 4s infinite ease-in-out' : 'none'};
        }
        .happy-sparkle-1 {
          transform-origin: 86px 18px;
          animation: ${animated ? 'happySparkle 2.4s ease-in-out infinite' : 'none'};
        }
        .happy-sparkle-2 {
          transform-origin: 14px 22px;
          animation: ${animated ? 'happySparkle 2.8s ease-in-out infinite 0.7s' : 'none'};
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full happy-mascot-container happy-glow overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cheerful Golden-Teal Brand Gradient */}
          <linearGradient id="happyFaceGrad" x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="45%" stopColor="#FFC024" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Inner Highlight for 3D Soft Depth */}
          <linearGradient id="happyHighlight" x1="30" y1="12" x2="70" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Cheerful Mouth Gradient */}
          <linearGradient id="happyMouthGrad" x1="50" y1="52" x2="50" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="65%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>

          {/* Rosy Cheek Glow */}
          <radialGradient id="happyCheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF4D6D" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#FF4D6D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
          </radialGradient>

          {/* Teal Headband/Accent matching Happy in the Home Brand */}
          <linearGradient id="brandAccentGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#218B9F" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#89C540" />
          </linearGradient>
        </defs>

        {/* Decorative Twinkle Sparkles */}
        {size !== 'xs' && (
          <>
            {/* Top Right Sparkle */}
            <g className="happy-sparkle-1">
              <path
                d="M86 12 L87.5 16.5 L92 18 L87.5 19.5 L86 24 L84.5 19.5 L80 18 L84.5 16.5 Z"
                fill="#38BDF8"
              />
            </g>
            {/* Top Left Mini Star */}
            <g className="happy-sparkle-2">
              <path
                d="M14 17 L15.2 20.8 L19 22 L15.2 23.2 L14 27 L12.8 23.2 L9 22 L12.8 20.8 Z"
                fill="#89C540"
              />
            </g>
          </>
        )}

        {/* Happy Face Circle Base */}
        <circle
          cx="50"
          cy="52"
          r="40"
          fill="url(#happyFaceGrad)"
          stroke="#D97706"
          strokeWidth="2.5"
        />

        {/* Soft 3D Gloss Highlight */}
        <ellipse
          cx="42"
          cy="26"
          rx="24"
          ry="12"
          fill="url(#happyHighlight)"
        />

        {/* Cute Brand Tuft / Antenna Spark (Happy in the Home leaf-inspired sprout) */}
        <path
          d="M50 12 C48 4, 39 4, 39 8 C39 12, 48 11, 49 12.5 Z"
          fill="#89C540"
          stroke="#4D7C0F"
          strokeWidth="1.2"
        />
        <path
          d="M50 12 C52 4, 61 4, 61 8 C61 12, 52 11, 51 12.5 Z"
          fill="#218B9F"
          stroke="#0E7490"
          strokeWidth="1.2"
        />

        {/* Rosy Blush Cheeks */}
        <ellipse cx="23" cy="56" rx="8" ry="5" fill="url(#happyCheek)" />
        <ellipse cx="77" cy="56" rx="8" ry="5" fill="url(#happyCheek)" />

        {/* EYES */}
        {isThinking ? (
          /* Playful Wonder/Thinking Eyes looking slightly up */
          <g>
            <circle cx="35" cy="41" r="5" fill="#1F2937" />
            <circle cx="37" cy="39" r="1.8" fill="#FFFFFF" />
            <circle cx="65" cy="41" r="5" fill="#1F2937" />
            <circle cx="67" cy="39" r="1.8" fill="#FFFFFF" />
            {/* Curved thinking eyebrows */}
            <path d="M29 34 Q35 30 41 33" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M59 33 Q65 30 71 34" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          /* Joyful Sparkling Eyes with Highlights */
          <g>
            {/* Left Eye */}
            <g className="happy-eye-left">
              <ellipse cx="35" cy="44" rx="5.2" ry="6.2" fill="#1E293B" />
              <circle cx="33.2" cy="41.5" r="2.2" fill="#FFFFFF" />
              <circle cx="37.2" cy="46" r="1.1" fill="#FFFFFF" />
            </g>

            {/* Right Eye (winks or sparkles) */}
            <g className="happy-eye-right">
              <ellipse cx="65" cy="44" rx="5.2" ry="6.2" fill="#1E293B" />
              <circle cx="63.2" cy="41.5" r="2.2" fill="#FFFFFF" />
              <circle cx="67.2" cy="46" r="1.1" fill="#FFFFFF" />
            </g>

            {/* Happy Eyebrows */}
            <path d="M29 35 Q35 31 41 34" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M59 34 Q65 31 71 35" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* BIG HAPPY SMILE */}
        <g>
          {/* Mouth cavity */}
          <path
            d="M33 56 Q50 82 67 56 Q50 63 33 56 Z"
            fill="url(#happyMouthGrad)"
            stroke="#92400E"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Cute Pink Tongue */}
          <path
            d="M42 66 Q50 61 58 66 Q50 76 42 66 Z"
            fill="#FB7185"
          />

          {/* Dimple corners for extra cuteness */}
          <path d="M30 54 Q32 57 34 56" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M70 54 Q68 57 66 56" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
