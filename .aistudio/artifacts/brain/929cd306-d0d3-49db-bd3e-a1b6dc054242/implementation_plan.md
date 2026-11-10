# Filtro por Aluno na Agenda Principal

Adição de um **Menu Seletor de Aluno** na barra de filtros da Agenda (ao lado do seletor de *Status da Agenda*), permitindo visualizar exclusivamente os agendamentos de um aluno específico em todas as visões do calendário (**Dia**, **Semana**, **Mês**, **Ano** e **Programação**) e atualizando os contadores de status em tempo real.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram confirmadas na etapa de alinhamento e definem o comportamento exato do novo filtro:

- **Filtragem Global em Todas as Visões e Contadores**: Ao selecionar um aluno, todas as visualizações da Agenda (**Dia**, **Semana**, **Mês**, **Ano** e **Programação**) passam a exibir apenas os agendamentos daquele aluno, e os contadores do menu **Status da Agenda** (`Todos`, `Realizado`, `Reagendado`, `Falta`, `Agendado`) passam a refletir os números daquele aluno.
- **Menu Seletor ao Lado do Status da Agenda**: Na barra inferior do cabeçalho da Agenda (elemento focado), será adicionado um menu suspenso interativo de **Aluno** ao lado do seletor de **Status da Agenda**, mantendo a mesma identidade visual e fechamento automático ao selecionar.
- **Preservação do Comportamento de Novo Compromisso**: O botão **Novo Compromisso** mantém sua seleção padrão atual ao abrir o modal de criação.

---

## 1. Overview & Core Concept

- **O Que Faz**: Permite ao treinador filtrar rapidamente a grade da Agenda por qualquer aluno cadastrado (ou retornar para **Todos os Alunos** com 1 toque), isolando na tela todos os horários, dias de treino e histórico de presença daquele aluno.
- **Público-Alvo / Contexto de Uso**: Personal trainers que desejam consultar os dias de aula de um aluno específico na semana/mês ou verificar rapidamente o histórico de presença de um cliente diretamente na Agenda.
- **Valor Principal**: Elimina a poluição visual quando há dezenas de aulas na semana, permitindo enxergar instantaneamente a grade exclusiva de um único aluno combinada com qualquer filtro de status.

---

## 2. User Experience & Visual Design

- **Fluxo do Usuário**:
  1. Na barra de filtros do cabeçalho da Agenda, o treinador visualiza dois controles lado a lado: **Filtrar Aluno** e **Status da Agenda**.
  2. Por padrão, o seletor de aluno exibe **Todos os Alunos** (com o total de agendamentos).
  3. Ao tocar no botão seletor de aluno, abre-se um menu suspenso estilizado listando:
     - **Todos os Alunos** (com contador total)
     - Cada aluno cadastrado (exibindo o nome do aluno e um contador tabular com a quantidade de agendamentos dele)
  4. Ao escolher um aluno, o menu fecha automaticamente, o botão destaca o nome do aluno selecionado (com opção rápida de limpar/voltar para todos), os contadores de **Status da Agenda** são recalculados para aquele aluno e as grades de **Dia**, **Semana**, **Mês**, **Ano** e **Programação** exibem somente os compromissos dele.

- **Identidade Visual & Tema**:
  - *Direção Estética*: Segue o padrão dark slate (`bg-slate-900` / `bg-slate-950`) com acentos em roxo (`purple-600` / `purple-400`) e bordas sutis (`border-slate-700/80`).
  - *Tipografia & Hierarquia*: Rótulos em linha única (`whitespace-nowrap`), truncamento elegante para nomes longos (`truncate max-w-[150px] sm:max-w-[200px]`) e contadores numéricos em fonte monoespaçada tabular (`font-mono tabular-nums`).
  - *Feedback Interativo*: Abertura suave (`animate-in fade-in zoom-in-95 duration-150`), fechamento automático ao clicar fora ou selecionar uma opção, e destaque visual roxo quando um aluno específico está filtrado.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Composição Combinada entre Filtro de Aluno e Filtro de Status**
  - *Abordagem Escolhida*: Primeiro filtra-se a lista base de eventos pelo aluno selecionado (`clientFilteredEvents`) para alimentar os contadores do menu de Status (`Todos`, `Realizado`, `Reagendado`, `Falta`, `Agendado`), e em seguida aplica-se o filtro de status (`filteredEvents`), que alimenta todas as 5 visões da Agenda.
  - *Por Quê*: Garante que, ao selecionar um aluno, o treinador veja imediatamente quantas aulas realizadas, agendadas, reagendadas ou faltas aquele aluno possui, podendo ainda refinar por status se desejar.
- **Decisão 2: Unificação das Visões de Mês e Ano com os Filtros Ativos**
  - *Abordagem Escolhida*: As visões de **Mês** e **Ano**, que antes liam a lista bruta de eventos, passarão a consumir `filteredEvents` (respeitando tanto o aluno selecionado quanto o status filtrado).
  - *Por Quê*: Cumpre o requisito confirmado pelo usuário de que o filtro funcione de ponta a ponta em todas as visualizações da Agenda.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagrama de Arquitetura e Fluxo de Filtragem na Agenda**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Barra de Filtros da Agenda                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Seletor de Aluno (clientFilter) │  │ Seletor de Status            │  │
│  │ • 'todos' (Padrão)              │  │ (statusFilter)               │  │
│  │ • ID do Aluno Selecionado       │  │ • Contadores baseados em     │  │
│  └────────────────┬────────────────┘  │   clientFilteredEvents       │  │
│                   │                   └──────────────┬───────────────┘  │
│                   ▼                                  │                  │
│  ┌─────────────────────────────────┐                 │                  │
│  │ 1. clientFilteredEvents         │                 │                  │
│  │    Filtra eventos por clientId  ├─────────────────┘                  │
│  └────────────────┬────────────────┘                                    │
│                   ▼                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 2. filteredEvents (Aluno + Status)                                │  │
│  │    Alimenta de forma unificada todas as visualizações:            │  │
│  │    ├── Visão Dia (dayEvents)                                      │  │
│  │    ├── Visão Semana (currentWeekDays)                             │  │
│  │    ├── Visão Mês (monthData cells & contador mensal)              │  │
│  │    ├── Visão Ano (contadores dos 12 meses)                        │  │
│  │    └── Visão Programação (lista cronológica contínua)             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Mapeamento de Estado & Interatividade**:
  - Novo estado `clientFilter` (`'todos' | string`, inicializado como `'todos'`) e `isClientMenuOpen` (`boolean`, com `clientMenuRef` integrado ao listener de clique externo `handleOutsideClick`).
  - `clientFilteredEvents`: `useMemo` que retorna todos os `events` quando `clientFilter === 'todos'` ou apenas os eventos cujo `e.clientId === clientFilter`.
  - `filteredEvents`: `useMemo` que aplica `statusFilter` sobre `clientFilteredEvents`.
  - Atualização das visões `mes` e `ano` para utilizarem `filteredEvents` tanto na contagem do cabeçalho mensal/anual quanto nos pontos indicadores de cada dia do calendário.
