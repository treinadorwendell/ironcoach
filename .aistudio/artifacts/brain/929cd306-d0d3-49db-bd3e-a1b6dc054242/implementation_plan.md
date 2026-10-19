# Plano de Implementação: Data Limite Obrigatória para Agendamentos Recorrentes

## 1. Visão Geral
Adicionar o campo de **Data Limite da Recorrência** ao agendar um novo horário ou editar um horário existente quando dias da semana forem selecionados:
- **Campo de calendário específico**: Permite ao treinador definir a data exata de término do contrato/pacote ou ciclo de treinos recorrentes.
- **Obrigatoriedade estrita**: Caso o usuário selecione um ou mais dias de repetição na semana, a data limite se torna obrigatória para salvar o agendamento.
- **Cálculo de Expiração na Agenda**: O evento recorrente deixará de ser gerado e exibido após a data limite selecionada em todas as visualizações (Dia, Semana, Mês, Ano e Programação).
- **Indicador Visual**: Nos cards de aula recorrente, exibir a data de vigência final (ex.: `Recorrente até 20/12/2026`).

---

## 2. Modificações Propostas

### A. Tipagem (`types/index.ts`)
- Adicionar a propriedade opcional `recurringEndDate?: string; // YYYY-MM-DD até qual data a recorrência fica ativa` na interface `CalendarEvent`.

### B. Interface do Formulário de Agendamento (`components/AgendaSection.tsx`)
1. **Estado do Formulário**:
   - Adicionar estado `recurringEndDate`:
     - Inicializado vazio em `openNewModal`.
     - Carregado com `event.recurringEndDate || ''` em `openEditModal`.
2. **Exibição Condicional do Campo**:
   - Assim que `recurringDays.length > 0` (pelo menos 1 dia da semana selecionado), exibir o bloco:
     - Rótulo: **"Até qual data a recorrência fica ativa? *"** com indicador visual de obrigatoriedade.
     - Campo `<input type="date" required min={eventDate} value={recurringEndDate} ... />`.
     - Mensagem informativa dinâmica indicando o período de validade (ex.: `De 19/10/2026 até 19/11/2026`).
3. **Validação ao Salvar (`handleSubmit`)**:
   - Se `recurringDays.length > 0`:
     - Verificar se `recurringEndDate` está preenchido. Se não estiver: exibir aviso `Por favor, informe até qual data a recorrência ficará ativa.`
     - Verificar se `recurringEndDate >= eventDate`. Se for menor: exibir aviso `A data limite não pode ser anterior à data de início do agendamento.`
4. **Propagação no Diálogo de Escopo**:
   - Incluir `recurringEndDate` nos dados passados ao `recurringScopePrompt` para que alterações em "Todos os eventos da recorrência" preservem ou atualizem a data final.

### C. Filtros de Exibição da Agenda (`components/AgendaSection.tsx`)
- **Visualização Diária (`dayEvents`)**:
  - Adicionar checagem: se `e.recurringEndDate && selectedDate > e.recurringEndDate`, o evento recorrente não deve ser retornado.
- **Visualização Semanal (`currentWeekDays`)**:
  - Adicionar checagem: se `e.recurringEndDate && day.dateStr > e.recurringEndDate`, o evento recorrente não deve ser gerado para aquele dia da semana.
- **Visualização Programação / Geral**:
  - Em cards com repetição, exibir `Recorrente até DD/MM/AAAA`.

---

## 3. Plano de Verificação e Testes
1. **Teste de Agendamento sem Recorrência**:
   - Cadastrar um agendamento pontual em uma data única. Confirmar que o campo de data limite não é exibido nem exigido.
2. **Teste de Agendamento com Recorrência**:
   - Selecionar Seg/Qua/Sex. Verificar que o campo de calendário de data limite surge instantaneamente.
   - Tentar salvar sem preencher a data limite e verificar mensagem de bloqueio amigável.
   - Definir uma data limite (ex.: 2 semanas à frente) e salvar.
3. **Teste de Limite de Exibição**:
   - Navegar para datas anteriores à data limite: confirmar que o evento é gerado normalmente.
   - Navegar para datas posteriores à data limite: confirmar que o evento não aparece mais no calendário.
4. **Compilação e Integridade**:
   - Executar `npx tsc --noEmit` para validação estrita de tipos.
   - Testar portas 3000 e 8080.
