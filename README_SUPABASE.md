# Integração Supabase — LISBOA EVENTOS

Projeto Supabase criado: `https://hdcwmteszvejpacsyydg.supabase.co` (região São Paulo).

## Arquivos incluídos
- `src/lib/supabase.js`: cliente Supabase que usa variáveis Vite.
- `.env.example`: modelo das variáveis de ambiente.
- `supabase/schema.sql`: esquema inicial com RLS para staff, eventos, metas, disponibilidade, cronograma e logs.

## Configuração local
1. Copie `.env.example` para `.env.local`.
2. No painel Supabase, abra **Project Settings → API Keys** e copie a chave **Publishable** (sb_publishable_...) para `VITE_SUPABASE_PUBLISHABLE_KEY`. Não use secret/service_role.
3. No Supabase, abra **SQL Editor**, crie uma consulta, cole `supabase/schema.sql` e execute.
4. No terminal da pasta do projeto, execute `npm install` e depois `npm run dev`.

## Importante — etapa de integração pendente
Este pacote prepara o cliente e o esquema do banco, mas a interface `src/main.jsx` ainda usa `localStorage` para o fluxo principal de login e para alguns dados. Não publique nem use dados reais até substituir esse fluxo por Supabase Auth e conectar cada tela às tabelas com tratamento de erros. O login atual de demonstração (ID 725) e as senhas locais não devem ser usados em produção.

O primeiro administrador deve ser criado com um fluxo controlado, sem conceder cargo administrativo a partir de dados enviados pelo navegador. A política RLS faz com que auto-cadastros recebam apenas o cargo Treinamento, mas a autenticação por ID precisa ser ligada ao Supabase Auth na etapa seguinte.
