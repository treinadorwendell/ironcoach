# Atualização do Banco de Exercícios, Busca Filtrada, Mídia Animada e Modal de Execução

Substituição integral do banco de dados de exercícios pelo catálogo completo em português (mais de 870 exercícios com anatomia, mecânica, força, equipamento, instruções passo a passo e mídia), acompanhada de busca inteligente com painel de filtros na **Criação de Treino** e recursos visuais de mídia animada e guia de execução tanto na **Criação** quanto na **Execução de Treino**.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo refletem suas escolhas confirmadas e orientam o comportamento exato das abas **Criar Treino** e **Execução de Treino**:

- **Exibição da Mídia do Exercício (Confirmado)**: Player em estilo vídeo/animação automática que alterna suavemente entre os quadros de execução (`0.jpg` e `1.jpg`) com controles de Pausar/Reproduzir, troca manual de quadro e indicador visual de fase do movimento.
- **Escopo do Botão de Filtros na Busca (Confirmado)**: O painel de filtros foca exclusivamente nos três critérios anatômicos e práticos solicitados: **Músculo Primário**, **Músculo Secundário** e **Tipo de Equipamento**, mantendo a interface enxuta e rápida.
- **Comportamento de Recolher/Expandir na Criação de Treino (Confirmado)**: No card aberto do exercício (e nos itens do catálogo), a área de mídia permanece **recolhida por padrão** com um botão dedicado **"Ver Mídia / Vídeo"** para expandir a animação apenas quando o treinador desejar consultar, além de acesso rápido aos metadados e instruções.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Novo Banco de Dados Completo**: Substitui o catálogo anterior pelos exercícios do arquivo JSON enviado, preservando todas as propriedades ricas: nome, dificuldade (`level`), categoria (`category`), mecânica (`mechanic`), força (`force`), anatomia primária (`primaryMuscles`), anatomia secundária (`secondaryMuscles`), equipamento (`equipment`), instruções passo a passo (`instructions`) e mídia (`images`).
  2. **Busca e Filtro Avançado na Criação de Treino**: Permite pesquisar instantaneamente ao digitar o nome do exercício tanto diretamente no card quanto no modal do Banco de Exercícios, acompanhado de um botão de **Filtro de Busca** com seletores para **Músculo Primário**, **Músculo Secundário** e **Equipamento**.
  3. **Mídia Recolhida com Expansão Sob Demanda (Criação e Execução)**: Caso o exercício possua mídia no banco, exibe um botão para expandir/recolher o player animado estilo vídeo sem poluir a tela de prescrição ou a tela de séries.
  4. **Modal de Descrição da Execução na Aba Execução**: Adiciona um botão dedicado na Execução do Treino (tanto na lista de exercícios quanto na página dedicada do exercício) que abre um modal detalhado com o passo a passo da execução biomecânica, anatomia primária/secundária, mecânica, força e equipamento.
- **Target Audience / Persona**: Personal trainers em ambiente de academia (uso em smartphone e tablet) que precisam prescrever com precisão anatômica e demonstrar visualmente a execução correta ao aluno.
- **Key Value**: Prescrição baseada em anatomia primária/secundária e disponibilidade de equipamentos, aliada à demonstração visual imediata durante o treino.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Fluxo na Aba Criação de Treino**:
     - Ao adicionar ou editar um exercício na divisão do treino, o treinador pode digitar o nome no campo de busca com autocompletar ou abrir o catálogo completo.
     - Ao tocar no botão **Filtros**, abre-se um painel com três seletores claros: **Anatomia Primária** (ex: Peito, Dorsais, Quadríceps, Isquiotibiais, Ombros...), **Anatomia Secundária** (ex: Tríceps, Bíceps, Glúteos, Panturrilhas, Trapézio...) e **Equipamento** (ex: Barra, Halteres, Cabo, Máquina, Kettlebell, Peso do Corpo...).
     - Dentro do card aberto do exercício prescrito (e nos cards do catálogo), a mídia fica recolhida por padrão; ao clicar em **"Ver Mídia"**, o container expande suavemente exibindo a animação automática do movimento com controle de play/pause.
  2. **Fluxo na Aba Execução do Treino**:
     - Mantém 100% das funcionalidades existentes (cronômetro contínuo, marcação de séries, cargas, PSE, histórico e substituto).
     - Em cada exercício (tanto no card da lista quanto na visualização de página dedicada), dois novos botões de ação rápida ficam disponíveis:
       - **Botão "Ver Mídia / Vídeo"**: Ao clicar, expande o player animado logo abaixo do cabeçalho do exercício mostrando a execução em loop com opção de pausar ou alternar quadros.
       - **Botão "Execução / Instruções"**: Ao clicar, abre o **Modal de Execução do Exercício**, apresentando o passo a passo numerado da execução (`instructions`), além da ficha técnica (músculos primários, músculos secundários, equipamento, mecânica, força e nível).
- **Visual Identity & Theme**:
  - **Aesthetic Direction**: Interface tátil de alta legibilidade em modo escuro (`slate-950` / `slate-900`), projetada para uso rápido com uma mão no chão de academia.
  - **Color Palette & Mood**: Superfícies estruturais em `slate-900` e `slate-950`, destaques de ação em `emerald-500` e `cyan-400`, indicadores de filtro ativo em `cyan-500/20` e metadados anatômicos limpos com separadores tipográficos (`·`).
  - **Interactive Feedback & Motion**: Transições suaves (`<= 200ms`) na expansão do player de mídia e abertura do modal de instruções, com alvos de toque mínimos de `44px` em botões de filtro e controles de mídia.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Player Animado Estilo Vídeo com Quadros Sincronizados**
  - *Chosen Approach*: Componente dedicado de mídia que pré-carrega os quadros do exercício e alterna automaticamente em loop (simulando vídeo contínuo da fase inicial e final do movimento), com botão de Play/Pause, indicador visual de pose (`Posição Inicial` / `Posição Final`) e fallback seguro caso alguma imagem externa falhe.
  - *Why*: Oferece a experiência de vídeo dinâmico solicitada sem consumo excessivo de banda móvel e com controle total de pausa para o personal trainer mostrar um ângulo específico ao aluno.
- **Decision 2: Compatibilidade Total com Treinos e Históricos Existentes**
  - *Chosen Approach*: Mapeamento automático entre as categorias anatômicas do JSON (`peito`, `dorsais`, `meio-das-costas`, `quadriceps`, `isquiotibiais`, `gluteos`, `ombros`, `biceps`, `triceps`, `panturrilhas`, `trapezio`, `abdominais`, etc.) e os grupamentos musculares do sistema, além de busca flexível por ID ou nome do exercício.
  - *Why*: Garante que o cálculo de volume semanal por grupamento muscular, exercícios substitutos e gráficos de evolução por série continuem funcionando perfeitamente.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Catálogo JSON de Exercícios (PT-BR)                  │
│   (Nome, Nível, Categoria, Mecânica, Força, Músculos 1º/2º, Equip.,     │
│                   Instruções Passo a Passo e Mídia)                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Camada de Dados e Busca (Storage & Index)               │
│  • Índice rápido por Nome, Músculo Primário, Secundário e Equipamento   │
│  • Lookup de Metadados + Mídia + Instruções para qualquer exercício     │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│        Aba Criação de Treino          │ │    Aba Execução de Treino     │
│  • Busca por nome em tempo real       │ │  • Mantém séries, PSE, timer  │
│  • Botão de Filtro (Músculo Primário, │ │  • Botão "Ver Mídia" (expande │
│    Músculo Secundário e Equipamento)  │ │    player animado no card)    │
│  • Mídia recolhida por padrão dentro  │ │  • Botão "Execução" (abre     │
│    do card aberto com botão expandir  │ │    Modal de Instruções)       │
└───────────────────┬───────────────────┘ └───────────────┬───────────────┘
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Componentes Visuais Compartilhados de Exercício             │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐  │
│  │     ExerciseMediaPlayer         │ │  ExerciseInstructionsModal    │  │
│  │ • Loop estilo vídeo (0/1)       │ │ • Passo a passo numerado      │  │
│  │ • Controles Play/Pause e Frame  │ │ • Anatomia 1ª/2ª e Mecânica   │  │
│  └─────────────────────────────────┘ └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`DatabaseExercise` (Expandido)**:
  - `id`: Identificador único do exercício (ex: `"Barbell_Bench_Press_-_Medium_Grip"`).
  - `name`: Nome traduzido em português.
  - `muscleGroup`: Grupamento principal mapeado para o resumo de séries do treino.
  - `primaryMuscles`: Lista de músculos primários exigidos pelo movimento.
  - `secondaryMuscles`: Lista de músculos secundários exigidos pelo movimento.
  - `equipment`: Equipamento utilizado (ex: `"barra"`, `"halteres"`, `"maquina"`, `"cabo"`, `"kettlebell"`, `"peso-do-corpo"`, etc.).
  - `level`: Classificação de dificuldade (`"iniciante"`, `"intermediario"`, `"avancado"`).
  - `mechanic`: Tipo de mecânica (`"composto"`, `"isolado"`).
  - `force`: Tipo de força (`"push"`, `"pull"`, `"static"`).
  - `category`: Categoria principal (`"forca"`, `"alongamento"`, `"pliometria"`, `"powerlifting"`, `"levantamento-olimpico"`, `"strongman"`, `"cardio"`).
  - `instructions`: Lista ordenada com a descrição passo a passo da execução.
  - `images`: Caminhos das mídias do exercício para reprodução animada.

### Interactive Component & State Mapping

- **Busca e Filtros na Criação (`CreateWorkoutSection`)**:
  - Digitar no campo de busca filtra instantaneamente por nome.
  - Clicar no botão **Filtros** abre/fecha o seletor de **Músculo Primário**, **Músculo Secundário** e **Equipamento**, com contador de filtros ativos e botão para limpar filtros.
  - Cada exercício no card de prescrição possui o estado local `expandedMediaIds[exerciseId]` (iniciado como `false` / recolhido) acionado pelo botão **"Ver Mídia"**.
- **Mídia e Modal de Execução na Execução de Treino (`WorkoutExecutionSection` & `ExerciseDedicatedPageView`)**:
  - O botão **"Ver Mídia"** alterna a abertura do `ExerciseMediaPlayer` diretamente no exercício em execução.
  - O botão **"Execução"** define o exercício selecionado para o `ExerciseInstructionsModal`, exibindo o passo a passo completo, anatomia primária e secundária, equipamento, mecânica e força sem interromper o cronômetro do treino.
