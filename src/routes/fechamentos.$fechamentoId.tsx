import { createFileRoute, useNavigate, Link, ErrorComponent } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ResultsSection } from '@/components/ResultsSection';
import type { FechamentoMensal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';

export const Route = createFileRoute('/fechamentos/$fechamentoId')({
  head: () => ({
    meta: [
      { title: 'Detalhe do Fechamento — Diretriz Contabilidade' },
      { name: 'description', content: 'Visualização detalhada de um fechamento mensal congelado.' },
    ],
  }),
  component: FechamentoDetailPage,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-2xl font-semibold">Fechamento não encontrado</h1>
      <Link to="/fechamentos" className="text-diretriz-red hover:underline">Voltar para Fechamentos</Link>
    </div>
  ),
});

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES_PT[idx]} / ${year}`;
}

function FechamentoDetailPage() {
  const { fechamentoId } = Route.useParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState<FechamentoMensal | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/auth' });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('fechamentos_mensais')
      .select('*')
      .eq('id', fechamentoId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const f = data as unknown as FechamentoMensal;
        setFechamento(f);
        const { data: emp } = await supabase
          .from('empresas')
          .select('razao_social')
          .eq('id', f.empresa_id)
          .maybeSingle();
        if (!cancelled && emp) setEmpresaNome(emp.razao_social);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, fechamentoId]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !fechamento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-2xl font-semibold">Fechamento não encontrado</h1>
        <Link to="/fechamentos" className="text-diretriz-red hover:underline">Voltar para Fechamentos</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">
          <div className="flex items-center gap-6">
            <img src={logoDiretriz} alt="Diretriz Contabilidade" className="h-16" />
            <nav className="flex items-center gap-4 text-sm">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Confronto</Link>
              <Link to="/empresas" className="text-white/70 hover:text-white transition-colors">Empresas</Link>
              <Link to="/xmls" className="text-white/70 hover:text-white transition-colors">XMLs</Link>
              <Link to="/fechamentos" className="text-white font-medium">Fechamentos</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => signOut()} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-4">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/fechamentos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-diretriz-dark transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para Fechamentos
          </Link>
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-diretriz-dark">{empresaNome || '—'}</span>
            {' · '}
            <span>Competência {formatMonthLabel(fechamento.competencia)}</span>
            {' · '}
            <span>Fechado em {new Date(fechamento.fechado_em).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <ResultsSection
          results={fechamento.resultados}
          summary={fechamento.resumo}
          empresaId={fechamento.empresa_id}
          readOnly
          resetLabel="Voltar"
          onReset={() => navigate({ to: '/fechamentos' })}
        />
      </main>
    </div>
  );
}
