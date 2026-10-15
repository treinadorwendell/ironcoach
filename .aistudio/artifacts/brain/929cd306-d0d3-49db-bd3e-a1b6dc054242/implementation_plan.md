# Plano de Implementação - Seleção Inicial de Aluno na Aba Execução do Treino

## 1. Visão Geral
Ajustar o fluxo da aba **Execução do Treino** (`WorkoutExecutionSection.tsx`) para que, ao abrir a aba (caso não haja um treino em andamento / iniciado `session?.isStarted`), a tela inicial exiba uma lista limpa e interativa de **seleção de aluno** (com cards de alunos, busca rápida e indicação de planos/avaliações). 

Apenas se houver um treino ativo e em andamento (`session?.isStarted === true`), o app irá direto para a tela de execução do treino. Ao selecionar o aluno, o sistema avança para a visualização dos programas de treino daquele aluno (Etapa 1 / Etapa 2 / Etapa 3).

## 2. Passos de Implementação
1. **Modificação do Estado Inicial em `WorkoutExecutionSection.tsx`**:
   - Adicionar uma etapa inicial chamada `'selecao-aluno'` quando não houver um treino ativo em andamento.
   - Caso `session?.isStarted` seja verdadeiro, definir o passo como `'execucao'`.
2. **Criação da Tela de Seleção de Aluno**:
   - Exibir grid ou lista vertical de alunos cadastrados (`clients`), mostrando foto/avatar ou iniciais, nome, plano, peso e botão "Selecionar Aluno".
   - Campo de busca rápida de alunos.
3. **Transição de Etapas**:
   - Ao selecionar o aluno na tela inicial, atualizar `selectedClientId` e transicionar para o passo `'programas'` (mostrando os programas de treino verticalmente daquele aluno).
   - Botão "Voltar à Seleção de Alunos" na Etapa de Programas.
