import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { LogOut, Database, Trash2, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExcelBaseSection } from '@/components/ExcelBaseSection';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';
import { toast } from 'sonner';

export const Route = createFileRoute('/xmls')({
  head: () => ({
    meta: [
      { title: 'XMLs Armazenados — Diretriz Contabilidade' },
      { name: 'description', content: 'Base de XMLs de NF-e armazenados por empresa.' },
    ],
  }),
  component: XmlsPage,
});

interface EmpresaOpt {
  id: string;
  razao_social: string;
}

interface XmlRow {
  id: string;
  ch_nfe: string;
  n_nf: string | null;
  serie: string | null;
  dh_emi: string | null;
  cnpj_emitente: string | null;
  x_nome: string | null;
  v_nf: number | null;
  v_ipi: number | null;
  cancelada: boolean;
  created_at: string;
}

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function competenciaFromDhEmi(dh: string | null): string {
  if (!dh) return '';
  const d = new Date(dh);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string): string {
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

function XmlsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [xmls, setXmls] = useState<XmlRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [search, setSearch] = useState('');
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string>('todas');
  const [cnpjFiltro, setCnpjFiltro] = useState<string>('todos');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

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
        if (data) {
          setEmpresas(data as EmpresaOpt[]);
          if (data.length > 0 && !empresaId) setEmpresaId((data[0] as EmpresaOpt).id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const carregarXmls = async (id: string) => {
    if (!id) {
      setXmls([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('xmls_armazenados')
      .select('id, ch_nfe, n_nf, serie, dh_emi, cnpj_emitente, x_nome, v_nf, v_ipi, cancelada, created_at')
      .eq('empresa_id', id)
      .order('dh_emi', { ascending: false })
      .limit(5000);
    if (error) {
      toast.error('Erro ao carregar XMLs', { description: error.message });
      setXmls([]);
    } else {
      setXmls((data ?? []) as XmlRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !empresaId) return;
    void carregarXmls(empresaId);
  }, [user, empresaId]);

  const competenciasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    xmls.forEach((x) => {
      const c = competenciaFromDhEmi(x.dh_emi);
      if (c) set.add(c);
    });
    return Array.from(set).sort().reverse();
  }, [xmls]);

  const cnpjsDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    xmls.forEach((x) => {
      if (x.cnpj_emitente) map.set(x.cnpj_emitente, x.x_nome ?? x.cnpj_emitente);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [xmls]);

  const xmlsFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return xmls.filter((x) => {
      if (statusFiltro === 'canceladas' && !x.cancelada) return false;
      if (statusFiltro === 'ativas' && x.cancelada) return false;
      if (competenciaFiltro !== 'todas' && competenciaFromDhEmi(x.dh_emi) !== competenciaFiltro) return false;
      if (cnpjFiltro !== 'todos' && x.cnpj_emitente !== cnpjFiltro) return false;
      if (q) {
        const hay = `${x.n_nf ?? ''} ${x.ch_nfe} ${x.x_nome ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [xmls, search, competenciaFiltro, cnpjFiltro, statusFiltro]);

  const excluirXml = async (id: string) => {
    if (!confirm('Excluir este XML da base? Essa ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('xmls_armazenados').delete().eq('id', id);
    if (error) {
      toast.error('Não foi possível excluir', { description: error.message });
      return;
    }
    toast.success('XML excluído');
    setXmls((prev) => prev.filter((x) => x.id !== id));
  };

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
              <Link to="/xmls" className="text-white font-medium">XMLs</Link>
              <Link to="/fechamentos" className="text-white/70 hover:text-white transition-colors">Fechamentos</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 hidden sm:inline">{user.email}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => signOut()}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-diretriz-red" /> Base de NF-e
            </h1>
            <p className="text-sm text-muted-foreground">
              XMLs e linhas de planilha armazenados são reutilizados automaticamente no próximo confronto.
            </p>
          </div>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="xmls" className="space-y-4">
          <TabsList>
            <TabsTrigger value="xmls">XMLs</TabsTrigger>
            <TabsTrigger value="excel">Planilhas (Excel)</TabsTrigger>
          </TabsList>

          <TabsContent value="xmls" className="space-y-4 mt-0">
          <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nº NF, chave ou emitente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={competenciaFiltro} onValueChange={setCompetenciaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Competência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as competências</SelectItem>
                {competenciasDisponiveis.map((c) => (
                  <SelectItem key={c} value={c}>{formatMonthLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativas">Apenas ativas</SelectItem>
                <SelectItem value="canceladas">Apenas canceladas</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:col-span-4">
              <Select value={cnpjFiltro} onValueChange={setCnpjFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Emitente (CNPJ)" />
                </SelectTrigger>
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
            {loading ? 'Carregando...' : `${xmlsFiltrados.length} de ${xmls.length} XMLs`}
          </div>
        </Card>

        <Card>
          {loading ? (
            <div className="p-12 flex justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : xmlsFiltrados.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {xmls.length === 0
                ? 'Nenhum XML armazenado para esta empresa ainda.'
                : 'Nenhum XML corresponde aos filtros.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Comp.</TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="text-right">vNF</TableHead>
                  <TableHead className="text-right">vIPI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {xmlsFiltrados.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell className="font-mono">{x.n_nf ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{x.serie ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {x.dh_emi ? new Date(x.dh_emi).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatMonthLabel(competenciaFromDhEmi(x.dh_emi))}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={x.x_nome ?? ''}>
                      {x.x_nome ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatCnpj(x.cnpj_emitente)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(x.v_nf)}</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(x.v_ipi)}</TableCell>
                    <TableCell>
                      {x.cancelada ? (
                        <Badge variant="destructive">🚫 Cancelada</Badge>
                      ) : (
                        <Badge variant="secondary">Ativa</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => excluirXml(x.id)}
                        title="Excluir XML"
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
          </TabsContent>

          <TabsContent value="excel" className="mt-0">
            <ExcelBaseSection empresaId={empresaId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
