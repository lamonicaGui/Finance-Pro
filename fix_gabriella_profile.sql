-- SCRIPT PARA CORRIGIR PERFIL DA GABRIELLA
-- Este script verifica se a usuária Gabriella existe no Auth e cria o perfil dela se estiver faltando.

DO $$
DECLARE
    gabriella_id UUID;
    gabriella_email TEXT := 'gabriella@katinvest.com.br'; -- AJUSTE O E-MAIL SE NECESSÁRIO
BEGIN
    -- 1. Tentar encontrar o ID da Gabriella na tabela de auth
    SELECT id INTO gabriella_id FROM auth.users WHERE email = gabriella_email;

    IF gabriella_id IS NOT NULL THEN
        -- 2. Verificar se o perfil já existe
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = gabriella_id) THEN
            -- 3. Inserir perfil se não existir
            INSERT INTO public.profiles (id, full_name, email, role, is_active)
            VALUES (gabriella_id, 'Gabriella', gabriella_email, 'usuario_rv', true);
            
            RAISE NOTICE 'Perfil da Gabriella criado com sucesso para o ID %', gabriella_id;
        ELSE
            RAISE NOTICE 'O perfil da Gabriella já existe.';
        END IF;
    ELSE
        RAISE NOTICE 'Usuário com e-mail % não encontrado na tabela auth.users.', gabriella_email;
    END IF;
END $$;
