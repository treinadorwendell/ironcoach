# Navegação Inteligente na Aba Execução do Treino

Garante que toda vez que o treinador clicar na aba **Execução do Treino**, o aplicativo abra diretamente na etapa de **Escolher Aluno**, exceto quando já houver um **treino iniciado** (com cronômetro ativo ou pausado), situação em que leva o treinador diretamente para a tela do treino em andamento.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Regra de Redirecionamento ao Clicar na Aba Execução do Treino**:
> - **Sem treino iniciado (`!session?.isStarted`)**: Mesmo que um aluno ou ficha tenha sido visualizado anteriormente sem dar o "Play" (Iniciar Treino), clicar na aba **Execução do Treino** limpará a pré-seleção ociosa e abrirá diretamente a tela **Escolher Aluno** (`selecao-aluno`).
> - **Com treino já iniciado (`session?.isStarted === true`)**: O aplicativo preserva a sessão ativa e abre diretamente na tela de **Execução do Treino** (`execucao`) daquele treino iniciado.
> - **Clique repetido na própria aba Execução do Treino**: Mesmo já estando dentro da seção de Execução (por exemplo, visualizando os programas ou divisões de um aluno sem ter iniciado o treino), clicar novamente no botão da aba **Execução do Treino** na barra inferior voltará imediatamente para a tela **Escolher Aluno** (a menos que haja um treino iniciado).

## 1. Overview & Core Concept

- **What It Does**: Padroniza o ponto de entrada da aba **Execução do Treino** para sempre iniciar na seleção de alunos, evitando que o treinador caia acidentalmente na ficha de outro aluno que estava apenas sendo visualizada ou recém-salva no construtor, enquanto protege e retoma automaticamente qualquer treino que já tenha sido efetivamente iniciado.
- **Target Audience / Persona**: Personal trainers que alternam rapidamente entre a Agenda, Cadastro de Clientes, Construtor de Treinos e Execução no chão de academia.
- **Key Value**: Previne erros operacionais de registrar séries na ficha do aluno errado e torna a navegação previsível com um único toque na barra inferior.

## 2. User Experience & Visual Design

- **Fluxo 1 — Clicar na Aba "Execução do Treino" (Sem treino iniciado)**:
  1. O treinador está em qualquer aba (Agenda, Cliente, Criar Treino) ou em uma sub-etapa não iniciada da Execução (lista de programas ou escolha de divisão).
  2. Ao tocar em **Execução do Treino** na barra de navegação inferior:
     - O sistema verifica se existe uma sessão ativa com `isStarted === true`.
     - Como não há treino iniciado, qualquer rascunho de sessão não iniciado (`isStarted === false`) é descartado e a visualização abre diretamente em **Etapa 1: Escolher Aluno** (`selecao-aluno`).
- **Fluxo 2 — Clicar na Aba "Execução do Treino" (Com treino já iniciado)**:
  1. O treinador iniciou um treino (`isStarted === true`, badge **"AO VIVO"** visível na aba inferior) e navegou temporariamente para outra aba (ex: Agenda ou Cliente) para consultar uma informação.
  2. Ao tocar em **Execução do Treino** na barra inferior:
     - O sistema detecta que há um treino em andamento (`session.isStarted === true`).
     - A visualização abre diretamente na tela de **Execução do Treino** (`execucao`) com o aluno, exercícios, séries marcadas e cronômetro exatamente onde parou.
- **Visual Identity & Theme**: Mantém integralmente a identidade visual escura (`bg-slate-950`, destaques em `emerald-500` e badge `AO VIVO` na barra inferior quando há treino iniciado).

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Desvincular o salvamento no Construtor (`handleSaveWorkout`) da seleção automática de execução**
  - *Chosen Approach*: Ao salvar um treino na aba **Criar Treino**, não pré-carregar silenciosamente `activeWorkoutForExecution` se não houver treino iniciado. Além disso, sincronizações da nuvem (`onActiveSessionChange`) só definirão o treino ativo para execução se `cloudSession.isStarted === true`.
  - *Why*: Anteriormente, salvar um treino ou receber uma sessão não iniciada da nuvem preenchia `activeWorkoutForExecution`, fazendo com que o clique na aba Execução pulasse a escolha de aluno e abrisse direto na ficha salva.
- **Decision 2: Gatilho de navegação dedicado ao clicar na aba `execucao`**
  - *Chosen Approach*: Criar um contador/sinalizador de navegação (`executionNavTrigger`) em `Home` (`app/page.tsx`) acionado toda vez que o usuário clica no ícone **Execução do Treino** no `BottomNav`.
  - *Why*: Permite que o componente `WorkoutExecutionSection` reaja tanto ao vir de outra aba quanto ao clicar novamente no botão da aba Execução já estando nela, decidindo de forma determinística entre `execucao` (se `isStarted === true`) ou `selecao-aluno` (se não houver treino iniciado).

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────┐
│                        BottomNav (Barra Inferior)                    │
│         Clique no botão "Execução do Treino" (id: 'execucao')        │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Home (app/page.tsx)                          │
│  Verifica storage.getActiveSession():                                │
│  ├─ Se savedSession?.isStarted === true:                             │
│  │    Mantém activeWorkoutForExecution sincronizado com a sessão     │
│  └─ Se NÃO houver sessão iniciada:                                   │
│       Limpa sessão ociosa (storage.saveActiveSession(null))          │
│       Define activeWorkoutForExecution = null                        │
│       Incrementa executionNavTrigger                                 │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     WorkoutExecutionSection                          │
│  Reage a executionNavTrigger / montagem:                             │
│  ├─ Se session?.isStarted === true:                                  │
│  │    currentStep = 'execucao' (Vai direto para o treino iniciado)   │
│  └─ Caso contrário:                                                  │
│       currentStep = 'selecao-aluno' (Vai direto para escolher aluno) │
│       focusedExerciseId = null                                       │
└──────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - `Home.handleSelectSection(section)`:
    - Quando `section === 'execucao'`, verifica `storage.getActiveSession()`.
    - Se `savedSession && savedSession.isStarted`, localiza o programa correspondente em `workouts`, define `activeWorkoutForExecution` e mantém a sessão ativa.
    - Se não houver sessão com `isStarted: true`, limpa qualquer sessão não iniciada (`storage.saveActiveSession(null)`), define `activeWorkoutForExecution(null)` e incrementa `executionNavTrigger`.
  - `WorkoutExecutionSection`:
    - Recebe `navigationTrigger?: number` e observa mudanças.
    - Na inicialização e sempre que `navigationTrigger` mudar: verifica se a sessão atual ou persistida possui `isStarted === true`. Em caso positivo, posiciona `currentStep = 'execucao'`; caso contrário, limpa qualquer foco de exercício e posiciona `currentStep = 'selecao-aluno'`.
