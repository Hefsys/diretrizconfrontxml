import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, DISPLAY, MONO, BODY } from "../theme";
import { Logo } from "../components/Logo";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = spring({ frame: frame - 30, fps, config: { damping: 200 }, durationInFrames: 30 });
  const titleIn = spring({ frame: frame - 36, fps, config: { damping: 200 }, durationInFrames: 34 });
  const sub = interpolate(frame, [60, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin(frame / 34) * 5;

  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 140 }}>
      <div style={{ transform: `translateY(${float}px)`, display: "flex", flexDirection: "column", gap: 44 }}>
        <Logo size={132} />
        <div style={{ width: 620 * line, height: 2, background: COLORS.lima, opacity: 0.65 }} />
        <h1
          style={{
            fontFamily: DISPLAY,
            fontSize: 104,
            lineHeight: 0.98,
            margin: 0,
            color: COLORS.bone,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 26}px)`,
          }}
        >
          CONFRONTO
          <br />
          <span style={{ color: COLORS.lima }}>NF-e</span>
        </h1>
        <p
          style={{
            fontFamily: BODY,
            fontSize: 30,
            color: "#CFCCC4",
            margin: 0,
            maxWidth: 760,
            opacity: sub,
          }}
        >
          XML contra escrituração fiscal. Divergência encontrada antes do fechamento.
        </p>
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: 4, color: COLORS.dim, opacity: sub }}>
          DEMONSTRAÇÃO · DADOS FICTÍCIOS
        </span>
      </div>
    </AbsoluteFill>
  );
};
