# Plano de Implementação: Correção Definitiva de Status e Recorrência na Agenda

## 1. Causa Raiz Identificada
Atualmente, quando um agendamento com recorrência é criado, o sistema salvava apenas **um único objeto `CalendarEvent`** compartilhado entre todos os dias da semana selecionados. Além disso:
- Em `app/page.tsx`, a função `handleAddCalendarEvent` procurava por `(e.clientId === newEvent.clientId && e.date === newEvent.date)` e mesclava o novo evento com o evento pai (`{ ...updated[existingIndex], ...newEvent }`), sobrescrevendo o `status` do evento pai quando a alteração ocorria na data inicial ou propagando o mesmo status para todas as datas da recorrência.
- Nos filtros de visualização (`dayEvents`, `semana`, `mes`), todas as datas liam o `e.status` do mesmo registro pai.

---

## 2. Solução Arquitetural (100% Independente por Dia)

### A. Geração de Agendamentos Independentes até a Data Limite (`components/AgendaSection.tsx` & `app/page.tsx`)
1. **Expansão Real de Datas no Momento da Criação**:
   - Ao criar um agendamento com dias da semana selecionados (`recurringDays.length > 0`) e data limite (`recurringEndDate`):
   - O sistema calculará todas as datas correspondentes aos dias da semana escolhidos no intervalo entre a **Data de Início (`eventDate`)** e a **Data Limite (`recurringEndDate`)**.
   - Para cada data encontrada no período, será criado um registro `CalendarEvent` **individual e independente** no banco de dados / LocalStorage / Firebase, cada um com seu próprio `id` único e sua própria propriedade `date: YYYY-MM-DD`.
   - Dessa forma, cada aula da semana existe como um compromisso real e autônomo na agenda e nos relatórios financeiros.

### B. Alteração Direta de Status Apenas do Dia Selecionado (`components/AgendaSection.tsx`)
1. **Mudança Instantânea em 1 Toque (`handleQuickStatusChange`)**:
   - Ao clicar nos botões de status (**Realizado**, **Reagendado**, **Falta** ou **Agendado**) ou ao editar um agendamento no modal:
   - O sistema aplicará a mudança de status **diretamente e exclusivamente ao agendamento daquele dia**, sem exibir modal intermediário e sem afetar nenhum outro dia da semana.
2. **Compatibilidade Automática com Agendamentos Recorrentes Antigos (Legados)**:
   - Caso já exista na agenda do usuário algum agendamento antigo salvo no formato compartilhado anterior (`recurringDays.length > 0`), ao alterar o status em uma data específica (`targetDate`), o sistema automaticamente:
     - Adiciona `targetDate` em `recurringExceptions` do registro antigo;
     - Cria um registro individual autônomo para `targetDate` com o novo status (`recurringDays: []`), garantindo que mesmo agendamentos criados antes desta atualização jamais alterem os outros dias da semana.

### C. Correção do Handler de Persistência (`app/page.tsx`)
1. **Atualização de `handleAddCalendarEvent` e `handleUpdateCalendarEvent`**:
   - Garantir que `handleUpdateCalendarEvent` sincronize imediatamente a alteração no `localStorage` e no Firebase (`cloudSync.syncCalendarEvent`).
   - Evitar que `handleAddCalendarEvent` mescle acidentalmente propriedades de eventos recorrentes ao criar agendamentos individuais.
   - Suportar a criação em lote de todas as datas geradas até `recurringEndDate` sem perda de estado concorrente.

---

## 3. Fluxo de Verificação
1. **Criar Agendamento Recorrente**:
   - Selecionar Seg, Qua, Sex com data limite para o final do mês.
   - Confirmar que cada segunda, quarta e sexta até a data limite recebe seu próprio agendamento independente.
2. **Alterar Status de um Único Dia**:
   - Marcar a aula de Segunda-feira como **Realizado** (ou **Falta** / **Reagendado**).
   - Navegar para Quarta-feira e Sexta-feira e confirmar que permanecem com status **Agendado** inalterado.
3. **Relatório e Histórico**:
   - Abrir o Relatório da Agenda e confirmar que apenas a data marcada consta como Realizada/Falta/Reagendada.
