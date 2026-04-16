import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useEffect, lazy, Suspense, type ComponentType } from 'react';
import type { WorkBook } from 'xlsx';
import type { ConfrontoResult, ConfrontoSummary } from '@/lib/types';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Confronto NF-e — Diretriz Contabilidade' },
      { name: 'description', content: 'Confronte XMLs de NF-e com planilhas de Registro de Entrada ICMS.' },
    ],
  }),
  component: Index,
});

const LazyUploadSection = lazy(() =>
  import('@/components/UploadSection').then((m) => ({ default: m.UploadSection }))
);
const LazyResultsSection = lazy(() =>
  import('@/components/ResultsSection').then((m) => ({ default: m.ResultsSection }))
);

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-diretriz-red border-t-transparent" />
    </div>
  );
}

function Index() {
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ConfrontoResult[]>([]);
  const [summary, setSummary] = useState<ConfrontoSummary | null>(null);

  const handleProcess = useCallback(async (xmlFiles: File[], workbook: WorkBook, selectedSheets: string[]) => {
    setIsProcessing(true);
    try {
      const { parseXmlFiles } = await import('@/lib/xml-parser');
      const { parseSheet } = await import('@/lib/excel-parser');
      const { runConfronto } = await import('@/lib/confronto-engine');

      const xmlData = await parseXmlFiles(xmlFiles);
      const allExcelData = selectedSheets.flatMap((sheet) => parseSheet(workbook, sheet));
      const { results: r, summary: s } = runConfronto(allExcelData, xmlData);
      setResults(r);
      setSummary(s);
      setView('results');
    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setView('upload');
    setResults([]);
    setSummary(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-diretriz-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-white">Diretriz</span>
            <span className="text-sm text-white/60">Contabilidade</span>
          </div>
          <span className="text-xs text-white/40">Confronto NF-e</span>
        </div>
      </header>

      <main className="p-6">
        <Suspense fallback={<LoadingSpinner />}>
          {view === 'upload' ? (
            <LazyUploadSection onProcess={handleProcess} isProcessing={isProcessing} />
          ) : summary ? (
            <LazyResultsSection results={results} summary={summary} onReset={handleReset} />
          ) : null}
        </Suspense>
      </main>
    </div>
  );
}
