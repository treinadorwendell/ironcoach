# Relatório de Feedback, Evolução e Próxima Meta do Treino

Implementação da funcionalidade de **Feedback e Relatório Comparativo ao Finalizar o Treino**, com cálculo automático de melhorias em relação ao histórico anterior, definição da **Próxima Meta do Treino** e painel de análise pré-treino antes de iniciar a sessão seguinte.

---

## 1. Modelo de Dados e Persistência (`types/index.ts`, `lib/storage.ts`, `lib/firebase.ts`)
- Criação da interface `WorkoutFeedbackReport` vinculada ao registro do treino concluído (`CompletedWorkoutRecord`):
  - **Métricas Globais Comparativas**:
    - Volume total atual vs. anterior (diferença em `kg` e `%`).
    - Total de repetições realizadas atual vs. anterior.
    - Média de PSE da sessão atual vs. anterior.
  - **Comparativo Detalhado por Exercício (`ExerciseImprovementItem`)**:
    - **Evolução de Carga (%)**: Maior carga ou carga média da série atual comparada ao último registro do mesmo exercício, exibida em **porcentagem (`+X.X%`)** e valor absoluto (`kg`).
    - **Evolução de Repetições**: Diferença no total/média de repetições executadas.
    - **Evolução de Volume**: Diferença de tonelagem (`carga × repetições`) no exercício (`kg` e `%`).
    - **Relação PSE × Carga (Eficiência Biomecânica/Esforço)**:
      - Identifica cenários como: *Ganho de Força com Menor/Igual Esforço* (Carga ↑ e PSE ≤ anterior), *Adaptação de Esforço* (Carga = e PSE ↓), *Progressão de Carga com Esforço Proporcional* (Carga ↑ e PSE ↑) ou *Manutenção*.
  - **Próxima Meta do Treino (`nextWorkoutGoal`)**:
    - Campo descritivo salvo no relatório e no histórico do treino do aluno para consulta antes da próxima sessão.

---

## 2. Botão "Gerar Relatório" e Modal de Feedback Pós-Treino (`components/WorkoutExecutionSection.tsx`)
- **Validação de Histórico Anterior**:
  - Ao finalizar o treino, o sistema verifica se o aluno possui **pelo menos um treino anterior registrado** no histórico (do mesmo treino/divisão ou contendo os mesmos exercícios).
  - Caso **exista histórico anterior**, exibe o botão em destaque **"Gerar Relatório de Evolução"** no modal de conclusão do treino.
  - Caso **seja o primeiro treino** (sem histórico anterior para comparação), o botão informa que o relatório comparativo estará disponível a partir do segundo treino registrado, permitindo ainda registrar a **Próxima Meta do Treino** se desejado.
- **Visualização do Relatório de Feedback**:
  - Exibe os indicadores de melhoria (**Carga em %**, **Repetições**, **Volume Total** e **Análise da Relação PSE × Carga**) destacando todas as evoluções alcançadas na sessão.
  - Inclui o campo de texto **"Próxima Meta do Treino"** para o treinador descrever o foco e os alvos da próxima sessão.
  - Ao clicar em **"Salvar Relatório e Concluir"**, persiste o relatório e a meta no histórico local e sincroniza com o banco de dados.

---

## 3. Análise Pré-Treino (Antes de Iniciar o Treino) (`components/WorkoutExecutionSection.tsx`)
- **Painel "Análise do Último Treino & Próxima Meta"**:
  - Exibido automaticamente **antes de iniciar o treino** (no card do treino e no topo da tela de execução enquanto o cronômetro aguarda o clique em *"Iniciar Treino"*, além de um botão rápido para consultar a qualquer momento):
    - **Próxima Meta Definida**: Destaque visual com a descrição da meta deixada no treino anterior.
    - **Resumo das Últimas Melhorias**: Resumo rápido da evolução de carga (%), volume, repetições e relação PSE × Carga do último relatório salvo, com opção de abrir o histórico completo de relatórios daquele treino.
