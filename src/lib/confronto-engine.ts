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

  // Pre-conta nNF dentro do conjunto novo para detectar ambiguidade no fallback por nNF apenas
  const nnfCounts = new Map<string, number>();
  for (const xml of newXmlData) {
    if (!xml.nNF) continue;
    nnfCounts.set(xml.nNF, (nnfCounts.get(xml.nNF) ?? 0) + 1);
  }

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    if (row.status !== 'ausente_xml') continue;
    if (monthFilter && !monthFilter(row)) continue;

    let xmlIdx = -1;

    // 1) Match por chNFe (44 dígitos)
    if (row.chNFe && row.chNFe.length === 44) {
      xmlIdx = newXmlData.findIndex(
        (xml, idx) => !usedXmlIdx.has(idx) && xml.chNFe === row.chNFe
      );
    }

    // 2) Match por nNF + CNPJ
    if (xmlIdx === -1 && row.nNF && row.cnpjEmitente) {
      const cnpjRow = cleanCnpj(row.cnpjEmitente);
      xmlIdx = newXmlData.findIndex(
        (xml, idx) =>
          !usedXmlIdx.has(idx) &&
          xml.nNF === row.nNF &&
          cleanCnpj(xml.cnpjEmitente) === cnpjRow
      );
    }

    // 3) Fallback: nNF apenas (somente se único no conjunto novo)
    if (xmlIdx === -1 && row.nNF && (nnfCounts.get(row.nNF) ?? 0) === 1) {
      xmlIdx = newXmlData.findIndex(
        (xml, idx) => !usedXmlIdx.has(idx) && xml.nNF === row.nNF
      );
    }

    // 4) Fallback: CNPJ + valor aproximado (quando não há nNF na linha)
    if (xmlIdx === -1 && (!row.nNF || row.nNF === '0') && row.cnpjEmitente && row.valorPlanilha != null) {
      const cnpjRow = cleanCnpj(row.cnpjEmitente);
      const planilhaVal = row.valorPlanilha;
      xmlIdx = newXmlData.findIndex(
        (xml, idx) =>
          !usedXmlIdx.has(idx) &&
          cleanCnpj(xml.cnpjEmitente) === cnpjRow &&
          Math.abs(xml.vNF - planilhaVal) <= 0.01
      );
    }

    if (xmlIdx === -1) continue;
    usedXmlIdx.add(xmlIdx);
    const xml = newXmlData[xmlIdx];
    const planilhaVal = (row.valorPlanilha ?? 0);
    const diff = Math.abs(planilhaVal - xml.vNF);
    results[i] = {
      ...row,
      status: xml.cancelada ? 'cancelada' : (diff <= 0.01 ? 'ok' : 'divergente'),
      valorXml: xml.vNF,
      diferenca: xml.cancelada ? null : (diff > 0.01 ? planilhaVal - xml.vNF : 0),
      chNFe: xml.chNFe || row.chNFe,
      nomeEmitente: row.nomeEmitente || xml.xNome,
    };
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
  const usedXmlIdx = new Set<number>();

  // Build XML lookup structures (CNPJ sempre normalizado nos dois lados)
  const xmlByChave = new Map<string, number>();
  const xmlByNnfCnpj = new Map<string, number>();
  const nnfCounts = new Map<string, number>();

  for (let i = 0; i < xmlData.length; i++) {
    const xml = xmlData[i];
    if (xml.chNFe && xml.chNFe.length === 44) {
      xmlByChave.set(xml.chNFe, i);
    }
    if (xml.nNF) {
      const key = `${xml.nNF}_${cleanCnpj(xml.cnpjEmitente ?? '')}`;
      if (!xmlByNnfCnpj.has(key)) xmlByNnfCnpj.set(key, i);
      nnfCounts.set(xml.nNF, (nnfCounts.get(xml.nNF) ?? 0) + 1);
    }
  }

  // Process each Excel row
  for (const row of excelData) {
    let matchedIdx = -1;

    // 1) Match por chNFe
    if (row.chNFe && row.chNFe.length === 44) {
      const idx = xmlByChave.get(row.chNFe);
      if (idx !== undefined && !usedXmlIdx.has(idx)) matchedIdx = idx;
    }

    // 2) Match por nNF + CNPJ
    if (matchedIdx === -1 && row.nNF && row.cnpjEmitente) {
      const key = `${row.nNF}_${cleanCnpj(row.cnpjEmitente)}`;
      const idx = xmlByNnfCnpj.get(key);
      if (idx !== undefined && !usedXmlIdx.has(idx)) matchedIdx = idx;
    }

    // 3) Fallback: nNF apenas (somente se único)
    if (matchedIdx === -1 && row.nNF && (nnfCounts.get(row.nNF) ?? 0) === 1) {
      matchedIdx = xmlData.findIndex(
        (xml, idx) => !usedXmlIdx.has(idx) && xml.nNF === row.nNF
      );
    }

    // 4) Fallback: CNPJ + valor aproximado (linhas sem nNF)
    if (matchedIdx === -1 && (!row.nNF || row.nNF === '0') && row.cnpjEmitente && row.valorContabil != null) {
      const cnpjRow = cleanCnpj(row.cnpjEmitente);
      matchedIdx = xmlData.findIndex(
        (xml, idx) =>
          !usedXmlIdx.has(idx) &&
          cleanCnpj(xml.cnpjEmitente ?? '') === cnpjRow &&
          Math.abs(xml.vNF - row.valorContabil) <= 0.01
      );
    }

    const matchedXml = matchedIdx >= 0 ? xmlData[matchedIdx] : undefined;

    if (matchedXml) {
      usedXmlIdx.add(matchedIdx);
      // Coluna Valor Contábil da planilha RFS008 já é o Valor Total da NF (com IPI/ST embutidos).
      // Comparação é sempre direta — nunca somar colunas extras.
      const valorPlanilha = row.valorContabil;
      const diff = Math.abs(valorPlanilha - matchedXml.vNF);
      results.push({
        status: matchedXml.cancelada ? 'cancelada' : (diff <= 0.01 ? 'ok' : 'divergente'),
        nNF: row.nNF,
        serie: row.serie,
        data: row.dataDocumento || row.dataEntrada,
        cnpjEmitente: row.cnpjEmitente,
        nomeEmitente: row.nomeEmitente || matchedXml.xNome,
        valorPlanilha,
        valorXml: matchedXml.vNF,
        diferenca: matchedXml.cancelada ? null : (diff > 0.01 ? valorPlanilha - matchedXml.vNF : 0),
        chNFe: matchedXml.chNFe,
        sheetName: row.sheetName,
      });
    } else {
      results.push({
        status: row.isFrete ? 'ok' : 'ausente_xml',
        nNF: row.nNF,
        serie: row.serie,
        data: row.dataDocumento || row.dataEntrada,
        cnpjEmitente: row.cnpjEmitente,
        nomeEmitente: row.nomeEmitente || (row.isFrete ? 'CT-e (Frete)' : ''),
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
