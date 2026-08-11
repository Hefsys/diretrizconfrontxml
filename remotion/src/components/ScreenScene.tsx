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

type Props = {
  src: string;
  step: string;
  title: string;
  bullets: string[];
  align?: "left" | "right";
  /** Ken Burns focus: 0 = top of screenshot, 1 = lower part */
  focus?: number;
  zoom?: number;
};

export const ScreenScene: React.FC<Props> = ({
  src,
  step,
  title,
  bullets,
  align = "left",
  focus = 0,
  zoom = 1.04,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28 });
  const t = frame / durationInFrames;
  const scale = interpolate(t, [0, 1], [zoom, zoom + 0.05]);
  const startPan = focus > 0 ? -80 : 0;
  const pan = interpolate(t, [0, 1], [startPan, startPan - 70 - focus * 240]);
  const cardShift = interpolate(enter, [0, 1], [align === "left" ? 90 : -90, 0]);

  const textCol = (
    <div
      style={{
        width: 520,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        paddingLeft: align === "left" ? 96 : 0,
        paddingRight: align === "right" ? 96 : 0,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 20,
          letterSpacing: 5,
          color: COLORS.lima,
          opacity: interpolate(frame, [4, 20], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - enter) * 12}px)`,
        }}
      >
        {step}
      </span>
      <h2
        style={{
          fontFamily: DISPLAY,
          fontSize: 46,
          lineHeight: 1.02,
          margin: 0,
          color: COLORS.bone,
          opacity: interpolate(frame, [8, 26], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - enter) * 22}px)`,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        {bullets.map((b, i) => {
          const o = interpolate(frame, [20 + i * 9, 38 + i * 9], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={b} style={{ display: "flex", gap: 14, opacity: o, transform: `translateX(${(1 - o) * 18}px)` }}>
              <span
                style={{
                  marginTop: 12,
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  background: COLORS.lima,
                  borderRadius: 2,
                }}
              />
              <span style={{ fontFamily: BODY, fontSize: 23, lineHeight: 1.45, color: "#CFCCC4" }}>{b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const shot = (
    <div
      style={{
        flex: 1,
        height: 826,
        borderRadius: 22,
        overflow: "hidden",
        border: "1px solid rgba(244,241,234,0.14)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(166,242,82,0.10)",
        transform: `translateX(${cardShift}px) scale(${interpolate(enter, [0, 1], [0.97, 1])})`,
        opacity: enter,
        background: COLORS.char,
        position: "relative",
      }}
    >
      <Img
        src={staticFile(src)}
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
  );

  return (
    <AbsoluteFill
      style={{
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: 60,
        paddingRight: align === "left" ? 70 : 0,
        paddingLeft: align === "right" ? 70 : 0,
      }}
    >
      {textCol}
      {shot}
    </AbsoluteFill>
  );
};
