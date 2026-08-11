import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, DISPLAY, MONO, BODY } from "../theme";

const STATS = [
  { label: "LINHAS CONFERIDAS", value: "115" },
  { label: "DIVERGÊNCIAS", value: "11" },
  { label: "AUSENTES NO XML", value: "06" },
];

export const Resultado: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const t = frame / durationInFrames;
  const pan = interpolate(t, [0, 1], [0, -260]);
  const scale = interpolate(t, [0, 1], [1.05, 1.11]);

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", gap: 56, paddingRight: 70 }}>
      <div style={{ width: 500, paddingLeft: 96, display: "flex", flexDirection: "column", gap: 26 }}>
        <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: 5, color: COLORS.lima }}>
          04 · RESULTADO
        </span>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontSize: 50,
            lineHeight: 1.02,
            margin: 0,
            color: COLORS.bone,
            opacity: enter,
            transform: `translateY(${(1 - enter) * 20}px)`,
          }}
        >
          CADA LINHA
          <br />
          CLASSIFICADA
        </h2>
        <p style={{ fontFamily: BODY, fontSize: 24, lineHeight: 1.45, color: "#CFCCC4", margin: 0 }}>
          OK, divergente, ausente no XML ou não escriturado — com filtro, exportação e correção direto na tela.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 6 }}>
          {STATS.map((s, i) => {
            const sp = spring({
              frame: frame - 26 - i * 10,
              fps,
              config: { damping: 15, stiffness: 90, mass: 1.1 },
            });
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 18,
                  opacity: sp,
                  transform: `translateY(${(1 - sp) * 16}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 74,
                    lineHeight: 0.9,
                    color: i === 0 ? COLORS.lima : COLORS.bone,
                  }}
                >
                  {s.value}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 17, letterSpacing: 3, color: COLORS.dim }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          height: 826,
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(244,241,234,0.14)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
          background: COLORS.char,
          position: "relative",
          opacity: enter,
          transform: `translateX(${(1 - enter) * 80}px)`,
        }}
      >
        <Img
          src={staticFile("shots/06_detalhe.png")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${pan}px) scale(${scale})`,
            transformOrigin: "top center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
