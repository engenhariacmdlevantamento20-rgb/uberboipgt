# UBER BOI PGT — Fase 1 (MVP)

**Ainda não foi executado/testado**: foi escrito em ambiente sem internet. Só a sintaxe foi conferida. Siga o passo a passo e reporte os erros que aparecerem.

## O que já existe
- Página inicial com botão de instalar (Android), passo a passo (iPhone) e aviso para navegadores de Instagram/Facebook/WhatsApp.
- Cadastro (produtor/transportador), login, logout, sessão por cookie httpOnly, senha com scrypt.
- 30 dias grátis lidos de `system_settings.trial_days` (editável no banco; painel admin virá depois).
- Consentimento LGPD registrado, logs de auditoria, limite de tentativas de login.
- Migração SQL: usuários, papéis, sessões, planos, assinaturas, fazendas, pontos, caminhões, estados GO/TO/DF.
- Service worker simples (página offline). Não guarda dados de usuário nem /api.
- Painel inicial com os botões do produtor/transportador (marcados "em breve").

## Fluxo completo da Fase 1
- Produtor: cadastra fazenda (mapa + GPS + pontos de embarque) > Novo transporte (origem, destino, animais, data) > calcula a rota (asfalto/terra) > arrasta pontos ou adiciona pontos intermediários e recalcula > publica > recebe propostas > escolhe transportador > acompanha status, documentos e posição > avalia.
- Transportador: cadastra caminhão > vê oportunidades (filtro por raio com GPS) > envia proposta > conversa por WhatsApp (link wa.me) > avança os status (Cheguei, Embarque, Sair com carga...) > rastreamento opcional > finaliza > avalia.
- Admin: números gerais e configuração de dias de teste e intervalo de rastreamento.

## Tornar uma conta admin
No banco: `INSERT INTO user_roles(user_id, role) SELECT id, 'admin' FROM users WHERE email='seu@email.com';`

## Limites conhecidos (leia)
- **Rota:** usa OpenRouteService (precisa de `ORS_API_KEY`, cota gratuita limitada). Asfalto/terra vem do OpenStreetMap e pode estar incompleto no interior; o app mostra "sem informação" nesses trechos.
- **Edição da rota:** arrastar pontos e adicionar pontos intermediários funciona (recalcula). Arrastar um trecho direto na linha e "evitar esta estrada" ainda não existem.
- **Rastreamento:** só envia posição com o app aberto e a tela ligada (limite dos navegadores, pior no iPhone). Não há histórico da rota realizada na tela ainda (os pontos ficam gravados).
- **Documentos:** guardados no próprio banco (PDF/JPG/PNG, 5 MB), com acesso só dos dois participantes. Não há regra de "documento obrigatório" nem integração com GTA.
- **Mapa:** o padrão usa o servidor público do OpenStreetMap, só para testes. Configure outro provedor antes de divulgar.
- **Fora desta versão:** notificações, favoritos, avisos de estrada na tela (a API existe), fotos, planos/pagamentos, offline além da página de aviso, verificação de WhatsApp, testes automatizados.

## Instalar (no computador)
1. Instale Node.js 20 ou superior.
2. `npm install`
3. Crie um banco PostgreSQL **com PostGIS** (Supabase ou Neon, plano gratuito; ative a extensão postgis).
4. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` e `ORS_API_KEY` (chave gratuita em openrouteservice.org).
5. `npm run migrate` (carrega variáveis: `node --env-file=.env.local scripts/migrate.mjs`)
6. `npm run dev` e abra http://localhost:3000

## Publicar no Netlify
1. Suba o projeto para um repositório no GitHub.
2. Netlify > Add new site > Import from Git. Comando de build: `npm run build`.
3. Em Site settings > Environment variables, cadastre as variáveis do `.env.example`.
4. Defina o endereço definitivo antes de divulgar (trocar o endereço obriga a reinstalar o app).
5. Teste a instalação em um Android e em um iPhone reais.

## Pendências conhecidas
- Textos de Termos e Política de Privacidade ainda não existem (versão `2026-10-draft`).
- Verificação de WhatsApp (Fase 1 usa só o número como contato; verificação por webhook depois).
- Carga dos municípios do IBGE na tabela `municipalities`.
- Próximos passos: Fase 2 (notificações, favoritos, rastreamento completo, rotas salvas).
