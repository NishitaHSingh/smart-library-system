import React from 'react';

interface MitLogoProps {
  className?: string;
}

/**
 * Vector recreation of the official MIT CSN™ Logo (deep navy geometric 'MIT' with orange triangle accent + 'CSN™').
 */
export const MitCsnLogo: React.FC<MitLogoProps> = ({ className = 'h-8 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 385 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="MIT CSN Logo"
    >
      {/* Left top-right triangle wing of M */}
      <polygon points="8,18 28,18 28,36" fill="#004671" />

      {/* Main M letter */}
      <path
        d="M35 18 H65 L79 52 L93 18 H123 V68 H101 V38 L84 68 H74 L57 38 V68 H35 V18 Z"
        fill="#004671"
      />

      {/* Orange triangle top-left of I */}
      <polygon points="131,18 153,18 131,37" fill="#F27A3A" />

      {/* Main I bar (with angled top matching the orange triangle) */}
      <polygon points="131,44 153,25 153,68 131,68" fill="#004671" />

      {/* Vertical stem of T */}
      <rect x="160" y="18" width="22" height="50" fill="#004671" />

      {/* Right triangle wing of T */}
      <polygon points="189,18 209,18 209,36" fill="#004671" />

      {/* C */}
      <path
        d="M265 27 C258 22 248 22 241 28 C235 33 234 42 237 50 C240 58 248 62 257 61 C261 61 265 59 268 56 L273 63 C267 67 261 69 253 69 C238 69 225 59 225 43 C225 27 238 17 254 17 C261 17 267 19 272 22 L265 27 Z"
        fill="#004671"
      />

      {/* S */}
      <path
        d="M312 26 C308 23 303 22 298 22 C292 22 288 25 288 29 C288 34 293 36 301 38 C311 41 318 45 318 54 C318 63 309 69 296 69 C288 69 281 66 276 62 L281 55 C286 59 291 61 296 61 C303 61 307 58 307 54 C307 49 302 47 294 45 C285 42 278 38 278 29 C278 21 287 15 299 15 C305 15 312 17 316 20 L312 26 Z"
        fill="#004671"
      />

      {/* N */}
      <path
        d="M326 18 H336 L359 51 V18 H369 V68 H359 L336 35 V68 H326 V18 Z"
        fill="#004671"
      />

      {/* TM mark */}
      <text
        x="373"
        y="68"
        fill="#004671"
        fontSize="9"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        TM
      </text>
    </svg>
  );
};
