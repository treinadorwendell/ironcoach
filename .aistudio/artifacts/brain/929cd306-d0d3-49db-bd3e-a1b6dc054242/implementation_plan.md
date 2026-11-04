# Plano de Implementação — Compatibilidade Mobile Automática para iPhone 11+ (Notch & Dynamic Island)

## 1. Visão Geral & Objetivos
Adaptar automaticamente o layout mobile do **IronCoach** para todas as gerações do iPhone a partir do **iPhone 11** (`375px` a `440px` de largura CSS), garantindo:
- **Separação dedicada abaixo da barra de status do iOS (Notch / Dynamic Island)**: O cabeçalho principal ficará posicionado imediatamente abaixo de uma faixa superior dedicada à área segura da barra de status (`44px–48px` para modelos com Notch e `54px–59px` para modelos com Dynamic Island), impedindo qualquer colisão visual com a câmera frontal, sensores ou relógio/indicadores do iOS.
- **Detecção automática em PWA, Safari e Preview Mobile**: Um motor reativo identificará automaticamente a geometria da tela e o perfil do dispositivo (`Notch` para iPhone 11/12/13/14 ou `Dynamic Island` para iPhone 14 Pro/15/16) tanto quando instalado na Tela de Início (PWA) quanto no navegador ou em janelas mobile de preview (`375px–440px`), sincronizando variáveis CSS (`--sat`, `--sab`, `--sal`, `--sar`) em tempo real.
- **Otimização completa de Cabeçalho, Barra Inferior, Modais e Tela de Treino**: Ajuste de alturas dinâmicas (`100dvh`), áreas de toque ergonômicas (`≥ 44px`), recuo inferior para a barra Home do iOS (`34px`) e densidade responsiva nos cards de execução de treino, cronômetro de descanso e janelas modais.

---

## 2. Perfis de Dispositivos Suportados Automaticamente

| Geração / Modelo | Largura × Altura CSS (pt) | Recorte Superior | Inset Topo (`--sat`) | Inset Base (`--sab`) |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone 11 Pro / 12 mini / 13 mini** | `375 × 812` | Notch | `44px` – `50px` | `34px` |
| **iPhone 11 / XR / 11 Pro Max** | `414 × 896` | Notch | `48px` / `44px` | `34px` |
| **iPhone 12 / 12 Pro / 13 / 13 Pro / 14** | `390 × 844` | Notch | `47px` | `34px` |
| **iPhone 12 Pro Max / 13 Pro Max / 14 Plus** | `428 × 926` | Notch | `47px` | `34px` |
| **iPhone 14 Pro / 15 / 15 Pro / 16** | `393 × 852` | Dynamic Island | `59px` | `34px` |
| **iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus** | `430 × 932` | Dynamic Island | `59px` | `34px` |
| **iPhone 16 Pro / 16 Pro Max** | `402 × 874` / `440 × 956` | Dynamic Island | `62px` | `34px` |

---

## 3. Arquitetura da Solução

### 3.1. Detecção Automática de Geometria iPhone (`hooks/useIPhoneSafeArea.ts`)
- Criar o hook e provedor leve que inspeciona:
  1. `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` nativos do WebKit/iOS.
  2. Dimensões de `window.screen` e `window.innerWidth` / `window.visualViewport` (`375px` a `440px`) para classificar automaticamente entre:
     - **Perfil Notch** (`375px`, `390px`, `414px`, `428px` em modo retrato): aplica `--sat: max(env(safe-area-inset-top, 0px), 47px)` e `--sab: max(env(safe-area-inset-bottom, 0px), 34px)`.
     - **Perfil Dynamic Island** (`393px`, `402px`, `430px`, `440px` em modo retrato): aplica `--sat: max(env(safe-area-inset-top, 0px), 59px)` e `--sab: max(env(safe-area-inset-bottom, 0px), 34px)`.
     - **Modo Paisagem (Landscape)**: ajusta recuos laterais (`--sal` / `--sar: 47px–59px`) e reduz o topo para `0px` mantendo a barra inferior segura (`21px`).
- Atualiza atributos `data-iphone-cutout="notch | dynamic-island | none"` no `<html>` em mudanças de orientação (`orientationchange`) e redimensionamento (`resize`).

### 3.2. Folha de Estilos Global e Variáveis Safe-Area (`app/globals.css` & `app/layout.tsx`)
- Configurar `min-h-[100dvh]` e `overscroll-behavior-y: none` para evitar saltos de barra de endereço no Safari iOS.
- Criar utilitários dedicados para a separação da barra de status do iOS:
  - `.ios-status-bar-spacer`: faixa fixa/sticky no topo com altura `var(--sat)` e fundo sólido (`bg-slate-950`) que isola a área do Notch / Dynamic Island.
  - `.sticky-below-status-bar`: posiciona o cabeçalho principal em `top: var(--sat)` logo abaixo da área de status do iOS.
  - `.modal-safe-container`: garante que todos os modais respeitem `padding-top: calc(var(--sat) + 0.75rem)` e `padding-bottom: calc(var(--sab) + 0.75rem)`.

### 3.3. Cabeçalho Separado Abaixo da Barra de Status (`components/Header.tsx`)
- Renderizar a faixa superior dedicada da barra de status (`height: var(--sat)`) com acabamento escuro integrado ao iOS, separada por uma linha sutil, mantendo o `<header>` principal logo abaixo.
- Ajustar dimensões para telas de `375px–430px`:
  - Compactar o seletor `"Treinador | Ver como Aluno"` e os botões laterais para nunca truncarem o nome do aluno ou a logo **IronCoach** em telas de `375px` (iPhone 11 Pro / 12 mini / 13 mini) e `390px`/`393px` (iPhone 12–16).
  - Garantir área mínima de toque de `44px` nos botões interativos do topo.

### 3.4. Barra de Navegação Inferior & Home Indicator (`components/BottomNav.tsx`)
- Ajustar a altura e o `padding-bottom` para `calc(var(--sab) + 0.375rem)`, isolando os botões de navegação (`Cliente`, `Agenda`, `Criar Treino`, `Execução` / `Meu Treino`, `Minha Dieta`, `Meu Progresso`) da barra Home do iOS (`34px`).
- Otimizar tipografia e espaçamento interno das abas para `375px–430px`, mantendo alvos de toque de `52px–56px` sem ultrapassar o orçamento de altura fixa da tela.

### 3.5. Tela de Execução de Treino, Cronômetro e Modais (`app/page.tsx`, `WorkoutExecutionSection.tsx`, `ExerciseDedicatedPageView.tsx`, `RestCountdownTimer.tsx`, Modais)
- **Container Principal (`app/page.tsx`)**: Ajustar o `padding-bottom` da `<main>` para `calc(5.25rem + var(--sab))` e posicionar notificações flutuantes (`syncNotice`) em `top: calc(var(--sat) + 4rem)` para nunca ficarem atrás da Dynamic Island.
- **Execução de Treino & Página Dedicada de Exercício (`WorkoutExecutionSection.tsx` & `ExerciseDedicatedPageView.tsx`)**:
  - Compactar paddings laterais e grades de inputs (Carga `kg`, Repetições, RIR/PSE) para encaixar perfeitamente em `375px–430px` sem rolagem horizontal.
  - Posicionar cabeçalhos fixos e barras de ação inferiores respeitando `--sat` e `--sab`.
- **Cronômetro de Descanso (`RestCountdownTimer.tsx`)**: Posicionar o banner flutuante acima do `BottomNav` levando em conta `var(--sab)`.
- **Modais e Tela de Login (`AuthScreen.tsx`, `StudentSettingsModal.tsx`, `TrainerProfileModal.tsx`, `PsePickerModal.tsx`, `DynamicSubstitutionModal.tsx`, `ExerciseInstructionsModal.tsx`)**:
  - Usar `max-h-[calc(100dvh-var(--sat)-var(--sab)-1.5rem)]` e recuos seguros para que botões de fechar (no topo) e botões de salvar/confirmar (no rodapé) fiquem 100% livres do Notch/Dynamic Island e da barra Home.

---

## 4. Verificação
1. Validar que todas as larguras de iPhone (`375px`, `390px`, `393px`, `402px`, `414px`, `428px`, `430px`, `440px`) recebem automaticamente o perfil de área segura correspondente (`Notch` vs `Dynamic Island`).
2. Confirmar que o cabeçalho fica posicionado abaixo da barra de status do iOS e a barra inferior respeita o Home Indicator (`34px`).
3. Executar `lint_applet` e `compile_applet` para assegurar zero erros de TypeScript ou build.
