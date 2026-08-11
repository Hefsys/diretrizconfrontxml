import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;

  const x = interpolate(t, [0, 1], [20, 80]);
  const y = interpolate(t, [0, 1], [70, 25]);
  const drift = interpolate(frame % 300, [0, 150, 300], [0, 14, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 55% at ${x}% ${y}%, rgba(166,242,82,0.14) 0%, rgba(10,10,10,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.055,
          backgroundImage:
            "linear-gradient(to right, #F4F1EA 1px, transparent 1px), linear-gradient(to bottom, #F4F1EA 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          transform: `translate(${-drift}px, ${drift * 0.4}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0) 35%, rgba(10,10,10,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
