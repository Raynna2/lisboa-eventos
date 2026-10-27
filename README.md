# LISBOA EVENTOS — versão integrada com Supabase

## Requisitos
- Node.js LTS instalado
- Projeto Supabase com o schema esperado e políticas RLS ativas

## Configuração local
1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os dados públicos do projeto Supabase.
3. Execute `npm install`.
4. Execute `npm run dev` e abra o endereço mostrado no terminal.
5. Entre com e-mail e senha de uma conta criada em Supabase Authentication e que possua perfil `Ativo` em `public.staff_profiles`.

## Build de publicação
- Comando: `npm run build`
- Diretório de publicação: `dist`
- Variáveis necessárias no provedor: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Segurança e limitações
- O site não oferece auto cadastro público.
- A autenticação é Supabase Auth por e-mail e senha. O ID do membro é exibido/gerenciado como identificador, mas o login por ID exigiria um endpoint servidor seguro para resolver ID para e-mail.
- Não use `service_role` nem chave secreta em variáveis `VITE_`.
- Para dar acesso a um novo membro, crie a conta no Supabase Auth e crie/autorize o perfil com uma operação administrativa confiável. A interface atual edita perfis existentes; não cria usuários de autenticação a partir do navegador.
- A lista de histórico é uma conveniência operacional. Para auditoria inviolável, o registro deve ser feito por triggers/funções no servidor, não confiar em campos de log enviados pelo navegador.
- O ranking exibido é básico (eventos atribuídos ao responsável), não é ainda o ranking completo por participação/resultado.
