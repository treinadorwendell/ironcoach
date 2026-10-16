# Plano de Implementação - Experiência de Primeiro Acesso do Treinador (Clean Slate & Início na Agenda)

## 1. Visão Geral do Objetivo
Configurar a experiência do treinador ao efetuar login pela primeira vez ou após o cadastro para uma conta totalmente limpa, profissional e pronta para uso real:
- **Limpeza completa de dados de exemplo**: Eliminar qualquer cliente demo, treino de teste, histórico simulado e treinos em execução residuais, garantindo que o treinador comece do zero.
- **Limpeza de dados em cache no navegador**: Executar limpeza dos dados de exemplo salvos no `localStorage` do navegador do usuário.
- **Abertura padrão na aba Agenda**: Ao realizar login ou cadastro, direcionar sempre e obrigatoriamente para a aba **Agenda**.
- **Estados vazios com botão de ação rápida**: Telas de Alunos, Treinos, Execução e Agenda com design limpo e botões proeminentes para cadastro imediato.

---

## 2. Etapas de Modificação

### Etapa 1: Limpeza dos Seeds Iniciais e Cache Local (`lib/storage.ts`)
1. **Remoção de Dados Seed**:
   - Atualizar `INITIAL_CLIENTS` para `[]` (array vazio).
   - Atualizar `INITIAL_WORKOUTS` para `[]` (array vazio).
   - Atualizar `INITIAL_CALENDAR` para `[]` (array vazio).
   - Atualizar `INITIAL_COMPLETED_WORKOUTS` para `[]` (array vazio).
   - Atualizar `INITIAL_HISTORY` para `{}` (objeto vazio).
   - Preservar o catálogo geral `INITIAL_EXERCISE_DATABASE` (banco de exercícios de referência com biomecânica e grupos musculares) para permitir a prescrição ágil de treinos.

2. **Rotina de Purge / Limpeza de Cache no Navegador**:
   - Adicionar rotina de verificação no storage (`cleanSampleDataIfPresent`):
     - Remove qualquer `ironcoach_active_session_v2` pendente (treino em execução demo).
     - Remove snapshots de exercícios finalizados de teste (`ironcoach_exercise_finished_snapshots_v1`).
     - Remove clientes, treinos e agendamentos antigos que correspondam aos IDs de teste (`client-1`, `client-2`, `client-3`, `client-4`, `prog-1`, `prog-2`, etc.).
     - Se o treinador estiver logando pela primeira vez em conta nova, garante coleções limpas.

---

### Etapa 2: Abertura Padrão na Aba Agenda após Login / Cadastro (`app/page.tsx` & `components/AuthScreen.tsx`)
1. **Estado Inicial da Seção**:
   - Alterar o valor inicial de `currentSection` em `app/page.tsx` de `'execucao'` para `'agenda'`.
2. **Redirecionamento ao Logar ou Cadastrar**:
   - No callback `onSuccess` do `AuthScreen` e no listener `onAuthStateChanged`, acionar `setCurrentSection('agenda')`.
3. **Indicador de Treino em Andamento no BottomNav**:
   - Corrigir a propriedade `hasActiveSession` em `BottomNav.tsx` para ser dinâmica (`!!activeSession && activeSession.isStarted`), garantindo que não apareça indicador falso de treino ao vivo em contas recém-criadas.

---

### Etapa 3: Estados Vazios com Ações Rápidas nas Telas
1. **Tela de Alunos (`components/ClientSection.tsx`)**:
   - Quando `clients.length === 0`, renderizar um card de estado vazio moderno e receptivo, explicando que ainda não há alunos cadastrados, acompanhado de um botão em destaque: **"Cadastrar Primeiro Aluno"** que abre diretamente o modal de cadastro.
2. **Tela de Treinos (`components/CreateWorkoutSection.tsx`)**:
   - Se não houver alunos cadastrados (`clients.length === 0`), exibir card informativo com botão de ação rápida: **"Cadastrar Aluno para Prescrever Treino"** (que direciona diretamente para a aba de Clientes).
   - Se houver alunos mas o aluno selecionado ainda não possuir programas de treino, exibir card limpo com botão rápido: **"Criar Primeiro Programa de Treino"**.
3. **Tela de Execução do Treino (`components/WorkoutExecutionSection.tsx`)**:
   - Quando não houver alunos cadastrados, exibir estado vazio elegante com botão direto para cadastrar aluno.
   - Quando houver alunos mas nenhum treino prescrito, permitir navegar rapidamente para criação de treino.
   - Garantir inicialização segura de variáveis para evitar qualquer erro de inicialização léxica (`ReferenceError: can't access lexical declaration before initialization`).
4. **Tela de Agenda (`components/AgendaSection.tsx`)**:
   - Quando não houver agendamentos cadastrados no dia/semana, exibir visual limpo com botão de ação rápida: **"Agendar Primeiro Treino"**.

---

## 3. Validação e Testes
1. Validar fluxo completo de login e cadastro, confirmando que o usuário aterrissa na aba **Agenda**.
2. Verificar que nenhum cliente demo (ex: Carlos Silva, Mariana Oliveira) é exibido nas listas.
3. Verificar que nenhum treino de exemplo ou sessão fantasma em execução é exibido.
4. Testar o botão de ação rápida nas telas vazias de Alunos, Treinos e Agenda.
5. Executar `compile_applet` para assegurar que a aplicação compila sem erros TypeScript/React.
