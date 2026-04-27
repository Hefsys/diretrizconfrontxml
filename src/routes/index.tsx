import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useCallback, useEffect, type ComponentType } from 'react';
import type { WorkBook } from 'xlsx';
import type { ConfrontoResult, ConfrontoSummary } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Confronto NF-e — Diretriz Contabilidade' },
      { name: 'description', content: 'Confronte XMLs de NF-e com planilhas de Registro de Entrada ICMS.' },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ConfrontoResult[]>([]);
  const [summary, setSummary] = useState<ConfrontoSummary | null>(null);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [UploadComp, setUploadComp] = useState<ComponentType<any> | null>(null);
  const [ResultsComp, setResultsComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      import('@/components/UploadSection'),
      import('@/components/ResultsSection'),
    ]).then(([u, r]) => {
      setUploadComp(() => u.UploadSection);
      setResultsComp(() => r.ResultsSection);
    });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/auth' });
    }
  }, [authLoading, user, navigate]);

  const handleProcess = useCallback(async (xmlFiles: File[], workbook: WorkBook, selectedSheets: string[], empId: string) => {
    setIsProcessing(true);
    try {
      const { parseXmlFiles } = await import('@/lib/xml-parser');
      const { parseSheet } = await import('@/lib/excel-parser');
      const { runConfronto } = await import('@/lib/confronto-engine');
      const { salvarXmls, carregarXmlsDaEmpresa, mesclarXmls } = await import('@/lib/xml-storage');

      // 1. Parse uploaded XMLs
      const novosXmls = await parseXmlFiles(xmlFiles);

      // 2. Save new XMLs to the company's database
      let salvos = 0;
      if (novosXmls.length > 0 && user) {
        salvos = await salvarXmls(empId, user.id, novosXmls);
      }

      // 3. Load all stored XMLs for this company and merge
      const historicoXmls = await carregarXmlsDaEmpresa(empId);
      const todosXmls = mesclarXmls(novosXmls, historicoXmls);

      // 4. Load CNPJs that require IPI sum
      const { data: empresasIpi } = await supabase
        .from('empresas')
        .select('cnpj')
        .eq('soma_ipi_dealernet', true)
        .eq('ativo', true);
      const cnpjsComIpi = new Set<string>(
        (empresasIpi ?? []).map((e) => String(e.cnpj).replace(/[.\-\/\s]/g, ''))
      );

      // 5. Parse Excel and run confronto
      const allExcelData = selectedSheets.flatMap((sheet) => parseSheet(workbook, sheet));
      const { results: r, summary: s } = runConfronto(allExcelData, todosXmls, cnpjsComIpi);

      setEmpresaId(empId);
      setResults(r);
      setSummary(s);
      setView('results');

      if (novosXmls.length > 0) {
        toast.success(
          `${salvos} novo(s) XML salvo(s) na base · ${historicoXmls.length} XML(s) histórico(s) considerados`
        );
      } else if (historicoXmls.length > 0) {
        toast.info(`${historicoXmls.length} XML(s) da base histórica considerados`);
      }
    } catch (err) {
      console.error('Processing error:', err);
      toast.error('Erro ao processar confronto');
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const handleReset = useCallback(() => {
    setView('upload');
    setResults([]);
    setSummary(null);
    setEmpresaId('');
  }, []);


  const headerEl = (
    <header className="border-b border-border bg-sidebar backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <div className="flex items-center gap-6">
          <img src={logoDiretriz} alt="Diretriz Contabilidade" className="h-16" />
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-white font-medium">Confronto</Link>
            <Link to="/empresas" className="text-white/70 hover:text-white transition-colors">Empresas</Link>
            <Link to="/xmls" className="text-white/70 hover:text-white transition-colors">XMLs</Link>
            <Link to="/fechamentos" className="text-white/70 hover:text-white transition-colors">Fechamentos</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-white/70 hidden sm:inline">{user.email}</span>}
          {user && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => signOut()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
  if (authLoading || !user || !mounted || !UploadComp || !ResultsComp) {
    return (
      <div className="min-h-screen bg-background">
        {headerEl}
        <main className="flex min-h-[50vh] items-center justify-center p-6">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {headerEl}
      <main className="p-6">
        {view === 'upload' ? (
          <UploadComp onProcess={handleProcess} isProcessing={isProcessing} />
        ) : summary ? (
          <ResultsComp results={results} summary={summary} onReset={handleReset} empresaId={empresaId} />
        ) : null}
      </main>
    </div>
  );
}
