# REFATORAÇÃO AVANÇADA — PAINEL ADMINISTRATIVO COMPLETO + SISTEMA DE INSCRIÇÕES DE EQUIPES

Analisar toda estrutura atual e implementar uma camada profissional de administração multi-competição com fluxo completo de cadastro de equipes, jogadores, aprovação e gestão visual avançada.

NÃO quebrar funcionalidades existentes.
Preservar banco já refatorado.
Expandir arquitetura atual.

## OBJETIVO
Transformar o sistema em uma plataforma profissional de gestão esportiva com:
- administração central completa
- cadastro de campeonatos
- gestão visual de equipes
- sistema de inscrição por link
- aprovação de jogadores
- edição administrativa total
- visualização completa de dados

O sistema deve operar como painel institucional profissional.

## NÍVEIS DE ACESSO
1. **SUPER ADMIN**
Permissões: criar campeonatos, editar regras, gerenciar temporadas, gerenciar equipes, aprovar jogadores, editar cadastros, arquivar competições, publicar competições

2. **GESTOR DE EQUIPE / PRESIDENTE**
Permissões: acessar link exclusivo, cadastrar equipe, editar equipe, cadastrar jogadores, enviar documentação, acompanhar status aprovação
NÃO pode: editar competição, aprovar jogadores, alterar regras

3. **PÚBLICO**
Visualização apenas

## PAINEL ADMIN MASTER
Criar dashboard administrativo completo (`/admin`)
Layout profissional, Sidebar fixa
Seções: Dashboard, Campeonatos, Temporadas, Equipes, Jogadores, Inscrições pendentes, Aprovações, Configurações, Logs

## DASHBOARD ADMIN
Exibir cards: campeonatos ativos, temporadas, equipes inscritas, jogadores pendentes, jogadores aprovados, últimas inscrições, ações rápidas. Visual moderno.

## GESTÃO DE CAMPEONATOS
Tela: `/admin/competitions`
Funções: listar, buscar, filtrar, criar, editar, duplicar, arquivar, publicar
Cada campeonato deve exibir: nome, tipo, temporada, status, equipes, última atualização, ações

## WIZARD DE CRIAÇÃO
Etapa 1: dados básicos
Etapa 2: formato
Etapa 3: regras
Etapa 4: estrutura
Etapa 5: revisão
Ao criar: gerar automaticamente competição, temporada, estrutura, rotas públicas, links de inscrição

## SISTEMA DE LINKS DE INSCRIÇÃO
Ao criar campeonato, gerar automaticamente link único (Ex: `/register/copa-apd-2027` ou token seguro)
Cada campeonato deve ter: copiar link, regenerar link, desativar link, QR code opcional

## FLUXO DO PRESIDENTE
Ao acessar link: Tela profissional de inscrição
Passo 1: dados da equipe (nome, sigla, cidade, escudo upload, responsável, telefone, email)
Passo 2: cadastro de jogadores (Obrigatórios: nome completo, número, posição. Opcionais: foto, apelido, idade, documento, observações. Adicionar múltiplos jogadores)
Passo 3: revisão
Enviar inscrição. Status: pendente

## PADRONIZAÇÃO DE CAMPOS
Criar configuração administrativa por campeonato
SUPER ADMIN define: campos obrigatórios, campos opcionais (Ex: foto obrigatória? idade obrigatória? documento obrigatório?). Assim manter padrão por competição.

## APROVAÇÃO ADMINISTRATIVA
Tela: `/admin/approvals`
Listagem visual profissional. Cards por equipe.
Cada jogador deve mostrar: foto, nome, número, posição, idade, status, data envio
Botões: aprovar, rejeitar, editar, solicitar correção, aprovação individual ou em lote

## MELHORAR VISUALIZAÇÃO DE JOGADORES
PROBLEMA ATUAL: lista feia mostrando apenas nome. REFATORAR COMPLETAMENTE.
Nova visualização: cards ou tabela premium.
Cada jogador deve exibir: foto, nome completo, apelido, número, posição, idade, status, equipe, ações.
Ao clicar: abrir drawer/modal completo, mostrar todos os dados, editar inline.

## TELA DETALHE DA EQUIPE
`/admin/teams/[id]`
Exibir: escudo, dados institucionais, responsável, status inscrição, lista visual completa de jogadores, estatísticas da equipe, ações rápidas.
Botões: editar equipe, editar elenco, aprovar todos, exportar.

## EDIÇÃO ADMIN COMPLETA
Admin pode editar qualquer campo (equipe, jogador, foto, número, posição, status) com salvamento imediato.

## NOTIFICAÇÕES
Ao presidente: inscrição enviada, jogador aprovado, correção solicitada, inscrição aprovada.

## BANCO NECESSÁRIO
Criar se necessário: `team_managers`, `registration_links`, `registration_submissions`, `approval_logs`.

## UX/UI
Visual premium, Responsivo, Admin profissional, Sem listas simples feias.
Utilizar: cards, drawer lateral, modais ricos, busca avançada, filtros, status badges, preview de imagem.

## VALIDAÇÃO FINAL
Testar fluxo completo: admin cria campeonato -> gera link -> presidente acessa -> cadastra equipe e jogadores -> envia -> admin visualiza dados completos -> admin edita -> admin aprova -> equipe aparece publicada. Tudo com visual profissional e navegação fluida.
