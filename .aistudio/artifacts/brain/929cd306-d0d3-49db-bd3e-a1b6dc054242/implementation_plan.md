# Cronômetro Contínuo em Segundo Plano e Trava de Edição Pré-Início do Treino

Ajuste do cronômetro do treino para continuar a contagem real mesmo com o aplicativo minimizado ou fechado no mobile/tablet, aliado ao modo de visualização pré-início (bloqueando alterações nos registros até clicar em **"Iniciar Treino"**) e contagem ininterrupta até **"Concluir e Finalizar"**.

---

## 1. Visão Geral e Fluxo de Experiência (UX)

1. **Navegação e Visualização Livre Antes de Iniciar (`!session.isStarted`)**:
   - Ao acessar **Execução do Treino → Selecionar Aluno → Selecionar Treino**, o treinador pode:
     - Visualizar a lista completa de exercícios do treino.
     - **Expandir e recolher** qualquer card de exercício (`Expandir Todos`, `Recolher Todos` ou clique individual).
     - Abrir a **página individualizada do exercício** (*Executar / Visualizar*) para consultar séries prescritas, zonas de repetições, métodos, observações biomecânicas, tempo de descanso e histórico de evolução.
   - **Bloqueio de Alterações até Clicar em "Iniciar Treino"**:
     - Enquanto o botão **"Iniciar Treino"** não for acionado, todas as ações de alteração (marcar série/subsérie como concluída, alterar carga `kg`, ajustar repetições, selecionar PSE, trocar pelo exercício substituto, copiar carga, registrar comentários/observações ou concluir exercício) ficam bloqueadas.
     - Caso o usuário toque em qualquer campo de edição antes de iniciar, um aviso visual orienta a clicar em **"Iniciar Treino"** no topo da tela.

2. **Contagem Contínua até Concluir e Finalizar**:
   - Ao clicar em **"Iniciar Treino"**, o timestamp exato de início (`startTime`) é gravado e todas as edições de séries, cargas, repetições e PSE são liberadas imediatamente.
   - O botão de pausa manual do cronômetro do treino é removido: **o cronômetro corre de forma contínua e só para no momento em que o treino for concluído e finalizado** (*"Concluir e Finalizar"*).

3. **Persistência do Cronômetro com App Minimizado ou Fechado (Mobile e Tablet)**:
   - O cálculo do tempo decorrido deixa de depender apenas de incrementos de `+1s` em memória (`setInterval`) e passa a ser calculado pela diferença real de horário (`Date.now() - Date.parse(session.startTime)`).
   - Ao minimizar o navegador/PWA, bloquear a tela do celular/tablet ou fechar e reabrir o aplicativo, o cronômetro recalcula instantaneamente o tempo real decorrido (via eventos `visibilitychange`, `focus`, `pageshow` e hidratação do `localStorage`/Firestore), sem perder nenhum segundo.
   - O cronômetro de descanso entre séries (`RestCountdownTimer`) também passa a utilizar timestamp de término real (`endTimeMs`) para não atrasar quando a tela é minimizada.

---

## 2. Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ActiveWorkoutSession                             │
│  • isStarted: boolean (false ao abrir o treino -> true ao Iniciar)      │
│  • startTime: ISO Timestamp real do momento em que clicou em "Iniciar"  │
│  • elapsedSeconds: Math.floor((Date.now() - Date.parse(startTime))/1000)│
└───────────────────┬─────────────────────────────────────┬───────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│   Modo Visualização (!isStarted)      │ │   Modo Em Execução (isStarted)│
│ • Navegar exercícios (Lista/Dedicada) │ │ • Edição liberada (Carga,     │
│ • Expandir / Recolher cards           │ │   Reps, PSE, Check, Substituto│
│ • Consultar histórico e observações   │ │ • Cronômetro contínuo via     │
│ • Controles de alteração bloqueados   │ │   Timestamp real (Background) │
│   com aviso "Inicie o treino"         │ │ • Para apenas ao Finalizar    │
└───────────────────────────────────────┘ └───────────────────────────────┘
```

### Componentes Atualizados
- **Persistência da Sessão Ativa**:
  - Ao restaurar uma sessão já iniciada (`session.isStarted === true`), atualiza imediatamente `elapsedSeconds` com base na diferença entre o horário atual e `session.startTime`.
- **Tela Principal de Execução e Página Individual do Exercício**:
  - Sincronização do cronômetro a cada segundo e em eventos de retorno do app (`visibilitychange` e `focus`) usando `startTime`.
  - Remoção do botão de pausa do cronômetro geral do treino para garantir que o tempo só pare ao clicar em **"Concluir e Finalizar"**.
  - Bloqueio de todos os handlers e controles de alteração enquanto `!session.isStarted`, mantendo totalmente livres a navegação entre exercícios, expansão/recolhimento de cards e consulta de informações.
