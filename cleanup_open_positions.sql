-- OPÇÃO A: LIMPAR TUDO (RECOMENDADO antes de importar de novo)
-- Rode este comando para deixar a tabela zerada:
-- SELECT public.truncate_open_positions();

-- OU use este comando se preferir truncar direto:
-- TRUNCATE TABLE public.open_positions;


-- OPÇÃO B: REMOVER APENAS AS DUPLICATAS (Mantém 1 cópia de cada)
-- Rode este bloco se você quiser manter os dados atuais mas sem duplicados:

DELETE FROM public.open_positions a
USING public.open_positions b
WHERE a.id < b.id 
  AND a.ativo = b.ativo 
  AND a.conta = b.conta 
  AND a.cliente_nome = b.cliente_nome
  AND (a.preco_medio = b.preco_medio OR (a.preco_medio IS NULL AND b.preco_medio IS NULL))
  AND (a."Qtd" = b."Qtd" OR (a."Qtd" IS NULL AND b."Qtd" IS NULL));

-- Verificação:
-- SELECT count(*) FROM public.open_positions;
