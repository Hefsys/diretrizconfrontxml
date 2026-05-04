import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { listarFechamentos, excluirFechamento } from '@/lib/fechamentos';
import { exportResults } from '@/lib/export-excel';
import type { FechamentoMensal } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, LogOut, Lock, Eye, Trash2, Loader2 } from 'lucide-react';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';

export const Route = createFileRoute('/fechamentos')({
  head: () => ({
    meta: [
      { title: 'Fechamentos Mensais — Diretriz Contabilidade' },
      { name: 'description', content: 'Histórico de fechamentos mensais por empresa.' },
    ],
  }),
  component: FechamentosPage,
});

interface EmpresaOpt {
  id: string;
  razao_social: string;
}

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = parseInt(month, 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES_PT[idx]}/${year}`;
}

function FechamentosPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [fechamentos, setFechamentos] = useState<FechamentoMensal[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FechamentoMensal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await excluirFechamento(deleteTarget.id);
    setIsDeleting(false);
    if (!res.ok) {
      toast.error('Falha ao excluir', { description: res.error });
      return;
    }
    setFechamentos((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    toast.success('Análise excluída');
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: '/auth' });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('empresas')
      .select('id, razao_social')
      .order('razao_social', { ascending: true })
      .then(({ data }) => {
        if (data) setEmpresas(data as EmpresaOpt[]);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listarFechamentos(empresaId || undefined).then((d) => {
      setFechamentos(d);
      setLoading(false);
    });
  }, [user, empresaId]);

  const empresaNome = (id: string) => empresas.find((e) => e.id === id)?.razao_social ?? '—';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

      <main className="mx-auto max-w-7xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5 text-diretriz-red" /> Fechamentos Mensais
            </h1>
            <p className="text-sm text-muted-foreground">Histórico de competências congeladas por empresa.</p>
          </div>
          <Select value={empresaId || 'todos'} onValueChange={(v) => setEmpresaId(v === 'todos' ? '' : v)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          {loading ? (
            <div className="p-12 flex justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : fechamentos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhum fechamento encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Salvo em</TableHead>
                  <TableHead className="text-right">OK</TableHead>
                  <TableHead className="text-right">Divergentes</TableHead>
                  <TableHead className="text-right">Ausentes</TableHead>
                  <TableHead className="text-right">Não escriturados</TableHead>
                  <TableHead className="text-right">Canceladas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentos.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate({ to: '/fechamentos/$fechamentoId', params: { fechamentoId: f.id } })}
                  >
                    <TableCell className="font-medium text-diretriz-dark">
                      {f.titulo || <span className="italic text-muted-foreground">— sem título —</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{formatMonthLabel(f.competencia)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{empresaNome(f.empresa_id)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(f.fechado_em).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{f.resumo.ok}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{f.resumo.divergentes}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{f.resumo.ausentes}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">{f.resumo.naoEscriturados}</TableCell>
                    <TableCell className="text-right font-mono text-zinc-600">{f.resumo.canceladas}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: '/fechamentos/$fechamentoId', params: { fechamentoId: f.id } })}
                          title="Abrir detalhe"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => exportResults(f.resultados)}
                          title="Baixar Excel"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {f.fechado_por === user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(f)}
                            title="Excluir análise"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}
