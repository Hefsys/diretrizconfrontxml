import type { XmlNfeData, ExcelNfeData, ConfrontoResult, ConfrontoSummary } from './types';

function cleanCnpj(v: string): string {
  return v.replace(/[.\-\/\s]/g, '');
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
    let matchKey = '';

    // Primary: match by chNFe
    if (row.chNFe && row.chNFe.length === 44) {
      matchedXml = xmlByChave.get(row.chNFe);
      if (matchedXml) matchKey = matchedXml.chNFe;
    }

    // Fallback: match by nNF + CNPJ
    if (!matchedXml && row.nNF && row.cnpjEmitente) {
      const key = `${row.nNF}_${cleanCnpj(row.cnpjEmitente)}`;
      matchedXml = xmlByNnfCnpj.get(key);
      if (matchedXml) matchKey = matchedXml.chNFe || key;
    }

    if (matchedXml) {
      matchedXmlKeys.add(matchedXml.chNFe || `${matchedXml.nNF}_${cleanCnpj(matchedXml.cnpjEmitente)}`);
      const diff = Math.abs(row.valorContabil - matchedXml.vNF);
      results.push({
        status: diff <= 0.01 ? 'ok' : 'divergente',
        nNF: row.nNF,
        serie: row.serie,
        data: row.dataDocumento || row.dataEntrada,
        cnpjEmitente: row.cnpjEmitente,
        nomeEmitente: row.nomeEmitente || matchedXml.xNome,
        valorPlanilha: row.valorContabil,
        valorXml: matchedXml.vNF,
        diferenca: diff > 0.01 ? row.valorContabil - matchedXml.vNF : 0,
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
        status: 'nao_escriturado',
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

  const summary: ConfrontoSummary = {
    totalPlanilha: excelData.length,
    totalXmls: xmlData.length,
    ok: results.filter((r) => r.status === 'ok').length,
    divergentes: results.filter((r) => r.status === 'divergente').length,
    ausentes: results.filter((r) => r.status === 'ausente_xml').length,
    naoEscriturados: results.filter((r) => r.status === 'nao_escriturado').length,
  };

  return { results, summary };
}
