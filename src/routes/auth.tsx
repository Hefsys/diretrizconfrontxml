import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState, useEffect, type FormEvent } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logoDiretriz from '@/assets/logo-diretriz-vertical.png';

export const Route = createFileRoute('/auth')({
  head: () => ({
    meta: [
      { title: 'Acesso — Diretriz Contabilidade' },
      { name: 'description', content: 'Faça login ou cadastre-se no Confronto NF-e da Diretriz Contabilidade.' },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').max(100),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe seu nome completo').max(100),
  cargo: z.string().trim().max(100).optional(),
  email: z.string().trim().email('E-mail inválido').max(255),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres').max(100),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: '/' });
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : err.message);
      return;
    }
    navigate({ to: '/' });
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      full_name: fd.get('full_name'),
      cargo: fd.get('cargo') || undefined,
      email: fd.get('email'),
      password: fd.get('password'),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.full_name,
          cargo: parsed.data.cargo ?? '',
        },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message.includes('already registered') ? 'Este e-mail já está cadastrado.' : err.message);
      return;
    }
    setInfo('Cadastro realizado! Você já pode fazer login.');
    setTab('signin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-sidebar backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">
          <img src={logoDiretriz} alt="Diretriz Contabilidade" className="h-16" />
          <span className="text-xs uppercase tracking-widest text-white/70">Confronto NF-e</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-6 bg-card">
          <h1 className="text-2xl font-semibold mb-1">Acesso ao sistema</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Faça login ou crie sua conta para acessar o Confronto NF-e.
          </p>
          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'signin' | 'signup'); setError(null); setInfo(null); }}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-mail</Label>
                  <Input id="signin-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input id="signin-password" name="password" type="password" autoComplete="current-password" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-primary">{info}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando…' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input id="signup-name" name="full_name" type="text" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-cargo">Cargo (opcional)</Label>
                  <Input id="signup-cargo" name="cargo" type="text" placeholder="Contador, Analista…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" name="password" type="password" autoComplete="new-password" required minLength={6} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {info && <p className="text-sm text-primary">{info}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Cadastrando…' : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-6 text-xs text-center text-muted-foreground">
            <Link to="/" className="hover:underline">Voltar ao início</Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
