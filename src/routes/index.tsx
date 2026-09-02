import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useCallback, useEffect, Component, type ReactNode, type ComponentType } from 'react';
import type { WorkBook } from 'xlsx';
import type { ConfrontoResult, ConfrontoSummary } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';

class ResultsErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[confronto] erro ao exibir os resultados:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Não foi possível exibir os resultados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O confronto foi processado, mas ocorreu um erro ao montar a tela. Detalhe técnico:
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-destructive">
          {error.name}: {error.message}
        </pre>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => this.setState({ error: null })}>Tentar novamente</Button>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset();
            }}
          >
            Voltar ao envio
          </Button>
        </div>
      </div>
    );
  }
}



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
  const [progressLabel, setProgressLabel] = useState('');
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

  const handleProcess = useCallback(async (xmlFiles: File[], workbook: WorkBook | null, selectedSheets: string[], empId: string) => {
    setIsProcessing(true);
    setProgressLabel('');
    try {
      const { parseXmlFiles } = await import('@/lib/xml-parser');
      const { parseSheet } = await import('@/lib/excel-parser');
      const { runConfronto } = await import('@/lib/confronto-engine');
      const { salvarXmls, carregarXmlsDaEmpresa, mesclarXmls } = await import('@/lib/xml-storage');
      const { salvarLinhasExcel, carregarLinhasDaEmpresa, mesclarLinhas } = await import('@/lib/excel-storage');

      // 1. Parse uploaded XMLs
      const novosXmls = xmlFiles.length > 0
        ? await parseXmlFiles(xmlFiles, (lidos, total) =>
            setProgressLabel(`Lendo XMLs: ${lidos} de ${total}`))
        : [];

      // 2. Save new XMLs to the company's database
      let xmlsSalvos = 0;
      if (novosXmls.length > 0 && user) {
        xmlsSalvos = await salvarXmls(empId, user.id, novosXmls, (salvos, total) =>
          setProgressLabel(`Salvando XMLs: ${salvos} de ${total}`));
      }

      // 3. Load all stored XMLs for this company and merge
      setProgressLabel('Carregando base de XMLs…');
      const historicoXmls = await carregarXmlsDaEmpresa(empId, (carregados, total) =>
        setProgressLabel(`Carregando base de XMLs: ${carregados} de ${total}`));
      const todosXmls = mesclarXmls(novosXmls, historicoXmls);

      // 4. Parse Excel (se enviado), salvar novas linhas e mesclar com base histórica
      setProgressLabel('Lendo planilha…');
      const novasLinhas = workbook
        ? selectedSheets.flatMap((sheet) => parseSheet(workbook, sheet))
        : [];
      let linhasSalvas = 0;
      if (novasLinhas.length > 0 && user) {
        setProgressLabel(`Salvando ${novasLinhas.length} linha(s) da planilha…`);
        linhasSalvas = await salvarLinhasExcel(empId, user.id, novasLinhas);
      }
      const historicoLinhas = await carregarLinhasDaEmpresa(empId, (carregadas, total) =>
        setProgressLabel(`Carregando base de planilhas: ${carregadas} de ${total}`));
      const todasLinhas = mesclarLinhas(novasLinhas, historicoLinhas);

      if (todasLinhas.length === 0) {
        toast.error('Nenhuma linha de planilha disponível para esta empresa. Envie um Excel.');
        return;
      }

      setProgressLabel(`Comparando ${todasLinhas.length} linha(s) com ${todosXmls.length} XML(s)…`);
      await new Promise((r) => setTimeout(r, 0));
      const { results: r, summary: s } = runConfronto(todasLinhas, todosXmls);

      setEmpresaId(empId);
      setResults(r);
      setSummary(s);
      setView('results');

      const partes: string[] = [];
      if (novosXmls.length > 0) partes.push(`${xmlsSalvos} novo(s) XML salvo(s)`);
      if (novasLinhas.length > 0) partes.push(`${linhasSalvas} nova(s) linha(s) Excel salva(s)`);
      if (historicoXmls.length > 0) partes.push(`${historicoXmls.length} XML(s) histórico(s)`);
      if (historicoLinhas.length > 0) partes.push(`${historicoLinhas.length} linha(s) Excel histórica(s)`);
      if (partes.length > 0) toast.success(partes.join(' · '));
    } catch (err) {
      console.error('Processing error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao processar confronto: ${msg}`, { duration: 12000 });
    } finally {
      setProgressLabel('');
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
          <UploadComp onProcess={handleProcess} isProcessing={isProcessing} progressLabel={progressLabel} />
        ) : summary ? (
          <ResultsComp results={results} summary={summary} onReset={handleReset} empresaId={empresaId} />
        ) : null}
      </main>
    </div>
  );
}
