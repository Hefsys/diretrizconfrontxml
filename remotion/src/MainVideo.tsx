import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { PersistentBackground } from "./components/PersistentBackground";
import { ScreenScene } from "./components/ScreenScene";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Resultado } from "./scenes/Resultado";

const T = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: T });

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={95}>
          <ScreenScene
            src="shots/01_login.png"
            step="01 · ACESSO"
            title="PORTAL DA CONTABILIDADE"
            bullets={["Login por e-mail e senha", "Cada equipe com sua base isolada"]}
            align="left"
            focus={0}
            zoom={1.02}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={110}>
          <ScreenScene
            src="shots/03_empresas.png"
            step="02 · CADASTRO"
            title="EMPRESAS DO ESCRITÓRIO"
            bullets={[
              "CNPJ, razão social e status por cliente",
              "Toda análise fica vinculada à empresa",
            ]}
            align="right"
            focus={0}
            zoom={1.03}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={115}>
          <ScreenScene
            src="shots/08_upload_pronto.png"
            step="03 · IMPORTAÇÃO"
            title="XML + PLANILHA"
            bullets={[
              "Arraste os XMLs da NF-e e o relatório de entradas",
              "O confronto roda em segundos, sem planilha manual",
            ]}
            align="left"
            focus={0.15}
            zoom={1.03}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={145}>
          <Resultado />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={115}>
          <ScreenScene
            src="shots/04_xmls.png"
            step="05 · BASE DE NF-e"
            title="XMLs SEMPRE À MÃO"
            bullets={[
              "Busca por número, chave ou emitente",
              "Reaproveitados automaticamente no próximo mês",
            ]}
            align="right"
            focus={0.5}
            zoom={1.03}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={110}>
          <ScreenScene
            src="shots/09_planilhas.png"
            step="06 · PLANILHAS"
            title="BASE DE PLANILHAS"
            bullets={[
              "Linhas de Excel armazenadas e deduplicadas",
              "Filtro por CFOP, emitente e seleção em massa",
            ]}
            align="left"
            focus={0.55}
            zoom={1.03}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={115}>
          <ScreenScene
            src="shots/05_fechamentos.png"
            step="07 · FECHAMENTOS"
            title="ANÁLISES SALVAS"
            bullets={[
              "Título, competência e resumo de cada confronto",
              "Reabra, corrija e exporte quando o fiscal pedir",
            ]}
            align="right"
            focus={0.1}
            zoom={1.03}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={130}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
