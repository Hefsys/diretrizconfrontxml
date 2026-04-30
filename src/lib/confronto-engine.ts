import type { XmlNfeData, ExcelNfeData, ConfrontoResult, ConfrontoSummary } from './types';

function cleanCnpj(v: string): string {
  return v.replace(/[.\-\/\s]/g, '');
}

export function recomputeSummary(results: ConfrontoResult[]): ConfrontoSummary {
  return {
    totalPlanilha: results.filter((r) => r.valorPlanilha !== null).length,
    totalXmls: results.filter((r) => r.valorXml !== null).length,
    ok: results.filter((r) => r.status === 'ok').length,
    divergentes: results.filter((r) => r.status === 'divergente').length,
    ausentes: results.filter((r) => r.status === 'ausente_xml').length,
    naoEscriturados: results.filter((r) => r.status === 'nao_escriturado').length,
    canceladas: results.filter((r) => r.status === 'cancelada').length,
  };
}

/**
 * Extracts a YYYY-MM key from a date string.
 * Accepts "DD/MM/AAAA", "DD/MM/AAAA HH:mm", and ISO "AAAA-MM-DDTHH:mm:ss".
 * Returns "sem-data" when no valid date can be parsed.
 */
export function getMonthKey(data: string | null | undefined): string {
  if (!data) return 'sem-data';
  const s = String(data).trim();
  // ISO format YYYY-MM-DD...
  const isoMatch = s.match(/^(\d{4})-(\d{2})-\d{2}/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
  // BR format DD/MM/AAAA
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}`;
  return 'sem-data';
}

export function reconcileMissing(
  currentResults: ConfrontoResult[],
  newXmlData: XmlNfeData[],
  monthFilter?: (row: ConfrontoResult) => boolean
): { results: ConfrontoResult[]; summary: ConfrontoSummary; matched: number; unmatched: number } {
  const results = [...currentResults];
  let matched = 0;
  const usedXmlIdx = new Set<number>();

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    if (row.status !== 'ausente_xml') continue;
    if (monthFilter && !monthFilter(row)) continue;

    const xmlIdx = newXmlData.findIndex((xml, idx) => {
      if (usedXmlIdx.has(idx)) return false;
      if (row.chNFe && row.chNFe.length === 44 && xml.chNFe === row.chNFe) return true;
      if (row.nNF && row.cnpjEmitente && xml.nNF === row.nNF
        && cleanCnpj(xml.cnpjEmitente) === cleanCnpj(row.cnpjEmitente)) return true;
      return false;
    });

    if (xmlIdx === -1) continue;
    usedXmlIdx.add(xmlIdx);
    const xml = newXmlData[xmlIdx];
    const somaIpi = (xml.vIPI ?? 0) > 0;
    const planilhaVal = (row.valorPlanilha ?? 0); // already adjusted upstream when from runConfronto
    // Note: in this reconcile path the planilha value was stored as-is from the original row
    // and may not include IPI even when the XML has IPI. We keep the existing comparison
    // behavior here — full IPI handling happens in runConfronto where raw row data is available.
    const diff = Math.abs(planilhaVal - xml.vNF);
    results[i] = {
      ...row,
      status: xml.cancelada ? 'cancelada' : (diff <= 0.01 ? 'ok' : 'divergente'),
      valorXml: xml.vNF,
      diferenca: xml.cancelada ? null : (diff > 0.01 ? planilhaVal - xml.vNF : 0),
      chNFe: xml.chNFe || row.chNFe,
      nomeEmitente: row.nomeEmitente || xml.xNome,
    };
    void somaIpi;
    matched++;
  }

  // Unmatched XMLs become "nao_escriturado"
  let unmatched = 0;
  for (let i = 0; i < newXmlData.length; i++) {
    if (usedXmlIdx.has(i)) continue;
    const xml = newXmlData[i];
    results.push({
      status: xml.cancelada ? 'cancelada' : 'nao_escriturado',
      nNF: xml.nNF,
      serie: xml.serie,
      data: xml.dhEmi,
      cnpjEmitente: xml.cnpjEmitente,
      nomeEmitente: xml.xNome,
      valorPlanilha: null,
      valorXml: xml.vNF,
      diferenca: null,
      chNFe: xml.chNFe,
    });
    unmatched++;
  }

  return { results, summary: recomputeSummary(results), matched, unmatched };
}

export function runConfronto(
  excelData: ExcelNfeData[],
  xmlData: XmlNfeData[]
): { results: ConfrontoResult[]; summary: ConfrontoSummary } {
  const results: ConfrontoResult[] = [];
  const matchedXmlKeys = new Set<string>();

  // Build XML lookup maps
  const xmlByChave = new Map<string, XmlNfeData>();
  const xmlByNnfCnpj = new Map<string, XmlNfeData>();

  for (const xml of xmlData) {
    if (xml.chNFe && xml.chNFe.length === 44) {
      xmlByChave.set(xml.chNFe, xml);
    }
    const key = `${xml.nNF}_${cleanCnpj(xml.cnpjEmitente)}`;
    xmlByNnfCnpj.set(key, xml);
  }

  // Process each Excel row
  for (const row of excelData) {
    let matchedXml: XmlNfeData | undefined;

    // Primary: match by chNFe
    if (row.chNFe && row.chNFe.length === 44) {
      matchedXml = xmlByChave.get(row.chNFe);
    }

    // Fallback: match by nNF + CNPJ
    if (!matchedXml && row.nNF && row.cnpjEmitente) {
      const key = `${row.nNF}_${cleanCnpj(row.cnpjEmitente)}`;
      matchedXml = xmlByNnfCnpj.get(key);
    }

    if (matchedXml) {
      matchedXmlKeys.add(matchedXml.chNFe || `${matchedXml.nNF}_${cleanCnpj(matchedXml.cnpjEmitente)}`);
      const somaIpi = (matchedXml.vIPI ?? 0) > 0;
      const valorPlanilhaAjustado = somaIpi
        ? row.valorContabil + (row.vIpiAA ?? 0) + (row.vIpiAR ?? 0)
        : row.valorContabil;
      const diff = Math.abs(valorPlanilhaAjustado - matchedXml.vNF);
      results.push({
        status: matchedXml.cancelada ? 'cancelada' : (diff <= 0.01 ? 'ok' : 'divergente'),
        nNF: row.nNF,
        serie: row.serie,
        data: row.dataDocumento || row.dataEntrada,
        cnpjEmitente: row.cnpjEmitente,
        nomeEmitente: row.nomeEmitente || matchedXml.xNome,
        valorPlanilha: valorPlanilhaAjustado,
        valorXml: matchedXml.vNF,
        diferenca: matchedXml.cancelada ? null : (diff > 0.01 ? valorPlanilhaAjustado - matchedXml.vNF : 0),
        chNFe: matchedXml.chNFe,
        sheetName: row.sheetName,
      });
    } else {
      results.push({
        status: 'ausente_xml',
        nNF: row.nNF,
        serie: row.serie,
        data: row.dataDocumento || row.dataEntrada,
        cnpjEmitente: row.cnpjEmitente,
        nomeEmitente: row.nomeEmitente,
        valorPlanilha: row.valorContabil,
        valorXml: null,
        diferenca: null,
        chNFe: row.chNFe,
        sheetName: row.sheetName,
      });
    }
  }

  // Find XMLs not in spreadsheet
  for (const xml of xmlData) {
    const key = xml.chNFe || `${xml.nNF}_${cleanCnpj(xml.cnpjEmitente)}`;
    if (!matchedXmlKeys.has(key)) {
      results.push({
        status: xml.cancelada ? 'cancelada' : 'nao_escriturado',
        nNF: xml.nNF,
        serie: xml.serie,
        data: xml.dhEmi,
        cnpjEmitente: xml.cnpjEmitente,
        nomeEmitente: xml.xNome,
        valorPlanilha: null,
        valorXml: xml.vNF,
        diferenca: null,
        chNFe: xml.chNFe,
      });
    }
  }

  return { results, summary: recomputeSummary(results) };
}
