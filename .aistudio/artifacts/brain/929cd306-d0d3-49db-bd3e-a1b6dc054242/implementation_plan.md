# Compatibilidade iPhone 11+ (Notch, Dynamic Island e Home Bar)

Compatibilização ergonômica completa do IronCoach PWA para todos os modelos de iPhone da geração 11 em diante (iPhone 11, 12, 13, 14, 15 e 16), com suporte nativo a áreas seguras (`safe-area-inset`), preenchimento superior contínuo e simulador visual de Entalhe e Ilha Dinâmica.

## Decisões Confirmadas pelo Usuário

> [!IMPORTANT]
> As seguintes decisões foram confirmadas na fase de alinhamento interativo e guiam a arquitetura desta implementação:

- **Cabeçalho Superior e Entalhe/Dynamic Island**: Adaptação automática com preenchimento seguro dinâmico (`env(safe-area-inset-top)`) e fundo escuro contínuo (`bg-slate-950/95`), garantindo que o status bar e os recortes físicos do topo nunca sobreponham botões, perfis ou títulos.
- **Barra de Navegação Inferior e Home Bar (Gesto de Início)**: Aplicação de `env(safe-area-inset-bottom)` na base da barra inferior (`pb-safe`) e aumento compensatório da folga de rolagem (`pb-28` a `pb-36`) no container principal (`<main>`), evitando toques acidentais na linha do sistema iOS.
- **Simulador Visual no Modo Teste**: Inclusão de seletor rápido no topo permitindo alternar entre modo nativo, iPhone Notch (11/12/13/14), iPhone Dynamic Island (14 Pro/15/16) e Tablet vertical, possibilitando teste visual instantâneo em qualquer navegador desktop ou mobile.

---

## 1. Visão Geral & Ergonomia Mobile (iOS)

A partir do iPhone 11, todos os modelos da Apple utilizam telas sem bordas com cantos arredondados e recortes físicos no topo:
1. **Entalhe Tradicional (Notch)**: iPhone 11, 11 Pro/Max, 12, 13, 14 e 14 Plus (~$44\text{px}$ a $47\text{px}$ no topo).
2. **Ilha Dinâmica (Dynamic Island)**: iPhone 14 Pro/Max, linha iPhone 15 e linha iPhone 16 (~$54\text{px}$ no topo, em formato de pílula central flutuante).
3. **Indicador de Início (Home Indicator Bar)**: Faixa de gesto na parte inferior de todos os modelos (~$34\text{px}$ na base).

No modo PWA (`apple-mobile-web-app-capable: yes` com `viewport-fit=cover`), o navegador renderiza o conteúdo sob o vidro completo. O IronCoach precisa garantir que nenhum controle tocável fique posicionado sob esses recortes e que a barra de abas inferior tenha área de descanso ergonômica para o polegar.

```
+-------------------------------------------------------+
|  ••• 9:41             ( DYNAMIC ISLAND )          [=] | <- pt-safe / env(safe-area-inset-top)
+-------------------------------------------------------+
|  [Logo] IronCoach       [Treinador v]       [Instalar] | <- Header protegido contra sobreposição
+-------------------------------------------------------+
|                                                       |
|  [ CONTEUDO DO TREINO / LISTA / EXERCICIOS ]          | <- Área de rolagem com folga inferior
|                                                       |
+-------------------------------------------------------+
|  [ Cliente ]   [ Agenda ]   [ Criar ]   [ Execução ]  | <- Barra de abas elevada
+-------------------------------------------------------+
|                  ────── (Home Bar) ──────             | <- pb-safe / env(safe-area-inset-bottom)
+-------------------------------------------------------+
```

---

## 2. Experiência do Usuário & Design Visual

### A. Cabeçalho Dinâmico com Fundo Contínuo
- O cabeçalho (`Header.tsx`) receberá classes de utilitário `pt-safe` para preenchimento vertical automático respeitando a safe area.
- O fundo escuro (`bg-slate-950/95`) se estende até o topo absoluto da tela, criando uma transição visual contínua com a barra de status do iOS (configurada com `statusBarStyle: 'black-translucent'`).
- Os botões de alternância de perfil, seleção de aluno e botão PWA se manterão alinhados horizontalmente com altura mínima de toque de $44\text{px}$.

### B. Barra Inferior com Safe Area e Thumb Ergonomics
- A `BottomNav.tsx` receberá `pb-safe` com padding base seguro, elevando os ícones e rótulos cerca de $24\text{px}$–$34\text{px}$ acima da barra de gestos do iOS.
- O fundo com efeito de vidro fosco (`backdrop-blur-xl bg-slate-950/95`) continuará até a borda inferior absoluta da tela, garantindo estética nativa.
- O container principal `<main>` terá compensação de rolagem (`pb-32 sm:pb-36`) para que botões de ação final (como "Concluir Série" ou "Finalizar Treino") nunca fiquem escondidos atrás da barra inferior.

### C. Seletor de Simulação Interativo (Notch, Dynamic Island & Tablet)
- Na barra de controle do topo, o botão de alternância de moldura será aprimorado com um menu seletor rápido:
  1. **Nativo / Tela Cheia** (para uso direto no iPhone real).
  2. **Simular iPhone Notch** (proporção 19.5:9, recorte do entalhe com câmera e sensor no topo, simulação de safe area).
  3. **Simular iPhone Dynamic Island** (proporção 19.5:9, pílula preta com lente de câmera frontal e sensor TrueDepth, simulação de safe area expandida).
  4. **Simular Tablet Vertical** (proporção iPad 3:4 com moldura para sala de musculação).

### D. Modais e Telas Cheias (Overlay)
- A tela dedicada de execução de exercício (`ExerciseDedicatedPageView.tsx`) e modais de tela cheia (`PsePickerModal.tsx`, `DynamicSubstitutionModal.tsx`, etc.) receberão proteções `pt-safe` e `pb-safe`, impedindo que botões de fechar/voltar colidam com o recorte da câmera.

---

## 3. Decisões Técnicas & Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    Root Layout & Viewport                     │
│    viewport-fit=cover  |  appleWebApp.statusBarStyle='black' │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
  ┌───────────────────────────┐ ┌───────────────────────────┐
  │   CSS Safe-Area Helpers   │ │  Device Simulator Engine  │
  │  pt-safe: env(safe-top)   │ │  - none                   │
  │  pb-safe: env(safe-bot)   │ │  - iphone-notch           │
  │  pl-safe: env(safe-left)  │ │  - iphone-dynamic-island  │
  │  pr-safe: env(safe-right) │ │  - tablet-portrait        │
  └─────────────┬─────────────┘ └─────────────┬─────────────┘
                │                             │
                ▼                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │                   App Components Tree                   │
  │  - Header (pt-safe + Device Selector)                   │
  │  - Main Container (pb-safe + scroll clearance)          │
  │  - BottomNav (pb-safe + touch hitboxes)                 │
  │  - Modais & Overlays (pt-safe + pb-safe)                │
  └─────────────────────────────────────────────────────────┘
```

### Decisão 1: Abordagem Híbrida (CSS Nativo + Variáveis de Simulação)
- *Abordagem*: Utilizaremos `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` com fallbacks baseados em variáveis CSS (`--safe-top`, `--safe-bottom`). Em dispositivos reais, o navegador injeta os valores do hardware. No simulador desktop, as variáveis assumem os valores precisos do iPhone 11–14 (Notch: $44\text{px}$) ou iPhone 14 Pro–16 (Dynamic Island: $54\text{px}$).
- *Vantagem*: Permite validar e demonstrar o funcionamento diretamente na interface web sem exigir um iPhone físico conectado.

### Decisão 2: Prevenção de Zoom Involuntário em Formulários iOS
- No Safari iOS, campos de texto (`<input>`, `<select>`) com tamanho de fonte menor que $16\text{px}$ disparam um zoom automático que quebra o layout. Adicionaremos regra de segurança garantindo `text-base sm:text-sm` em inputs focados e `touch-action: manipulation` para evitar duplo toque acidental.

---

## 4. Etapas de Execução

1. **Definição de Classes de Safe Area no CSS Global (`app/globals.css`)**:
   - Criação de utilitários `@layer utilities` para `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` e `h-screen-safe`.
   - Regras de scroll suave iOS (`-webkit-overflow-scrolling: touch`) e controle de zoom de formulários.
2. **Atualização do Cabeçalho (`components/Header.tsx`)**:
   - Aplicação de `pt-safe` no container principal.
   - Integração do seletor visual de dispositivos (Nativo / iPhone Notch / iPhone Dynamic Island / Tablet).
3. **Atualização da Barra Inferior (`components/BottomNav.tsx`)**:
   - Aplicação de `pb-safe` para separação da Home Bar.
   - Ajuste dos botões de toque com tamanho mínimo de $44\text{px}$.
4. **Atualização do Container Principal e Simulador de Dispositivo (`app/page.tsx`)**:
   - Renderização dos mockups realistas de Entalhe e Dynamic Island quando o modo de teste estiver ativo.
   - Ajuste do padding inferior de `<main>` para acomodar a barra inferior mais a safe area.
5. **Ajustes nos Modais de Tela Cheia e Execução de Treino**:
   - Garantir que a visualização de execução do exercício e os modais flutuantes usem `pt-safe` e `pb-safe`.
6. **Verificação de Compilação & Lint**:
   - Execução de `lint_applet` e `compile_applet` para assegurar integridade completa do código.
