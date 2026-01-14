-- FINANCEPRO - AUTH & RBAC SCHEMA
-- Este arquivo contém a lógica de permissões e perfis de usuários.

-- 1. Definição dos Níveis de Acesso
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
        'adm',          -- Permissão geral + Gestão de Usuários
        'usuario_rv',   -- Acesso: Renda Variável + Importação + E-mails
        'usuario_rf',   -- Acesso: Renda Fixa + Importação + E-mails
        'user_bkfc'     -- Acesso: Renda Variável + Renda Fixa + Importação + E-mails
    );
  END IF;
END $$;

-- 2. Tabela de Perfis Extendida
-- Vinculada ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone DEFAULT now(),
  full_name text,
  email text,
  role user_role NOT NULL DEFAULT 'usuario_rv',
  
  -- Campos de auditoria/metadados
  last_login timestamp with time zone,
  is_active boolean DEFAULT true
);

-- 3. Segurança (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para evitar recursão infinita no RLS
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (role = 'adm')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de Acesso:
-- Admins podem ver e editar tudo (usando a função para evitar recursão)
CREATE POLICY "Admins can do everything" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.check_is_admin()
  );

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Usuários podem atualizar apenas alguns campos do seu perfil (ex: nome)
CREATE POLICY "Users can update own details" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Automação: Criação de Perfil no Signup
-- Função que será executada pelo Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'usuario_rv')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado após inserção na tabela nativa do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Comentários de Documentação (Permissions Mapping)
COMMENT ON COLUMN public.profiles.role IS 'adm: Full Access; usuario_rv: RV Only; usuario_rf: RF Only; user_bkfc: RV+RF Access';
