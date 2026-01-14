-- SCRIPT PARA CRIAR USUÁRIO ADMINISTRADOR DIRETAMENTE NO SQL
-- Este script insere o usuário no sistema de autenticação do Supabase.

-- 1. Garante que a extensão de criptografia está ativa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Insere o usuário na tabela de autenticação
-- O ID é gerado automaticamente e o Trigger 'on_auth_user_created' 
-- irá criar o registro correspondente em 'public.profiles' com a role 'adm'.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'guilherme.lamonica@katinvest.com.br',
  crypt('Gui@664439', gen_salt('bf')), -- Senha criptografada
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name": "Guilherme Lamonica", "role": "adm"}', -- Metadados para o trigger
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- NOTA: Após executar este script, o usuário já poderá logar com estas credenciais.
-- O sistema de perfis (public.profiles) será preenchido automaticamente pelo trigger.
