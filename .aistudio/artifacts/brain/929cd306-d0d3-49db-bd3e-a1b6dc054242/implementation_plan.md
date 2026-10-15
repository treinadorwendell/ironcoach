# Gestão Avançada da Agenda: Exclusão, Automação Pós-Treino e Relatórios com PDF

Plano abrangente para implementar a exclusão direta de compromissos na edição da Agenda, confirmação automática para marcar aula como "Realizada" ao concluir um treino, e módulo completo de Relatórios de Aulas (Realizadas, Reagendadas, Faltas) e Financeiro por plano de cliente (Mensal, Semanal e Avulsa com soma de valores), com exportação profissional para PDF.

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões de experiência do usuário confirmadas na Fase 1 foram incorporadas:
> 1. **Visualização do Relatório**: Janela modal completa (fullscreen modal) sobreposta à Agenda, oferecendo amplo espaço para filtros, resumo financeiro, tabela detalhada e visualização de impressão/PDF sem perder o contexto do app.
> 2. **Valores Financeiros**: Os valores e tipos de contrato (Avulsa, Semanal, Mensal) são obtidos diretamente do cadastro do aluno (`Client.contractType` e `Client.contractValue`), com campos de ajuste/personalização rápida na tela de relatório para flexibilidade do treinador.
> 3. **Confirmação de Conclusão**: Diálogo integrado de confirmação ao finalizar o treino do aluno na aba Execução, perguntando se deseja marcar a aula na Agenda como "Realizada" na data correspondente.

- **Decisão Confirmada 1**: Visualização em modal completa para relatórios e exportação PDF.
- **Decisão Confirmada 2**: Integração dos valores do cadastro de clientes com edição rápida de valores no relatório.
- **Decisão Confirmada 3**: Pergunta de confirmação direta ao salvar/concluir o treino para sincronizar com a Agenda.

---

## 1. Overview & Core Concept

- **O que faz**:
  1. **Exclusão de Agendamentos na Edição**: Adiciona botão de exclusão com confirmação dentro do modal de edição de compromisso da Agenda (além das ações rápidas nos cards), permitindo remover aulas de forma segura.
  2. **Automação Pós-Treino**: Ao finalizar uma sessão de treino na aba Execução, o sistema detecta a data e o aluno atendido, solicitando a confirmação do treinador para marcar a aula correspondente na Agenda como "Realizada" (ou criar o registro de aula realizada caso ainda não existisse na agenda para o dia).
  3. **Relatório de Aulas e Financeiro**: Nova ferramenta acessível na Agenda com filtros por período (Hoje, Esta Semana, Este Mês, Intervalo customizado), filtro por aluno e status (Realizadas, Reagendadas, Faltas). Apresenta a descrição do treino realizado, data, horário e discriminação financeira por plano (Mensal, Semanal e Avulsa, com soma total dos valores avulsos e consolidação de receita).
  4. **Exportação em PDF**: Layout otimizado para impressão/PDF de alta fidelidade visual, formatado para página A4, ocultando botões de navegação e exibindo cabeçalho profissional do Iron Coach, dados do período e tabelas legíveis.
- **Público-Alvo**: Personal trainers e treinadores que gerenciam múltiplos alunos e precisam de controle de assiduidade, histórico de aulas e conciliação financeira simplificada.
- **Valor Principal**: Elimina a duplicidade de trabalho (treinar o aluno e ter que ir na agenda marcar manualmente), dá poder de exclusão de horários e gera prestação de contas e relatórios financeiros instantâneos para cobrança e gestão.

---

## 2. User Experience & Visual Design

### Fluxos Principais do Usuário

1. **Exclusão de Agendamento na Edição**:
   - O treinador clica em um compromisso na Agenda para editar.
   - No rodapé do modal de edição, além de "Cancelar" e "Atualizar Agendamento", haverá um botão destrutivo vermelho "Excluir Agendamento" com ícone de lixeira.
   - Ao clicar, abre o modal de confirmação para evitar cliques acidentais e, confirmando, remove o evento do estado local e do Firestore.

2. **Automação ao Finalizar Treino**:
   - O treinador conclui as séries e clica em "Finalizar Treino" na aba Execução.
   - O modal de celebração apresenta um card destacado de integração com a Agenda:
     - Pergunta: *"Deseja registrar esta aula na Agenda como Realizada para [Nome do Aluno] na data de hoje ([Data])?"*
     - Botão de confirmação com 1 toque *"Sim, Marcar como Realizada"* e opção *"Apenas Concluir Treino"*.
     - Se confirmado, localiza o agendamento do aluno na data e atualiza seu status para `realizado`, vinculando a descrição do split/treino; caso não exista agendamento prévio no dia, cria automaticamente a entrada como realizada.

3. **Módulo de Relatórios da Agenda e Financeiro**:
   - Botão no topo da Agenda: `[Relatório & Financeiro]`.
   - Abre uma janela modal completa com tema dark slate consistente com o restante da aplicação.
   - **Barra de Filtros**:
     - Filtro rápido de datas: `Hoje` | `Esta Semana` | `Este Mês` | `Últimos 30 dias` | `Intervalo Personalizado (De / Até)`.
     - Filtro por Aluno: `Todos os Alunos` ou seleção individual.
     - Filtro por Status: `Realizadas` (verde), `Reagendadas` (âmbar), `Faltas` (rosa/vermelho).
   - **Cards de Métricas Financeiras**:
     - *Aulas Avulsas*: Contagem de aulas × valor individual = Total faturado em avulsas.
     - *Planos Semanais*: Quantidade de alunos ativos e estimativa de receita.
     - *Planos Mensais*: Quantidade de alunos ativos e receita mensal consolidada.
     - *Receita Total do Período*: Soma geral das aulas realizadas e planos vigentes.
   - **Tabela / Ledger de Sessões**:
     - Colunas: Data & Hora, Aluno, Status, Treino Realizado (nome do split/exercícios), Plano & Valor, Observações/Reagendamento.
   - **Exportação para PDF**:
     - Botão `[Exportar PDF / Imprimir]`.
     - Aciona o visualizador de impressão com estilos CSS `@media print` dedicados: fundo branco para economia de tinta, tipografia em alto contraste, tabelas nítidas sem corte de margens e resumo financeiro profissional no cabeçalho.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Exclusão com Duplo Nível de Confirmação**:
  - *Abordagem*: Manter tanto o botão rápido nos cards quanto um botão explícito no modal de edição. Ambos disparam o diálogo de confirmação para prevenir perda de histórico acidental.
  - *Motivo*: Evita frustração do usuário ao mesmo tempo em que garante segurança contra toques involuntários em dispositivos móveis.
- **Decisão 2: Correspondência Inteligente de Agendamento no Treino Concluído**:
  - *Abordagem*: Comparar `clientId` e a data (`YYYY-MM-DD`). Se houver compromisso no dia para aquele aluno, atualizar para `'realizado'`. Se não houver, criar um novo evento com status `'realizado'` e horário do término.
  - *Motivo*: O treinador frequentemente executa o treino sem ter agendado previamente no calendário; a automação deve cobrir ambos os cenários sem falhas.
- **Decisão 3: Mecanismo de Exportação PDF**:
  - *Abordagem*: Utilizar layout especializado de impressão via `@media print` e folha de estilo dedicada com acionamento nativo `window.print()`.
  - *Motivo*: Garante fidelidade vetorial perfeita de fontes, tabelas e cabeçalhos em qualquer resolução de PDF (A4), com suporte a todas as impressoras virtuais de PDF (Chrome, Safari, Android, iOS) sem adicionar bibliotecas pesadas de 500KB ao bundle do PWA.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitetura e Fluxo de Dados

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APLICAÇÃO IRON COACH                          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ Aba Execução │           │  Aba Agenda  │           │ Aba Clientes │
└──────┬───────┘           └──────┬───────┘           └──────┬───────┘
       │                          │                          │
       │ Ao finalizar:            │ Botão Relatório:         │ Planos &
       │ Pergunta confirmação     │ Abre AgendaReportModal   │ Valores R$
       ▼                          ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         AgendaReportModal                              │
│  - Filtros: Período (Datas), Aluno, Status (Realizado/Reagendado/Falta)│
│  - Resumo Financeiro: Avulsas (Soma R$), Semanais, Mensais             │
│  - Tabela Detalhada com Treinos Realizados                             │
│  - Exportação para PDF / Impressão A4                                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Estado Global & Firestore                       │
│  - CalendarEvent (status: 'realizado', 'reagendado', 'falta', etc.)    │
│  - CompletedWorkoutRecord (histórico técnico de treinos concluídos)    │
│  - Client (contractType: 'Avulsa'|'Semanal'|'Mensal', contractValue)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Componentes e Modificações Planejadas

1. `components/AgendaSection.tsx`:
   - Adicionar botão "Excluir Agendamento" no rodapé do modal de edição (`openEditModal`).
   - Adicionar botão "Relatórios & Financeiro" no topo da visualização da Agenda.
   - Integrar o componente `AgendaReportModal`.
2. `components/AgendaReportModal.tsx` (Novo Componente):
   - Modal completo em tela cheia com cabeçalho limpo, botões de fechar e exportar PDF.
   - Controles de filtro por período, aluno e status.
   - Resumo financeiro segmentado: Total Aulas Avulsas (soma exata dos valores), Planos Semanais e Planos Mensais.
   - Tabela de conferência com descrição do treino realizado (cruzando com `CompletedWorkoutRecord` pelo aluno e data).
   - Estilização `@media print` para renderização perfeita em folha A4.
3. `components/WorkoutExecutionSection.tsx`:
   - No modal de conclusão de treino (`isFinishedModalOpen`), adicionar opção/pergunta de confirmação: *"Registrar aula como Realizada na Agenda?"*.
   - Integrar com `calendarEvents` e disparar callback `onConfirmRegisterInAgenda`.
4. `app/page.tsx`:
   - Conectar o callback de registro na agenda entre `WorkoutExecutionSection` e o estado `calendarEvents`, persistindo automaticamente no LocalStorage e no Firestore via `cloudSync`.
