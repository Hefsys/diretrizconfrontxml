import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trash2, Search, Upload } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { readWorkbook, getSheetNames, autoDetectSheet, parseSheet } from '@/lib/excel-parser';
import { salvarLinhasExcel } from '@/lib/excel-storage';

interface LinhaRow {
  id: string;
  n_nf: string;
  serie: string | null;
  cnpj_emitente: string | null;
  nome_emitente: string | null;
  data_documento: string | null;
  data_entrada: string | null;
  competencia: string | null;
  valor_contabil: number | null;
  cfop: string | null;
  sheet_name: string | null;
  created_at: string;
}

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatMonthLabel(key: string | null): string {
  if (!key) return '—';
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES_PT[idx]}/${year}`;
}

function formatCnpj(v: string | null): string {
  const s = String(v ?? '').replace(/\D/g, '');
  if (s.length !== 14) return v ?? '—';
  return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
}

function formatBRL(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ExcelBaseSection({ empresaId }: { empresaId: string }) {
  const { user } = useAuth();
  const [linhas, setLinhas] = useState<LinhaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [competenciaFiltro, setCompetenciaFiltro] = useState('todas');
  const [cnpjFiltro, setCnpjFiltro] = useState('todos');
  const [cfopFiltro, setCfopFiltro] = useState('todos');

  const carregar = async (id: string) => {
    if (!id) {
      setLinhas([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('excel_linhas_armazenadas')
      .select('id, n_nf, serie, cnpj_emitente, nome_emitente, data_documento, data_entrada, competencia, valor_contabil, cfop, sheet_name, created_at')
      .eq('empresa_id', id)
      .order('data_documento', { ascending: false })
      .limit(10000);
    if (error) {
      toast.error('Erro ao carregar linhas', { description: error.message });
      setLinhas([]);
    } else {
      setLinhas((data ?? []) as LinhaRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void carregar(empresaId);
  }, [empresaId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !empresaId) return;
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = readWorkbook(buffer);
      const sheets = getSheetNames(wb);
      // Importa todas as abas que parecem ter dados; senão usa autoDetect
      const auto = autoDetectSheet(wb);
      const target = sheets.length > 1 ? sheets : (auto ? [auto] : sheets);
      const linhasParsed = target.flatMap((s) => parseSheet(wb, s));
      if (linhasParsed.length === 0) {
        toast.error('Nenhuma linha válida encontrada na planilha');
        return;
      }
      const salvos = await salvarLinhasExcel(empresaId, user.id, linhasParsed);
      toast.success(`${salvos} nova(s) linha(s) salva(s) · ${linhasParsed.length - salvos} duplicada(s) ignorada(s)`);
      await carregar(empresaId);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar planilha');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const competenciasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    linhas.forEach((l) => { if (l.competencia) set.add(l.competencia); });
    return Array.from(set).sort().reverse();
  }, [linhas]);

  const cnpjsDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    linhas.forEach((l) => {
      if (l.cnpj_emitente) map.set(l.cnpj_emitente, l.nome_emitente ?? l.cnpj_emitente);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [linhas]);

  const cfopsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    linhas.forEach((l) => { if (l.cfop) set.add(l.cfop); });
    return Array.from(set).sort();
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return linhas.filter((l) => {
      if (competenciaFiltro !== 'todas' && l.competencia !== competenciaFiltro) return false;
      if (cnpjFiltro !== 'todos' && l.cnpj_emitente !== cnpjFiltro) return false;
      if (cfopFiltro !== 'todos' && l.cfop !== cfopFiltro) return false;
      if (q) {
        const hay = `${l.n_nf} ${l.nome_emitente ?? ''} ${l.cnpj_emitente ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [linhas, search, competenciaFiltro, cnpjFiltro, cfopFiltro]);

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta linha da base? Essa ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('excel_linhas_armazenadas').delete().eq('id', id);
    if (error) {
      toast.error('Não foi possível excluir', { description: error.message });
      return;
    }
    toast.success('Linha excluída');
    setLinhas((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Adicionar planilha Excel</p>
          <p className="text-xs text-muted-foreground">
            Linhas duplicadas (mesma NF + série + emitente + data) são ignoradas automaticamente.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsb,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !empresaId}
          className="bg-diretriz-red hover:bg-diretriz-red/90 text-white"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Selecionar planilha
            </>
          )}
        </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº NF, CNPJ ou emitente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={competenciaFiltro} onValueChange={setCompetenciaFiltro}>
            <SelectTrigger><SelectValue placeholder="Competência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as competências</SelectItem>
              {competenciasDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>{formatMonthLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cfopFiltro} onValueChange={setCfopFiltro}>
            <SelectTrigger><SelectValue placeholder="CFOP" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CFOPs</SelectItem>
              {cfopsDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-4">
            <Select value={cnpjFiltro} onValueChange={setCnpjFiltro}>
              <SelectTrigger><SelectValue placeholder="Emitente (CNPJ)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os emitentes</SelectItem>
                {cnpjsDisponiveis.map(([cnpj, nome]) => (
                  <SelectItem key={cnpj} value={cnpj}>
                    {nome} — {formatCnpj(cnpj)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {loading ? 'Carregando...' : `${linhasFiltradas.length} de ${linhas.length} linhas`}
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-12 flex justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : linhasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {linhas.length === 0
              ? 'Nenhuma linha de Excel armazenada para esta empresa ainda.'
              : 'Nenhuma linha corresponde aos filtros.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº NF</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Data Doc.</TableHead>
                <TableHead>Comp.</TableHead>
                <TableHead>Emitente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>CFOP</TableHead>
                <TableHead className="text-right">Valor Contábil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasFiltradas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono">{l.n_nf}</TableCell>
                  <TableCell className="font-mono text-xs">{l.serie || '—'}</TableCell>
                  <TableCell className="text-xs">{l.data_documento || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatMonthLabel(l.competencia)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={l.nome_emitente ?? ''}>
                    {l.nome_emitente ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatCnpj(l.cnpj_emitente)}</TableCell>
                  <TableCell className="font-mono text-xs">{l.cfop ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(l.valor_contabil)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => excluir(l.id)}
                      title="Excluir linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
