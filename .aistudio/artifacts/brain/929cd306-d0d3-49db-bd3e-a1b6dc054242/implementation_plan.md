# Plano de Implementação: Cabeçalho Compacto de Exercício na Aba Execução

Ajustar a estrutura visual e de interação no topo de cada exercício expandido na aba **Execução de Treino**, otimizando o espaço em telas móveis e proporcionando acesso rápido a mídia, descrição da execução, modo tela cheia e recolhimento através de botões somente-ícone com tooltips interativos acionados ao segurar por 1 segundo.

---

## 1. Diagnóstico do Estado Atual
No arquivo `components/WorkoutExecutionSection.tsx`:
- O cabeçalho do card do exercício combina título, tags e botões com rótulos de texto extensos (*"Ver Mídia / Ocultar Vídeo"*, *"Execução"*, *"Página Completa"*, *"Recolher"*).
- Em dispositivos móveis, essa sobrecarga de texto causa quebras de linha irregulares, botões comprimidos e rolagem vertical excessiva antes de chegar às séries do exercício.

---

## 2. Estrutura Proposta da Interface

### A. Linha 1: Nome Completo do Exercício (Ajustado ao Mobile)
- Exibição na horizontal sem truncamento forçado, com tipografia fluida e responsiva (`text-base sm:text-lg font-black tracking-tight`).
- Indicador numérico do exercício estilizado (`#1`, `#2`, etc.) alinhado ao nome com leitura confortável em telas pequenas.

### B. Linha 2: Informações Complementares (Entre o Nome e os Botões)
- Emblemas visuais organizados horizontalmente com rolagem suave se necessário:
  - Grupo Muscular (com tag sutil e ícone).
  - Método de Treino (quando houver, ex.: Bi-set, Drop-set, Pirâmide).
  - Intervalo de Descanso sugerido (ex.: `⏱ 60s`).

### C. Linha 3: Contagem de Séries Concluídas e Botões de Ação (Somente Ícones)
Disposição flexível e alinhada:
- **Lado esquerdo**: Contador visual compacto de séries prontas (ex.: `2 de 4 séries concluídas` ou `2/4 concluídas` com badge dinâmico que fica verde quando 100% completo).
- **Lado direito**: Grupo de botões estilizados contendo **exclusivamente ícones**:
  1. **Expandir/Ocultar Mídia**: Ícone `Film` / `Video` (mostra indicador visual se há animação/vídeo disponível).
  2. **Descrição da Execução**: Ícone `BookOpen` (abre o modal com passo a passo e postura).
  3. **Página Completa**: Ícone `Maximize2` (foca no exercício na visualização dedicada).
  4. **Recolher Card**: Ícone `ChevronUp` (contrai o card para navegação rápida na lista).

---

## 3. Mecanismo de Tooltip por Long-Press (1 Segundo)
- Criar um componente utilitário reutilizável para o botão com tooltip (`LongPressTooltipButton` ou hook integrado):
  - Ao iniciar o toque/clique (`onPointerDown`), inicia um temporizador de **1000ms (1 segundo)**.
  - Ao atingir 1000ms sem cancelamento, exibe um balão tooltip flutuante animado acima do botão com o texto explicativo (ex.: *"Expandir vídeo demonstrativo"*, *"Ver instruções passo a passo de execução"*, *"Abrir exercício em página inteira"*, *"Recolher detalhes deste exercício"*).
  - Ao soltar (`onPointerUp`), mover para fora (`onPointerLeave`) ou cancelar (`onPointerCancel`), o temporizador é limpo e o tooltip fecha imediatamente.
  - No desktop, também exibe o tooltip em hover padrão após pequeno delay para acessibilidade com mouse.

---

## 4. Arquivos Afetados
- `components/WorkoutExecutionSection.tsx`: Atualização do cabeçalho do card de exercício, integração do mecanismo de long-press e remodelagem do layout horizontal para mobile.
- Verificação de tipos e compilação com `compile_applet`.

---

## 5. Critérios de Sucesso
- [x] O nome do exercício é renderizado integralmente na horizontal e se ajusta à tela móvel sem quebras desordenadas.
- [x] As tags de grupo muscular, método e descanso ficam entre o nome e os controles de ação.
- [x] A linha inferior possui a contagem de séries concluídas e os 4 botões exclusivamente com ícones.
- [x] Ao segurar qualquer um dos 4 botões por 1 segundo, o tooltip descritivo aparece imediatamente e desaparece ao soltar.
- [x] O clique rápido (< 1s) continua acionando a respectiva ação normalmente sem atraso perceptível.
