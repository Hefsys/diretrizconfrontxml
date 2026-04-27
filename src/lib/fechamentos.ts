import { supabase } from '@/integrations/supabase/client';
import type { ConfrontoResult, ConfrontoSummary, FechamentoMensal } from './types';

export async function fecharMes(params: {
  empresaId: string;
  competencia: string; // "AAAA-MM"
  fechadoPor: string;
  resumo: ConfrontoSummary;
  resultados: ConfrontoResult[];
}): Promise<{ ok: boolean; error?: string }> {
  const { empresaId, competencia, fechadoPor, resumo, resultados } = params;
  const { error } = await supabase.from('fechamentos_mensais').insert({
    empresa_id: empresaId,
    competencia,
    fechado_por: fechadoPor,
    resumo: resumo as unknown as Record<string, unknown>,
    resultados: resultados as unknown as Record<string, unknown>[],
  });
  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return { ok: false, error: 'Esta competência já foi fechada para esta empresa.' };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listarFechamentos(empresaId?: string): Promise<FechamentoMensal[]> {
  let query = supabase.from('fechamentos_mensais').select('*').order('competencia', { ascending: false });
  if (empresaId) query = query.eq('empresa_id', empresaId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as FechamentoMensal[];
}

export async function listarCompetenciasFechadas(empresaId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('fechamentos_mensais')
    .select('competencia')
    .eq('empresa_id', empresaId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.competencia));
}
