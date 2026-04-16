import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConfrontoResult, ConfrontoSummary, ConfrontoStatus } from '@/lib/types';
import { exportResults } from '@/lib/export-excel';

interface ResultsSectionProps {
  results: ConfrontoResult[];
  summary: ConfrontoSummary;
  onReset: () => void;
}

const STATUS_CONFIG: Record<ConfrontoStatus, { label: string; color: string; emoji: string }> = {
  ok: { label: 'OK', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', emoji: '✅' },
  divergente: { label: 'Divergente', color: 'bg-amber-100 text-amber-800 border-amber-200', emoji: '⚠️' },
  ausente_xml: { label: 'Ausente no XML', color: 'bg-red-100 text-red-800 border-red-200', emoji: '❌' },
  nao_escriturado: { label: 'Não escriturado', color: 'bg-blue-100 text-blue-800 border-blue-200', emoji: '🔵' },
};

type FilterType = 'todos' | ConfrontoStatus;

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

export function ResultsSection({ results, summary, onReset }: ResultsSectionProps) {
  const [filter, setFilter] = useState<FilterType>('todos');

  const filtered = useMemo(
    () => (filter === 'todos' ? results : results.filter((r) => r.status === filter)),
    [results, filter]
  );

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: results.length },
    { key: 'ok', label: '✅ OK', count: summary.ok },
    { key: 'divergente', label: '⚠️ Divergente', count: summary.divergentes },
    { key: 'ausente_xml', label: '❌ Ausente no XML', count: summary.ausentes },
    { key: 'nao_escriturado', label: '🔵 Não escriturado', count: summary.naoEscriturados },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-diretriz-dark">Resultado do Confronto</h1>
          <p className="text-sm text-muted-foreground">
            {results.length} registros processados
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => exportResults(results)}>
            Exportar Excel
          </Button>
          <Button onClick={onReset} className="bg-diretriz-red text-white hover:bg-diretriz-red/90">
            Nova Análise
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Planilha" value={summary.totalPlanilha} />
        <SummaryCard label="Total XMLs" value={summary.totalXmls} />
        <SummaryCard label="OK" value={summary.ok} color="text-emerald-600" />
        <SummaryCard label="Divergentes" value={summary.divergentes} color="text-amber-600" />
        <SummaryCard label="Ausentes" value={summary.ausentes} color="text-red-600" />
        <SummaryCard label="Não escriturados" value={summary.naoEscriturados} color="text-blue-600" />
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
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
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
