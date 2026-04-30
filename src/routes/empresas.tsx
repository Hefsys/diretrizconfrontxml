import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, LogOut } from 'lucide-react';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';

export const Route = createFileRoute('/empresas')({
  head: () => ({
    meta: [
      { title: 'Empresas — Diretriz Contabilidade' },
      { name: 'description', content: 'Cadastro de empresas/clientes da contabilidade.' },
    ],
  }),
  component: EmpresasPage,
});

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  soma_ipi_dealernet: boolean;
  created_by: string | null;
}

const empresaSchema = z.object({
  razao_social: z.string().trim().min(2, 'Razão social obrigatória').max(200),
  nome_fantasia: z.string().trim().max(200).optional().or(z.literal('')),
  cnpj: z.string().trim().min(14, 'CNPJ inválido').max(18),
  inscricao_estadual: z.string().trim().max(50).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  telefone: z.string().trim().max(30).optional().or(z.literal('')),
  endereco: z.string().trim().max(255).optional().or(z.literal('')),
  cidade: z.string().trim().max(100).optional().or(z.literal('')),
  uf: z.string().trim().max(2).optional().or(z.literal('')),
});

function EmpresasPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/auth' });
    }
  }, [user, authLoading, navigate]);

  const loadEmpresas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .order('razao_social', { ascending: true });
    if (!error && data) setEmpresas(data as Empresa[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadEmpresas();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (e: Empresa) => {
    setEditing(e);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const parsed = empresaSchema.safeParse({
      razao_social: fd.get('razao_social'),
      nome_fantasia: fd.get('nome_fantasia') ?? '',
      cnpj: fd.get('cnpj'),
      inscricao_estadual: fd.get('inscricao_estadual') ?? '',
      email: fd.get('email') ?? '',
      telefone: fd.get('telefone') ?? '',
      endereco: fd.get('endereco') ?? '',
      cidade: fd.get('cidade') ?? '',
      uf: fd.get('uf') ?? '',
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      nome_fantasia: parsed.data.nome_fantasia || null,
      inscricao_estadual: parsed.data.inscricao_estadual || null,
      email: parsed.data.email || null,
      telefone: parsed.data.telefone || null,
      endereco: parsed.data.endereco || null,
      cidade: parsed.data.cidade || null,
      uf: parsed.data.uf?.toUpperCase() || null,
      soma_ipi_dealernet: fd.get('soma_ipi_dealernet') === 'on',
    };

    let result;
    if (editing) {
      result = await supabase.from('empresas').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('empresas').insert({ ...payload, created_by: user!.id });
    }
    setSaving(false);
    if (result.error) {
      setFormError(result.error.message.includes('duplicate') ? 'Já existe uma empresa com este CNPJ.' : result.error.message);
      return;
    }
    setDialogOpen(false);
    loadEmpresas();
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
              <Link to="/empresas" className="text-white font-medium">Empresas</Link>
              <Link to="/xmls" className="text-white/70 hover:text-white transition-colors">XMLs</Link>
              <Link to="/fechamentos" className="text-white/70 hover:text-white transition-colors">Fechamentos</Link>
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

      <main className="mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Empresas</h1>
            <p className="text-sm text-muted-foreground">Cadastro de clientes da contabilidade.</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova empresa
          </Button>
        </div>

        <Card className="bg-card">
          {loading ? (
            <div className="p-12 flex justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : empresas.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma empresa cadastrada. Clique em <strong>Nova empresa</strong> para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="font-medium">{e.razao_social}</div>
                      {e.nome_fantasia && <div className="text-xs text-muted-foreground">{e.nome_fantasia}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{e.cnpj}</TableCell>
                    <TableCell className="text-sm">
                      {[e.cidade, e.uf].filter(Boolean).join(' / ') || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.ativo ? 'default' : 'secondary'}>
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar empresa' : 'Nova empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="razao_social">Razão Social *</Label>
                <Input id="razao_social" name="razao_social" defaultValue={editing?.razao_social ?? ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                <Input id="nome_fantasia" name="nome_fantasia" defaultValue={editing?.nome_fantasia ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input id="cnpj" name="cnpj" defaultValue={editing?.cnpj ?? ''} required placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input id="inscricao_estadual" name="inscricao_estadual" defaultValue={editing?.inscricao_estadual ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" defaultValue={editing?.telefone ?? ''} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ''} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" name="endereco" defaultValue={editing?.endereco ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" name="cidade" defaultValue={editing?.cidade ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" name="uf" maxLength={2} defaultValue={editing?.uf ?? ''} />
              </div>
              <div className="sm:col-span-2 rounded-md border border-border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  <strong>Soma de IPI:</strong> agora é automática por nota — o sistema soma as colunas AA + AR do RFS008 ao Valor Contábil somente quando a NF possui IPI no XML (vIPI &gt; 0). Não é mais necessário marcar fornecedores manualmente.
                </p>
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
