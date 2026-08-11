import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, DISPLAY, MONO } from "../theme";

export const Logo: React.FC<{ size?: number; showWordmark?: boolean; delay?: number }> = ({
  size = 120,
  showWordmark = true,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inH = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const dot = spring({ frame: frame - delay - 10, fps, config: { damping: 9, stiffness: 160 } });
  const word = interpolate(frame - delay - 18, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.12 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: size * 0.06 }}>
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: size,
            lineHeight: 0.85,
            color: COLORS.bone,
            opacity: inH,
            transform: `translateY(${(1 - inH) * 18}px)`,
            letterSpacing: -size * 0.03,
          }}
        >
          H
        </span>
        <span
          style={{
            width: size * 0.17,
            height: size * 0.17,
            borderRadius: 999,
            background: COLORS.lima,
            transform: `scale(${dot})`,
            marginBottom: size * 0.06,
          }}
        />
      </div>
      {showWordmark && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: size * 0.17,
            letterSpacing: size * 0.055,
            color: COLORS.dim,
            opacity: word,
          }}
        >
          HEFSYS
        </span>
      )}
    </div>
  );
};
