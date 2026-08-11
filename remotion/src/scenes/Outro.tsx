import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, DISPLAY, MONO, BODY } from "../theme";
import { Logo } from "../components/Logo";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = spring({ frame: frame - 26, fps, config: { damping: 200 }, durationInFrames: 28 });
  const claim = spring({ frame: frame - 32, fps, config: { damping: 200 }, durationInFrames: 32 });
  const tail = interpolate(frame, [58, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin(frame / 30) * 4;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 38,
          transform: `translateY(${float}px)`,
        }}
      >
        <Logo size={150} showWordmark={false} />
        <div style={{ width: 420 * line, height: 2, background: COLORS.lima, opacity: 0.7 }} />
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 66,
            margin: 0,
            color: COLORS.bone,
            textAlign: "center",
            opacity: claim,
            transform: `translateY(${(1 - claim) * 20}px)`,
          }}
        >
          EXECUÇÃO, NÃO PROMESSA.
        </h2>
        <p style={{ fontFamily: BODY, fontSize: 28, color: "#CFCCC4", margin: 0, opacity: tail }}>
          Hefsys · Confronto NF-e
        </p>
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 5, color: COLORS.dim, opacity: tail }}>
          HEFSYS.COM.BR
        </span>
      </div>
    </AbsoluteFill>
  );
};
