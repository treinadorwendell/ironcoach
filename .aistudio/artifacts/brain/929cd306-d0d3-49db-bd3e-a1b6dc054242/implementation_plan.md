# Navegação Sequencial de Programas e Execução de Treino

Reestruturação da aba **Execução do Treino** em um fluxo de navegação sequencial em três telas com transições fluidas e botão de voltar no topo, exibindo programas de treino em cards verticais completos e permitindo selecionar o treino/split antes de acessar a tela de execução com o cronômetro pronto para início.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> - **Navegação Sequencial:** O fluxo será dividido em 3 visualizações sequenciais na mesma aba: (1) Lista Vertical de Programas do Aluno $\rightarrow$ (2) Seleção de Treino/Split do Programa Escolhido $\rightarrow$ (3) Tela Oculta de Execução Pronta. Haverá botão de voltar no topo para retornar facilmente às etapas anteriores.
> - **Informações nos Cards Verticais:** Cada card de programa exibirá nome do programa, dias da semana dos treinos, objetivo prescrito, período de vigência (datas de início e término formatadas) e contagem total de treinos/exercícios.
> - **Comportamento da Tela de Execução:** Ao selecionar o treino específico, a tela de execução carrega todos os exercícios já montados e com séries preparadas, com o cronômetro em repouso aguardando o toque em "Iniciar Treino".

---

## 1. Overview & Core Concept

- **O que faz:** Transforma a interface da aba Execução do Treino em um fluxo progressivo de foco único. O personal trainer seleciona o aluno no topo, visualiza verticalmente todos os programas disponíveis para aquele aluno com metadados claros, escolhe qual programa deseja aplicar, seleciona o treino da semana correspondente (ex: Treino A, Treino B) e é conduzido à tela de execução do treino pronta e focada.
- **Público-alvo:** Personal trainers e treinadores em tablet vertical que necessitam de clareza visual, sem sobrecarga de informação ou múltiplos painéis concorrentes na mesma visualização.
- **Valor central:** Reduz atrito cognitivo e toques acidentais, permitindo transição direta entre prescrições ativas e a sessão no chão da academia com navegação intuitiva de ida e volta.

---

## 2. User Experience & Visual Design

### Fluxo do Usuário (Etapas 1, 2 e 3)

```
┌────────────────────────────────────────────────────────┐
│                   SELETOR DE ALUNO                     │
│  [Carlos Silva — Mensal (R$ 750)                     ▼]│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ ETAPA 1: PROGRAMAS DE TREINO (VERTICAL)                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Periodização de Hipertrofia A/B                  │  │
│  │ Objetivo: Hipertrofia Máxima e Densidade Muscular│  │
│  │ Dias: Seg, Ter, Qui, Sex · 2 Treinos (A/B)       │  │
│  │ Vigência: 01/09/2026 até 30/11/2026              │  │
│  │ [Toque para abrir treinos ➔]                     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Mesociclo de Força e Cargas                      │  │
│  │ Objetivo: Aumento de Força 1RM e Potência        │  │
│  │ Dias: Qua, Sáb · 1 Treino                        │  │
│  │ Vigência: 01/12/2026 até 28/02/2027              │  │
│  │ [Toque para abrir treinos ➔]                     │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Toque em um Programa
                            ▼
┌────────────────────────────────────────────────────────┐
│ ETAPA 2: SELEÇÃO DO TREINO A SER EXECUTADO             │
│  [← Voltar aos Programas]   Programa: Hipertrofia A/B  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚡ Treino A - Peitoral e Tríceps                  │  │
│  │ 5 Exercícios · Dias recomendados: Seg, Qui       │  │
│  │ [Iniciar este Treino ➔]                          │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚡ Treino B - Dorsal e Bíceps                     │  │
│  │ 3 Exercícios · Dias recomendados: Ter, Sex       │  │
│  │ [Iniciar este Treino ➔]                          │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Toque em um Treino/Split
                            ▼
┌────────────────────────────────────────────────────────┐
│ ETAPA 3: TELA DE EXECUÇÃO PRONTA (OCULTA ATÉ ESCOLHA) │
│  [← Voltar aos Treinos]     Treino A • Carlos Silva    │
│                                                        │
│  [▶ Iniciar Treino]   Cronômetro: 00:00                │
│  ──────────────────────────────────────────────────    │
│  • Exercício 1: Supino Reto com Barra                  │
│    Série 1 | 80kg | 10 reps | [✓] | PSE               │
│  • Exercício 2: Supino Inclinado com Halteres          │
│    Série 1 | 28kg | 10 reps | [✓] | PSE               │
│  ...                                                   │
│  [Finalizar Treino]                                    │
└────────────────────────────────────────────────────────┘
```

### Visual & Padrões Ergonômicos (Tablet First)
- **Top Bar com Botão Voltar:** Em cada etapa subsequente (Etapa 2 e Etapa 3), um cabeçalho fixo ou sticky apresenta o botão `← Voltar` acompanhado do nome do aluno e do contexto atual, garantindo retorno instantâneo a qualquer momento sem perda de dados da sessão.
- **Cards Verticais dos Programas:**
  - Superfície `bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-emerald-500/50`.
  - Tipografia limpa sem acúmulo de badges desnecessários, com separadores tipográficos (`·`), datas em formato local brasileiro (`DD/MM/AAAA`) e ícones semânticos de apoio (`Calendar`, `Target`, `Dumbbell`, `Clock`).
- **Transições Suaves:** Animações direcionais com `motion/react` e `AnimatePresence mode="wait"` entre as etapas (deslizar suave e fade natural), mantendo a experiência táctil e responsiva.

---

## 3. Key Product Decisions & Trade-Offs

- **Fluxo Sequencial por Estado Interno vs. Múltiplas Rotas URL:**
  - *Decisão:* Controlar o estágio visual dentro de `WorkoutExecutionSection` via estado (`viewStep: 'programas' | 'selecao-treino' | 'execucao'`), sincronizando com `session` ativa persistida.
  - *Por quê:* Evita recargas de página, mantém compatibilidade total com o modo PWA offline e preserva o estado ativo de séries e cronômetro se o treinador alternar entre as abas inferiores.
- **Detecção de Sessão em Andamento:**
  - Se já houver um treino em andamento (`session?.isStarted === true`) para o aluno selecionado, o app abre diretamente na tela de execução (Etapa 3), exibindo um botão de navegação para visualizar outros programas se o usuário desejar.
- **Treino de Adaptação Imediata (Zero-State):**
  - Se o aluno não tiver programas prescritos, a Etapa 1 exibe a opção de criar o primeiro treino ou gerar o treino rápido de adaptação com 1 toque.

---

## 4. Technical Architecture & Component Mapping

```
┌───────────────────────────────────────────────────────────────┐
│                    WorkoutExecutionSection                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Cabeçalho de Navegação Contextual                       │  │
│  │ (Seletor de Aluno + Botão Voltar [se step > programas]) │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Gerenciador de Etapas (AnimatePresence)                 │  │
│  │                                                         │  │
│  │  [step === 'programas']                                 │  │
│  │  ➔ ProgramsListView (Cards verticais informativos)       │  │
│  │                                                         │  │
│  │  [step === 'selecao-treino']                            │  │
│  │  ➔ SplitsSelectionView (Splits A, B, C do programa)     │  │
│  │                                                         │  │
│  │  [step === 'execucao']                                  │  │
│  │  ➔ ActiveWorkoutView (Exercícios, Séries, Timer, Notas) │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Componentes e Estados a Ajustar:
1. `WorkoutExecutionSection.tsx`:
   - Introduzir o estado `currentStep: 'programas' | 'selecao-treino' | 'execucao'`.
   - Adicionar estado `selectedProgramForExecution: WorkoutProgram | null`.
   - Construir a visualização de cards verticais de programas com todos os metadados solicitados: Nome, Dias de Treino, Objetivo, Vigência (`startDate` até `endDate`) e número de treinos/exercícios.
   - Construir a visualização de seleção de treino/split do programa escolhido com cards destacados por split.
   - Exibir a tela de execução apenas ao selecionar o treino, com botão de retorno no topo e cronômetro aguardando o toque em "Iniciar Treino".
   - Integrar transições com `motion.div` entre as 3 etapas.
