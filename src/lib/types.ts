export interface XmlNfeData {
  chNFe: string;
  nNF: string;
  serie: string;
  dhEmi: string;
  cnpjEmitente: string;
  xNome: string;
  vNF: number;
  vBC: number;
  vICMS: number;
  vBCST: number;
  vST: number;
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vProd: number;
}

export interface ExcelNfeData {
  nNF: string;
  serie: string;
  dataEntrada: string;
  dataDocumento: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  chNFe: string;
  valorContabil: number;
  vBC: number;
  vICMS: number;
  vST: number;
  rowIndex: number;
  sheetName: string;
}

export type ConfrontoStatus = 'ok' | 'divergente' | 'ausente_xml' | 'nao_escriturado';

export interface ConfrontoResult {
  status: ConfrontoStatus;
  nNF: string;
  serie: string;
  data: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  valorPlanilha: number | null;
  valorXml: number | null;
  diferenca: number | null;
  chNFe: string;
  sheetName?: string;
}

export interface ConfrontoSummary {
  totalPlanilha: number;
  totalXmls: number;
  ok: number;
  divergentes: number;
  ausentes: number;
  naoEscriturados: number;
}
