import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { loadFont as loadDisplay } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={905}
    fps={30}
    width={1920}
    height={1080}
  />
);
