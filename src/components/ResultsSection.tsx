import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Upload, CalendarDays, Search, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ConfrontoResult, ConfrontoSummary, ConfrontoStatus } from '@/lib/types';
import { exportResults } from '@/lib/export-excel';
import { getMonthKey } from '@/lib/confronto-engine';
import { fecharMes, listarCompetenciasFechadas } from '@/lib/fechamentos';
import { useAuth } from '@/hooks/useAuth';

interface ResultsSectionProps {
  results: ConfrontoResult[];
  summary: ConfrontoSummary;
  onReset: () => void;
  empresaId?: string;
  readOnly?: boolean;
  resetLabel?: string;
}

const STATUS_CONFIG: Record<ConfrontoStatus, { label: string; color: string; emoji: string }> = {
  ok: { label: 'OK', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', emoji: '✅' },
  divergente: { label: 'Divergente', color: 'bg-amber-100 text-amber-800 border-amber-200', emoji: '⚠️' },
  ausente_xml: { label: 'Ausente no XML', color: 'bg-red-100 text-red-800 border-red-200', emoji: '❌' },
  nao_escriturado: { label: 'Não escriturado', color: 'bg-blue-100 text-blue-800 border-blue-200', emoji: '🔵' },
  cancelada: { label: 'Cancelada', color: 'bg-zinc-200 text-zinc-700 border-zinc-300', emoji: '🚫' },
};

type FilterType = 'todos' | ConfrontoStatus;
type MonthSelection = 'todos' | string;

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatMonthLabel(key: string): string {
  if (key === 'sem-data') return 'Sem data';
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES_PT[idx]}/${year}`;
}

function formatCurrency(v: number | null): string {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCnpj(v: string): string {
  if (v.length === 14) {
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (v.length === 11) {
    return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return v;
}

export function ResultsSection({ results: initialResults, summary: initialSummary, onReset, empresaId, readOnly = false, resetLabel }: ResultsSectionProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<ConfrontoResult[]>(initialResults);
  const [summary, setSummary] = useState<ConfrontoSummary>(initialSummary);
  const [filter, setFilter] = useState<FilterType>('todos');
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>('todos');
  const [searchNf, setSearchNf] = useState('');
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [isAddingXmls, setIsAddingXmls] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [competenciasFechadas, setCompetenciasFechadas] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load list of closed competencies for this empresa
  useEffect(() => {
    if (!empresaId) return;
    listarCompetenciasFechadas(empresaId).then(setCompetenciasFechadas);
  }, [empresaId]);

  // Months available in the dataset, sorted chronologically with counts
  const monthsAvailable = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      const key = getMonthKey(r.data);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => {
        if (a === 'sem-data') return 1;
        if (b === 'sem-data') return -1;
        return a.localeCompare(b);
      })
      .map(([key, count]) => ({ key, count }));
  }, [results]);

  // Results filtered by selected month
  const resultsForMonth = useMemo(
    () => (selectedMonth === 'todos' ? results : results.filter((r) => getMonthKey(r.data) === selectedMonth)),
    [results, selectedMonth]
  );

  // Summary recalculated for the selected month
  const summaryForMonth = useMemo<ConfrontoSummary>(() => {
    if (selectedMonth === 'todos') return summary;
    return {
      totalPlanilha: resultsForMonth.filter((r) => r.valorPlanilha !== null).length,
      totalXmls: resultsForMonth.filter((r) => r.valorXml !== null).length,
      ok: resultsForMonth.filter((r) => r.status === 'ok').length,
      divergentes: resultsForMonth.filter((r) => r.status === 'divergente').length,
      ausentes: resultsForMonth.filter((r) => r.status === 'ausente_xml').length,
      naoEscriturados: resultsForMonth.filter((r) => r.status === 'nao_escriturado').length,
      canceladas: resultsForMonth.filter((r) => r.status === 'cancelada').length,
    };
  }, [resultsForMonth, selectedMonth, summary]);

  const filtered = useMemo(() => {
    let arr = filter === 'todos' ? resultsForMonth : resultsForMonth.filter((r) => r.status === filter);
    const q = searchNf.trim();
    if (q) arr = arr.filter((r) => r.nNF && r.nNF.includes(q));
    return arr;
  }, [resultsForMonth, filter, searchNf]);

  const isMonthClosed = selectedMonth !== 'todos' && competenciasFechadas.has(selectedMonth);
  const canCloseMonth = !!empresaId && !!user && selectedMonth !== 'todos' && !isMonthClosed;

  const handleCloseMonth = async () => {
    if (!empresaId || !user || selectedMonth === 'todos') return;
    setIsClosing(true);
    try {
      const res = await fecharMes({
        empresaId,
        competencia: selectedMonth,
        fechadoPor: user.id,
        resumo: summaryForMonth,
        resultados: resultsForMonth,
      });
      if (!res.ok) {
        toast.error(res.error ?? 'Erro ao fechar mês');
        return;
      }
      setCompetenciasFechadas((prev) => new Set(prev).add(selectedMonth));
      exportResults(resultsForMonth);
      toast.success(`Competência ${formatMonthLabel(selectedMonth)} fechada e Excel gerado.`);
    } finally {
      setIsClosing(false);
      setConfirmCloseOpen(false);
    }
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: resultsForMonth.length },
    { key: 'ok', label: '✅ OK', count: summaryForMonth.ok },
    { key: 'divergente', label: '⚠️ Divergente', count: summaryForMonth.divergentes },
    { key: 'ausente_xml', label: '❌ Ausente no XML', count: summaryForMonth.ausentes },
    { key: 'nao_escriturado', label: '🔵 Não escriturado', count: summaryForMonth.naoEscriturados },
    { key: 'cancelada', label: '🚫 Cancelada', count: summaryForMonth.canceladas },
  ];

  const handleAddXmlsClick = () => fileInputRef.current?.click();

  const processXmlFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsAddingXmls(true);
    try {
      const { parseXmlFiles } = await import('@/lib/xml-parser');
      const { reconcileMissing } = await import('@/lib/confronto-engine');
      const { salvarXmls } = await import('@/lib/xml-storage');
      const xmlData = await parseXmlFiles(files);

      // Persistir os XMLs na base da empresa para reaproveitamento futuro
      let salvos = 0;
      if (empresaId && user && xmlData.length > 0) {
        salvos = await salvarXmls(empresaId, user.id, xmlData);
      }

      // Filtro de mês: aceita também notas com data não parseada ('sem-data')
      const monthFilter = selectedMonth === 'todos'
        ? undefined
        : (row: ConfrontoResult) => {
            const k = getMonthKey(row.data);
            return k === selectedMonth || k === 'sem-data';
          };
      const { results: newResults, summary: newSummary, matched, unmatched } = reconcileMissing(
        results,
        xmlData,
        monthFilter
      );
      setResults(newResults);
      setSummary(newSummary);
      const monthLabel = selectedMonth === 'todos' ? '' : `${formatMonthLabel(selectedMonth)}: `;
      const descParts: string[] = [];
      if (unmatched > 0) descParts.push(`${unmatched} XML(s) sem correspondência adicionado(s) como "Não escriturado"`);
      if (salvos > 0) descParts.push(`${salvos} XML(s) salvo(s) na base da empresa`);
      toast.success(`${monthLabel}${matched} nota(s) reconciliada(s)`, {
        description: descParts.length > 0 ? descParts.join(' · ') : undefined,
      });
    } catch (err) {
      console.error('Erro ao adicionar XMLs:', err);
      toast.error('Falha ao processar XMLs');
    } finally {
      setIsAddingXmls(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleXmlFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.name.toLowerCase().endsWith('.xml'));
    await processXmlFiles(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.name.toLowerCase().endsWith('.xml'));
    if (files.length === 0) {
      toast.error('Nenhum arquivo XML encontrado');
      return;
    }
    await processXmlFiles(files);
  };

  const handleConfirmDelete = async () => {
    if (deleteIdx === null) return;
    const rowToDelete = filtered[deleteIdx];
    const realIdx = results.indexOf(rowToDelete);
    if (realIdx === -1) {
      setDeleteIdx(null);
      return;
    }
    const { recomputeSummary } = await import('@/lib/confronto-engine');
    const newResults = results.filter((_, i) => i !== realIdx);
    setResults(newResults);
    setSummary(recomputeSummary(newResults));
    setDeleteIdx(null);
    toast.success('Registro removido');
  };

  const showDropzone = !readOnly && selectedMonth !== 'todos' && summaryForMonth.ausentes > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-diretriz-dark">Resultado do Confronto</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {selectedMonth !== 'todos' && (
              <>
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium text-diretriz-dark">{formatMonthLabel(selectedMonth)}</span>
                <span>·</span>
              </>
            )}
            {resultsForMonth.length} registro{resultsForMonth.length === 1 ? '' : 's'}
            {selectedMonth !== 'todos' ? ' nesta competência' : ' processados'}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            multiple
            className="hidden"
            onChange={handleXmlFiles}
          />
          {!readOnly && summaryForMonth.ausentes > 0 && (
            <Button variant="outline" onClick={handleAddXmlsClick} disabled={isAddingXmls}>
              {isAddingXmls ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar XMLs
            </Button>
          )}
          {!readOnly && canCloseMonth && (
            <Button
              variant="outline"
              onClick={() => setConfirmCloseOpen(true)}
              disabled={isClosing}
              className="border-diretriz-red/40 text-diretriz-red hover:bg-diretriz-red/5"
            >
              {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Fechar mês
            </Button>
          )}
          {(readOnly || isMonthClosed) && (
            <Badge variant="outline" className="border-diretriz-red/40 text-diretriz-red flex items-center gap-1 px-3">
              <Lock className="h-3 w-3" /> Mês fechado
            </Badge>
          )}
          <Button variant="outline" onClick={() => exportResults(resultsForMonth)}>
            Exportar Excel
          </Button>
          <Button onClick={onReset} className="bg-diretriz-red text-white hover:bg-diretriz-red/90">
            {resetLabel ?? 'Nova Análise'}
          </Button>
        </div>
      </div>

      {/* Search by NF number */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nº da NF…"
          value={searchNf}
          onChange={(e) => setSearchNf(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Month chips */}
      {monthsAvailable.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Competência:</span>
          <button
            onClick={() => setSelectedMonth('todos')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selectedMonth === 'todos'
                ? 'border-diretriz-dark bg-diretriz-dark text-white'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            Todos ({results.length})
          </button>
          {monthsAvailable.map((m) => {
            const closed = competenciasFechadas.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => setSelectedMonth(m.key)}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedMonth === m.key
                    ? 'border-diretriz-dark bg-diretriz-dark text-white'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                {closed && <Lock className="h-3 w-3" />}
                {formatMonthLabel(m.key)} ({m.count})
              </button>
            );
          })}
        </div>
      )}

      {/* Dropzone for selected month */}
      {showDropzone && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={handleAddXmlsClick}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
            isDragOver
              ? 'border-diretriz-red bg-diretriz-red/5'
              : 'border-diretriz-red/30 bg-background hover:bg-muted/30'
          }`}
        >
          {isAddingXmls ? (
            <Loader2 className="h-6 w-6 animate-spin text-diretriz-red" />
          ) : (
            <Upload className="h-6 w-6 text-diretriz-red" />
          )}
          <p className="text-sm font-medium text-diretriz-dark">
            Arraste XMLs de {formatMonthLabel(selectedMonth)} aqui ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            {summaryForMonth.ausentes} nota(s) ausente(s) aguardando reconciliação
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-7">
        <SummaryCard label="Total Planilha" value={summaryForMonth.totalPlanilha} />
        <SummaryCard label="Total XMLs" value={summaryForMonth.totalXmls} />
        <SummaryCard label="OK" value={summaryForMonth.ok} color="text-emerald-600" />
        <SummaryCard label="Divergentes" value={summaryForMonth.divergentes} color="text-amber-600" />
        <SummaryCard label="Ausentes" value={summaryForMonth.ausentes} color="text-red-600" />
        <SummaryCard label="Não escriturados" value={summaryForMonth.naoEscriturados} color="text-blue-600" />
        <SummaryCard label="Canceladas" value={summaryForMonth.canceladas} color="text-zinc-600" />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? 'border-diretriz-dark bg-diretriz-dark text-white'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[140px]">Status</TableHead>
                    <TableHead>Nº NF</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>CNPJ Emitente</TableHead>
                    <TableHead>Nome Emitente</TableHead>
                    <TableHead className="text-right">Valor Planilha</TableHead>
                    <TableHead className="text-right">Valor XML</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Chave NF-e</TableHead>
                    {!readOnly && <TableHead className="w-[60px] text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => {
                    const cfg = STATUS_CONFIG[row.status];
                    return (
                      <TableRow key={i} className={i % 2 === 0 ? '' : 'bg-muted/30'}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap ${cfg.color}`}
                          >
                            {cfg.emoji} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{row.nNF}</TableCell>
                        <TableCell>{row.serie}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.data}</TableCell>
                        <TableCell className="font-mono text-xs">{formatCnpj(row.cnpjEmitente)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.nomeEmitente}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.valorPlanilha)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.valorXml)}</TableCell>
                        <TableCell className={`text-right font-mono ${row.diferenca && row.diferenca !== 0 ? 'font-bold text-amber-600' : ''}`}>
                          {row.diferenca !== null && row.diferenca !== 0
                            ? formatCurrency(row.diferenca)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {row.chNFe ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help font-mono text-xs text-muted-foreground">
                                  {row.chNFe.slice(0, 12)}...{row.chNFe.slice(-6)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="font-mono text-xs break-all">{row.chNFe}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteIdx(i)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">Excluir registro</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={readOnly ? 10 : 11} className="py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado para este filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteIdx !== null} onOpenChange={(open) => !open && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro do confronto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro apenas desta sessão e dos resultados exportados. Use para descartar notas canceladas ou lançamentos inválidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar competência {selectedMonth !== 'todos' && formatMonthLabel(selectedMonth)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação congela o resultado da competência para esta empresa e gera o Excel de fechamento.
              O mês não poderá mais ser reaberto, e tentativas futuras de fechar a mesma competência serão bloqueadas.
              Todas as {resultsForMonth.length} linhas (OK, divergentes, ausentes, não escriturados e canceladas) serão salvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseMonth} disabled={isClosing} className="bg-diretriz-red text-white hover:bg-diretriz-red/90">
              {isClosing ? 'Fechando…' : 'Fechar e gerar Excel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center p-4">
        <span className={`text-2xl font-bold ${color ?? 'text-diretriz-dark'}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
