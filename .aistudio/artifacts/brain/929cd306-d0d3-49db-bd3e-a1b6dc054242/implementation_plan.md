# Escala de PSE (0 a 10) na Execução de Treino e Gráficos de Evolução

Implementação de um seletor interativo de PSE (Percepção Subjetiva de Esforço de 0 a 10) posicionado entre as colunas "CARGA (KG)" e "CHECK" no registro de séries, acompanhado de modal/página dedicada com tabela de intensidade cromática explicativa, gravação automática no histórico ao "Concluir e Recolher" e exibição como métrica filtrável no gráfico de evolução do exercício.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas para revisão e aprovação antes do início da codificação:**

- **Localização do Botão**: O botão de PSE ficará em cada linha de série, exatamente entre o campo de `Carga (KG)` e o botão de `Check`, com coluna de cabeçalho correspondente.
- **Estado Visual do Botão**:
  - Quando não selecionado: exibe um ícone sutil de medidor de esforço/intensidade (`Gauge` ou `Activity`) com a sigla `PSE` em tom cinza escuro/borda sutil.
  - Quando selecionado: o ícone dá lugar ao número selecionado (`0` a `10`) colorido com a cor da faixa de intensidade e fundo translúcido condizente.
- **Página / Modal de Seleção de PSE**: Ao tocar no botão, abre-se uma tela/modal limpa e responsiva (estilo bottom-sheet / modal touch-friendly) com:
  - Seletor numérico de 0 a 10 organizado em botões táteis largos (touch targets $\ge 44\text{px}$).
  - Código cromático de intensidade padronizado (Escala de Borg / Foster CR10 adaptada):
    - **0**: Repouso total (Cinza/Neutro - sem esforço)
    - **1 - 2**: Muito Leve / Leve (Verde Esmeralda - respiração normal, aquecimento)
    - **3 - 4**: Moderado (Ciano / Azul Claro - esforço perceptível, ritmo confortável)
    - **5 - 6**: Pesado (Amarelo / Âmbar - exige foco e respiração acelerada)
    - **7 - 8**: Muito Pesado (Laranja Intenso - próximo da falha, 1-2 reps de reserva)
    - **9**: Quase Máximo (Vermelho - esforço extremo, limite da técnica)
    - **10**: Máximo Absoluto (Roxo / Vermelho Escuro - falha muscular momentânea, 0 reps de reserva)
  - Explicação descritiva direta para cada nível ou faixa, ajudando o atleta/aluno a calibrar a percepção.
  - Botão de limpar/redefinir PSE e botão de confirmação.
- **Persistência**: O valor de PSE de cada série é mantido no estado da sessão ativa (`ExecutionSet.pse`) e gravado no histórico quando o usuário toca em "Concluir e Recolher" (`storage.recordExerciseFinishedOnCollapse`) e ao finalizar o treino completo.
- **Visualização no Gráfico**: Na tela de histórico da série (`SeriesHistoryModal` e `ExerciseHistoryChart`), um novo filtro de botão `PSE (0-10)` será adicionado ao lado de `Carga`, `Repetições` e `Volume`, exibindo a linha de evolução do esforço percebido ao longo dos treinos.

---

### 1. Overview & Core Concept

- **O que faz**: Permite que o praticante ou treinador registre o grau de esforço subjetivo (PSE de 0 a 10) de forma rápida e visual durante o treino. Ao clicar no gatilho na linha da série, o usuário acessa uma interface táctil com escala de cores e legendas fisiológicas objetivas. O valor selecionado substitui o ícone pelo número colorido e alimenta a base de dados histórica para análise de sobrecarga progressiva e fadiga.
- **Público-alvo**: Praticantes de musculação, atletas de força e personal trainers que utilizam a escala RPE/PSE para autorregulação de carga e monitoramento de fadiga.
- **Valor agregado**: Remove a subjetividade vaga do treino sem poluir a tela inicial, permitindo correlação direta entre carga levantada (kg), repetições executadas e esforço real sentido.

---

### 2. User Experience & Visual Design

#### Fluxo do Usuário
1. **Visualização na Série**: O usuário visualiza a linha da série com `Série`, `Reps`, `Carga (KG)`, `PSE` (botão neutro com ícone) e `Check`.
2. **Abertura do Seletor**: O usuário toca no botão de PSE da série desejada. Uma janela modal táctil desliza suavemente sobre a tela com o título "Percepção de Esforço (PSE)" e a identificação do exercício e série.
3. **Seleção e Compreensão**: O usuário visualiza os níveis de 0 a 10 dispostos com suas respectivas cores de intensidade e descrições claras (ex: "7 - Muito Pesado: Faltam ~2 reps para a falha"). Ao tocar em um número, há feedback tátil/visual imediato.
4. **Fechamento e Atualização**: Ao confirmar ou selecionar, o modal fecha e o botão na linha agora exibe o número (ex: `8` com contorno laranja vibrante).
5. **Finalização do Exercício**: Ao clicar em "Concluir e Recolher", os dados das séries incluindo o PSE são arquivados no histórico.
6. **Consulta ao Gráfico**: Ao abrir o histórico da série ou do exercício, o usuário ativa o botão de filtro `PSE` para ver a linha do esforço ao longo das datas.

#### Identidade Visual & Design Tokens
- **Paleta de Intensidade (Dark Mode)**:
  - Nível 0: `bg-slate-800 text-slate-300 border-slate-700` (Repouso)
  - Níveis 1–2: `bg-emerald-950/70 text-emerald-400 border-emerald-500/50` (Leve)
  - Níveis 3–4: `bg-cyan-950/70 text-cyan-400 border-cyan-500/50` (Moderado)
  - Níveis 5–6: `bg-amber-950/70 text-amber-400 border-amber-500/50` (Pesado)
  - Níveis 7–8: `bg-orange-950/70 text-orange-400 border-orange-500/50` (Muito Pesado)
  - Nível 9: `bg-rose-950/70 text-rose-400 border-rose-500/50` (Extremo)
  - Nível 10: `bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]` (Falha)
- **Ergonomia Táctil**: Botões de seleção com altura mínima de 44px e área de toque expandida, respeitando o padrão mobile-first do PWA.
- **Gráfico**: Linha de PSE com cor violeta/âmbar de destaque, eixo Y configurado de 0 a 10 e tooltip customizado com a respectiva legenda de esforço.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Registro de PSE por Série individual vs. Exercício geral**
  - *Abordagem Escolhida*: Registro por série diretamente na linha de execução (com cálculo automático da média do exercício para o histórico consolidado).
  - *Motivo*: Permite que o praticante registre com precisão quando uma série de aquecimento foi PSE 3 e a última série de trabalho atingiu PSE 9 ou 10, que é a prática padrão de treinamento resistido (RPE/RIR).
  - *Alternativa descartada*: Nota única genérica por exercício, que ocultaria a diferença de intensidade entre as séries de trabalho.

- **Decisão 2: Modal dedicado vs. Dropdown/Select inline**
  - *Abordagem Escolhida*: Modal dedicado responsivo com explicação de cada cor e nível de esforço.
  - *Motivo*: Conforme solicitado pelo usuário ("ao clicar abre uma página com campo numérico de 0 a 10 com cores de intensidade, uma breve explicação de cada cor"). Um dropdown nativo é visualmente pobre e não comporta as explicações ergonômicas de intensidade.

- **Decisão 3: Gráficos de Evolução Multimétricos**
  - *Abordagem Escolhida*: Filtro independente no gráfico de histórico de séries (`ExerciseHistoryChart`), permitindo ligar e desligar a linha de PSE individualmente ou em conjunto com Carga (kg), Repetições e Volume.
  - *Motivo*: Evita poluição visual no gráfico para quem deseja focar apenas na carga em kg, enquanto oferece visualização completa da sobrecarga progressiva para quem analisa PSE.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WorkoutExecutionSection                         │
│                                                                        │
│  [ Header ]: Série │ Reps │ Carga (KG) │ PSE (0-10) │ Check            │
│  [ Row 1 ]:  #1    │ 10   │ 80 kg      │ [ Ícone ]  │ [ ✓ ]            │
│                                              │                         │
│                                              ▼ (Clique)                │
│                                    ┌──────────────────┐                │
│                                    │  PsePickerModal  │                │
│                                    │ 0..10 + Legenda  │                │
│                                    └─────────┬────────┘                │
│                                              │ (Seleciona)             │
│                                              ▼                         │
│  [ Row 1 ]:  #1    │ 10   │ 80 kg      │ [ 8 (Laranja) ] │ [ ✓ ]       │
└──────────────────────────────────────────────┬─────────────────────────┘
                                               │
                                               ▼ "Concluir e Recolher"
┌────────────────────────────────────────────────────────────────────────┐
│                              lib/storage.ts                            │
│  • recordExerciseFinishedOnCollapse (inclui pse em cada setSnapshot)  │
│  • getSeriesHistory (retorna { weightKg, reps, volumeKg, pse })       │
│  • completedWorkouts (persiste CompletedSetRecord.pse no Firestore/LS) │
└──────────────────────────────────────────────┬─────────────────────────┘
                                               │
                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  SeriesHistoryModal / ExerciseHistoryChart             │
│  • Filtros: [ Carga (kg) ] [ Repetições ] [ Volume (kg) ] [ PSE (0-10) ]│
│  • Recharts Line: Eixo Y dedicado de 0 a 10 com cor de intensidade    │
└────────────────────────────────────────────────────────────────────────┘
```

#### Entidades e Tipos Modificados
- `ExecutionSet`: adição da propriedade opcional `pse?: number | null;`
- `CompletedSetRecord`: adição de `pse?: number | null;`
- `SeriesHistoryItem`: adição de `pse?: number | null;`

#### Mapeamento de Componentes
1. **`components/PsePickerModal.tsx`**: Componente isolado para exibição da régua de esforço de 0 a 10 com botões táteis, indicador de cor, badge descritivo ("Leve", "Moderado", "Pesado", "Falha") e botão de confirmação.
2. **`components/WorkoutExecutionSection.tsx`**: Ajuste das larguras do grid de séries (distribuição equilibrada para acomodar o botão de PSE), renderização do botão com troca dinâmica de ícone para número colorido e disparo do modal.
3. **`lib/storage.ts`**: Salvamento do campo `pse` nos snapshots e histórico de séries.
4. **`components/ExerciseHistoryChart.tsx`**: Inclusão do toggle `PSE` e da linha correspondente no Recharts.
