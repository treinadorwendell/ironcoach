# Reformulação da Aba Cliente e Página Dedicada de Perfil do Aluno

Reestruturação da experiência de gestão de alunos no IronCoach para tornar os cards da listagem mais enxutos e focar os detalhes físicos, financeiros e operacionais em uma nova **Página de Perfil do Aluno** interativa com menu de cards grandes.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo refletem suas escolhas confirmadas e orientam a construção da nova experiência:

- **Decisão Confirmada 1 — Navegação no Perfil do Aluno**: A página do Perfil do Aluno exibirá um **menu de 4 cards grandes e táteis** levando para: **Informações** (dados físicos e plano), **Histórico de Treinos**, **Criar Treino** e **Execução do Treino**.
- **Decisão Confirmada 2 — Filtro de Planos Detalhado**: Os planos passam a ser estruturados em duas modalidades com seus respectivos subplanos:
  - **Presencial**: Mensal, Semanal, Avulsa.
  - **Online**: Mensal, Trimestral, Semestral, Anual.
  O filtro da Aba Clientes permitirá filtrar tanto por modalidade quanto pelos subplanos detalhados, mantendo compatibilidade automática com os alunos já cadastrados.
- **Decisão Confirmada 3 — Botão de Editar no Card da Lista**: O botão de edição rápida direto no card da listagem abrirá o modal rápido focado nos dados cadastrais e de contato (Nome, Data de nascimento `DD/MM/AAAA`, E-mail, Telefone e Gênero), enquanto o toque no card do aluno abrirá a página completa do **Perfil do Aluno**.

---

## 1. Overview & Core Concept

- **O Que Faz**:
  1. **Simplificação do Card na Aba Clientes**: Exibe apenas Nome, Data de nascimento (`DD/MM/AAAA`), E-mail, Número de telefone, botão de Editar cadastro rápido e botão de Excluir. Todo o card funciona como área clicável para abrir o Perfil do Aluno.
  2. **Nova Página de Perfil do Aluno**: Ao tocar no card de um aluno, abre-se a visão dedicada daquele aluno com cabeçalho de identificação, botão de retorno para a lista e um **Menu Principal em Cards Grandes** para acessar:
     - **Informações**: Painel completo para editar **Peso (kg)**, **Altura (cm)**, **Data de Nascimento (`DIA/MÊS/ANO`)**, observações e configurar o **Tipo de Plano** dividido entre **Presencial** (`Mensal`, `Semanal`, `Avulsa`) e **Online** (`Mensal`, `Trimestral`, `Semestral`, `Anual`) com seu respectivo valor em R$.
     - **Histórico de Treinos**: Abre a visualização de histórico exclusiva do aluno.
     - **Criar Treino**: Direciona para o construtor de programas e divisões já vinculado ao aluno.
     - **Execução do Treino**: Inicia ou retoma a sessão de treino em tempo real para o aluno selecionado.
- **Público-Alvo**: Personal trainers utilizando tablet em orientação vertical ou smartphone na sala de musculação.
- **Valor Principal**: Leitura imediata dos contatos na lista de alunos e acesso centralizado, com alvos de toque amplos ($\ge 48\text{px}$), a todas as operações do aluno dentro de seu perfil.

---

## 2. User Experience & Visual Design

- **Fluxo do Usuário (Passo a Passo)**:
  1. **Listagem de Clientes**: O treinador visualiza os cards limpos contendo avatar/inicial, nome, data de nascimento, e-mail e telefone, além dos ícones de editar cadastro básico e excluir no canto superior direito.
  2. **Acesso ao Perfil do Aluno**: Ao clicar sobre o card do aluno, a tela transiciona suavemente para a **Página de Perfil do Aluno**.
  3. **Menu de Cards Grandes no Perfil**: Quatro cards amplos em grid responsivo (`grid-cols-1 sm:grid-cols-2`) apresentam ícones claros, descrição direta e indicadores contextuais:
     - Card **Informações** (exibe resumo atual de Peso, Altura e Plano ativo).
     - Card **Histórico de Treinos** (exibe total de sessões concluídas).
     - Card **Criar Treino** (acesso direto à prescrição do aluno).
     - Card **Execução do Treino** (ação imediata para iniciar o treino do dia).
  4. **Subpágina / Painel de Informações do Aluno**: Ao acessar *Informações*, o treinador edita com máscara automática `DD/MM/AAAA` a data de nascimento, Peso (`kg`), Altura (`cm`), seleciona a modalidade (**Presencial** ou **Online**), escolhe o subplano correspondente e define o valor em R$, salvando com sincronização imediata no Firebase e armazenamento local.
- **Identidade Visual & Tema**:
  - *Direção Estética*: Utilitário esportivo de alto contraste em tema escuro (`slate-950` / `slate-900`), otimizado para legibilidade em ambiente de academia.
  - *Paleta de Cores*: Superfícies neutras em `slate-900/90` com bordas sutis `slate-800`, acentos primários em `emerald-500` (ações de confirmação e treinos presenciais) e `cyan-400` (modalidade online e navegação).
  - *Tipografia & Hierarquia*: Números tabulares (`tabular-nums`) para peso, altura, datas e valores financeiros; metadados de contato alinhados sem excesso de cápsulas decorativas.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1 — Separação entre Edição Rápida de Contato e Informações Físicas/Plano**:
  - *Abordagem Escolhida*: O botão de lápis no card da lista abre o modal rápido de cadastro/contato, enquanto medidas corporais (`Peso`, `Altura em cm`) e `Tipo de Plano` ficam concentrados na seção **Informações** dentro do Perfil do Aluno.
  - *Por Quê*: Mantém a listagem principal limpa e rápida de escanear, conforme solicitado, delegando a configuração detalhada para a página do perfil.
- **Decisão 2 — Modelagem Flexível de Planos Presenciais e Online**:
  - *Abordagem Escolhida*: Suportar a categoria do plano (`Presencial` | `Online`) combinada aos subplanos (`Mensal`, `Semanal`, `Avulsa` para Presencial; `Mensal`, `Trimestral`, `Semestral`, `Anual` para Online), preservando retrocompatibilidade com registros anteriores (`Mensal`, `Semanal`, `Avulsa`, `Online`).
  - *Por Quê*: Garante que nenhum dado já salvo no Firestore seja perdido e permite relatórios financeiros e filtros precisos na Aba Clientes e na Agenda.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitetura e Fluxo de Navegação

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ABA CLIENTES                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Filtro Detalhado: Todos | Presencial (3) | Online (4)             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Card do Aluno (Enxuto)                                            │  │
│  │ • Nome, Nascimento (DD/MM/AAAA), E-mail, Telefone                 │  │
│  │ • [Botão Editar Cadastro Rápido]   [Botão Excluir]                │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │ Clique no Card
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PÁGINA DE PERFIL DO ALUNO                         │
│  [← Voltar para Clientes]   Resumo: Nome • Nascimento • Contato         │
│                                                                         │
│  ┌─────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ 1. INFORMAÇÕES                  │ │ 2. HISTÓRICO DE TREINOS        │ │
│  │ • Editar Peso (kg), Altura (cm) │ │ • Acessar sessões concluídas   │ │
│  │ • Nascimento (DIA/MÊS/ANO)      │ │   e evolução de cargas         │ │
│  │ • Plano Presencial / Online     │ │                                │ │
│  └─────────────────────────────────┘ └────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ 3. CRIAR TREINO                 │ │ 4. EXECUÇÃO DO TREINO          │ │
│  │ • Prescrever ou editar fichas   │ │ • Iniciar treino agora na      │ │
│  │   deste aluno                   │ │   sala de musculação           │ │
│  └─────────────────────────────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados e Estado
- **Entidade `Client`**:
  - Campos básicos exibidos no card: `name`, `birthDate` (formato `DD/MM/AAAA`), `email`, `phone`.
  - Campos gerenciados em **Perfil > Informações**: `weight` (kg), `height` (cm), `birthDate` (`DD/MM/AAAA`), `contractCategory` (`'Presencial' | 'Online'`), `contractSubType` / `contractType` (`'Presencial - Mensal'`, `'Presencial - Semanal'`, `'Presencial - Avulsa'`, `'Online - Mensal'`, `'Online - Trimestral'`, `'Online - Semestral'`, `'Online - Anual'`), `contractValue` (R$).
- **Mapeamento de Interações**:
  - `selectedProfileClient`: controla qual aluno está aberto na Página de Perfil do Aluno.
  - `profileSubView`: alterna entre o menu de 4 cards grandes (`'menu'`), a tela de edição de `'informacoes'` e a visualização de `'historico'`.
  - Os cards `'Criar Treino'` e `'Execução do Treino'` acionam os handlers globais `onCreateWorkoutForClient(client)` e `onStartWorkoutForClient(client)`, levando diretamente às respectivas seções com o aluno ativo.
