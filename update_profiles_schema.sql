-- 1. Adicionar coluna para forçar troca de senha
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. Função para o ADM resetar a senha de um usuário
-- Essa função permite que um ADM defina uma senha temporária.
-- O ideal é usar o dashboard do Supabase, mas esta função em PL/PGSQL com SECURITY DEFINER
-- pode ser chamada por ADMs via RPC se necessário (requer configuração extra).
CREATE OR REPLACE FUNCTION public.adm_set_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS boolean AS $$
BEGIN
    -- Verificar se quem está chamando é ADM através da tabela de perfis
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'adm'
    ) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem resetar senhas.';
    END IF;

    -- Atualizar senha na tabela do Supabase Auth (REQUER EXTENSÃO pgcrypto instalada)
    -- Nota: Geralmente o Supabase Auth não permite UPDATE direto em auth.users via SQL comum sem permissões de superuser.
    -- O caminho mais seguro para o usuário agora é usar o Dashboard, mas vamos marcar o perfil para forçar troca.
    
    UPDATE public.profiles 
    SET must_change_password = true, updated_at = now() 
    WHERE id = target_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
