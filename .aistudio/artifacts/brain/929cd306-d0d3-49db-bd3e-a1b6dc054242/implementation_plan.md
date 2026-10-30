# Plano de Implementação: Perfis de Treinador e Aluno + Modo de Desenvolvimento

Este plano detalha a arquitetura de **Controle de Acesso Baseado em Perfil (Treinador vs. Aluno)** integrada a um **Seletor Rápido de Desenvolvimento**, permitindo testar e operar simultaneamente a visão completa de gestão do Personal Trainer e a experiência dedicada do Aluno (focada em receber treinos, executar séries, consultar a dieta prescrita e acompanhar seu progresso).

---

## Revisão do Usuário & Decisões Confirmadas

- **Alternância de Perfil (Desenvolvimento e Acesso)**: Disponibilizar tanto um **seletor rápido no cabeçalho superior** (permitindo alternar instantaneamente entre *Visão Treinador* e *Visão Aluno*, escolhendo qual aluno cadastrado simular) quanto uma **opção de perfil na tela de Login/Autenticação** (*Entrar como Treinador* ou *Entrar como Aluno*).
- **Escopo de Permissões do Perfil Aluno**: O aluno tem acesso de leitura às prescrições enviadas pelo treinador (**Treino** e **Dieta**, sem botões de criar/excluir programas ou editar a estrutura nutricional) e **permissão interativa para executar séries** do seu treino do dia (marcar séries concluídas, ajustar carga/repetições realizadas, registrar PSE, usar cronômetro de descanso, registrar água consumida e finalizar o treino).
- **Navegação Inferior Exclusiva do Aluno**: Quando o perfil ativo for **Aluno**, a barra inferior (`BottomNav`) exibirá exatamente **3 abas dedicadas**:
  1. **Meu Treino** (visualização dos programas/divisões prescritas + execução interativa das séries)
  2. **Minha Dieta** (visualização das refeições do dia, macronutrientes, substituições permitidas e meta de hidratação)
  3. **Meu Progresso** (histórico de treinos concluídos, evolução de cargas e recordes pessoais do próprio aluno)

---

## 1. Visão Geral & Conceito Central

O **IronCoach** passará a operar sob dois perfis complementares conectados à mesma base de dados (Local + Sincronização em Nuvem):

1. **Perfil do Treinador (Gestão Completa)**:
   - Mantém todas as 4 abas originais (*Cliente*, *Agenda*, *Criar Treino*, *Execução do Treino*).
   - Possui controle total sobre cadastro de alunos, anamnese, prescrição de programas e métodos avançados, montagem de dietas/tabelas nutricionais e controle financeiro/agenda.
2. **Perfil do Aluno (Portal de Recebimento & Execução)**:
   - Interface limpa e focada exclusivamente nos dados do aluno vinculado (`activeStudentId`), ocultando informações de outros clientes, valores de contrato, agenda geral do treinador e ferramentas de edição estrutural.
   - Permite que o aluno consulte sua ficha de treino da semana, inicie e registre sua sessão de treino em tempo real, consulte seu plano alimentar com opções de substituição equivalentes e acompanhe sua evolução de cargas.
3. **Barra/Seletor de Desenvolvimento (Dev Role Switcher)**:
   - Controle compacto no topo da aplicação que permite alternar com 1 toque entre `Treinador` e `Aluno`, incluindo um seletor rápido do aluno ativo para pré-visualizar exatamente como cada cliente enxerga seu treino e sua dieta.

---

## 2. Experiência do Usuário & Design Visual

### Fluxo 1: Seletor Rápido no Topo (Modo Desenvolvimento) e Login
- **No Cabeçalho Superior**:
  - Um controle segmentado compacto exibe o modo atual: `Treinador` (ícone de escudo/haltere em esmeralda) ou `Aluno` (ícone de usuário em ciano/azul).
  - Ao selecionar `Aluno`, um menu suspenso integrado permite escolher qualquer aluno cadastrado (ex: *Carlos Eduardo*, *Mariana Silva*) para inspecionar sua visão imediatamente.
- **Na Tela de Login / Autenticação**:
  - Acima das credenciais, um seletor permite escolher o perfil de entrada (**Sou Treinador** vs. **Sou Aluno**) ou ativar diretamente o **Acesso Rápido de Desenvolvimento** para testar os dois perfis sem fricção.

### Fluxo 2: Aba "Meu Treino" (Visão do Aluno)
- **Cabeçalho de Boas-Vindas do Aluno**: Exibe o nome do aluno, objetivo atual do programa ativo (ex: *Hipertrofia*) e o destaque para o **Treino de Hoje** segundo o dia da semana.
- **Seleção de Divisão (Split A, B, C...)**: O aluno visualiza os exercícios prescritos pelo treinador com séries, zona de repetições, métodos avançados, observações técnicas e mídia demonstrativa (GIF/vídeo/instruções).
- **Execução Interativa de Séries**: Ao tocar em **Iniciar**, o aluno entra na interface de execução otimizada para mobile (números de série compactos à esquerda, botões `-` e `+` amplos de `32x38px`, ajuste de carga em kg, seletor de PSE, cronômetro de descanso e botão de concluir série/finalizar treino). Controles exclusivos do treinador (como trocar de aluno ou excluir ficha) ficam ocultos.

### Fluxo 3: Aba "Minha Dieta" (Visão do Aluno)
- **Resumo Diário & Hidratação**: Cartão superior com a meta calórica e de macronutrientes prescrita pelo treinador (Proteínas, Carboidratos, Gorduras e Fibras) ao lado do rastreador interativo de ingestão de água do dia (`+250ml`, `+500ml`).
- **Cronograma de Refeições (Somente Leitura + Substituições)**:
  - Seleção da rotina do dia (ex: *Dias de Treino* vs. *Dias de Descanso*).
  - Lista cronológica de refeições (*Café da Manhã*, *Almoço*, *Pré-Treino*, *Jantar*) exibindo alimentos, quantidades em gramas e medidas caseiras.
  - Botão para consultar as **Opções de Substituição** e **Receitas Equivalentes** liberadas pelo treinador para cada item ou refeição, sem expor os painéis de cálculo metabólico ou edição da dieta.

### Fluxo 4: Aba "Meu Progresso" (Visão do Aluno)
- **Resumo de Consistência**: Total de treinos realizados, volume total movimentado e últimos feedbacks de progressão pós-treino.
- **Evolução por Exercício e Histórico**: Reutiliza a visualização analítica de evolução de cargas e histórico de sessões filtrada estritamente para o aluno logado/selecionado, em modo somente leitura (sem botão de apagar registros históricos).

---

## 3. Decisões de Produto & Trade-Offs

- **Sincronização Unificada em Tempo Real**:
  - *Decisão*: Quando o aluno conclui um treino na aba *Meu Treino* ou registra consumo de água em *Minha Dieta*, os dados gravam diretamente nas mesmas coleções persistidas do aluno (`completedWorkouts`, `exerciseSnapshots`, `dietPlans`).
  - *Benefício*: Ao alternar de volta para o **Perfil do Treinador**, o treinador vê instantaneamente o treino concluído pelo aluno, o relatório de evolução de carga/PSE e a hidratação atualizada.
- **Proteção Visual e Funcional no Perfil do Aluno**:
  - *Decisão*: Ocultar todas as ações destrutivas ou administrativas (criar/editar/excluir alunos, editar estrutura de treinos, configurar fórmulas metabólicas, visualizar valores financeiros e agenda de outros alunos).
  - *Benefício*: Garante que o aluno tenha uma experiência limpa, sem risco de alterar acidentalmente a prescrição planejada pelo treinador.

---

## 4. Arquitetura Técnica & Estratégia de Dados

### Diagrama de Arquitetura e Fluxo de Estado

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     ESTADO GLOBAL & CONTEXTO DE PERFIL                     │
│  appRole: 'trainer' | 'student'   •   activeStudentId: string (Client ID)  │
└───────────────────┬────────────────────────────────────┬───────────────────┘
                    │                                    │
      ┌─────────────▼─────────────┐        ┌─────────────▼─────────────┐
      │   SELETOR NO CABEÇALHO    │        │     OPÇÃO NO LOGIN        │
      │  [Treinador | Aluno ▾]    │        │  Escolha de Perfil / Dev  │
      └─────────────┬─────────────┘        └─────────────┬─────────────┘
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        ▼                                                           ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│          VISÃO DO TREINADOR           │   │            VISÃO DO ALUNO             │
│  (4 Abas: Cliente, Agenda, Criar,     │   │  (3 Abas filtradas por activeStudent) │
│   Execução • Controle Total CRUD)     │   │  Somente Leitura + Execução de Séries │
└───────────────────┬───────────────────┘   └───────────────────┬───────────────────┘
                    │                                           │
                    │                                           ├──► 1. Meu Treino
                    │                                           │    (Programas + Execução)
                    │                                           ├──► 2. Minha Dieta
                    │                                           │    (Refeições + Água)
                    │                                           └──► 3. Meu Progresso
                    │                                                (Histórico + Cargas)
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             CAMADA DE PERSISTÊNCIA (LocalStorage + Firestore)              │
│   Clients • Workouts • DietPlans • ActiveSession • CompletedWorkouts       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados & Estado
- **Tipos de Perfil e Navegação**:
  - `UserRole = 'trainer' | 'student'`
  - `StudentNavSection = 'meu-treino' | 'minha-dieta' | 'meu-progresso'`
  - Persistência da preferência de perfil de desenvolvimento e do `activeStudentId` no armazenamento local (`ironcoach_app_role` e `ironcoach_active_student_id`) para manter o estado ao recarregar a página.

### Mapeamento de Componentes Interativos
- **Cabeçalho (`Header`)**: Recebe o seletor de perfil (`appRole`, `onChangeRole`) e o seletor rápido de aluno (`clients`, `activeStudentId`, `onSelectStudent`) quando em modo Aluno, além de adaptar o subtítulo e ocultar o modal de edição do perfil do treinador quando na visão do aluno.
- **Navegação Inferior (`BottomNav`)**: Renderiza dinamicamente a grade de 4 colunas para o `trainer` (*Cliente*, *Agenda*, *Criar Treino*, *Execução*) ou a grade de 3 colunas para o `student` (*Meu Treino*, *Minha Dieta*, *Meu Progresso*) com indicador de sessão de treino ao vivo.
- **Portal do Aluno (`StudentPortalView` + Reuso de Execução/Dieta/Progresso)**:
  - **Aba Meu Treino**: Filtra `workouts` por `clientId === activeStudentId`, apresenta os cards das divisões semanais e integra a tela de execução (`WorkoutExecutionSection`) travada no aluno ativo (`lockedClientId={activeStudentId}`).
  - **Aba Minha Dieta**: Carrega o `ClientDietPlan` do aluno ativo e exibe metas calóricas/macros, seletor de programação diária, cards de refeições com medidas caseiras, modal/expansão de substituições equivalentes e registro diário de água.
  - **Aba Meu Progresso**: Renderiza os gráficos e histórico de evolução (`WorkoutHistoryPage`) restritos ao aluno ativo em modo `readOnly` (sem exclusão de histórico).
