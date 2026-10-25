# Central de Configuração do Sistema do Treinador

Transformação do acesso ao Perfil do Treinador em uma **Central de Configuração do Sistema** completa, reunindo **Editar Perfil** (Nome, Senha, Logo e Sair da conta) e **Configurações de Treino** (**Criar Exercício no Banco**, **Editar Exercício do Banco** com suporte a vídeo de até 30s, Link ou GIF, e **Criar Método Avançado** com subséries personalizadas).

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas para a arquitetura e experiência de uso da Central de Configuração:

- **Navegação Responsiva Adaptativa**:
  - **Desktop**: Modal amplo com abas superiores para alternar rapidamente entre **Editar Perfil** e **Configurações de Treino** (com sub-abas para *Criar Exercício*, *Editar Exercício do Banco* e *Método Avançado*).
  - **Tablet & Mobile**: Menu inicial com cards grandes e táteis para escolher entre **Editar Perfil** e **Configurações de Treino**, com navegação interna fluida e botão de retorno.
- **Comportamento dos Métodos Avançados com Subséries**: Ao criar um Método Avançado habilitando subséries, o treinador define a quantidade padrão de subséries e os textos pré-preenchidos para **Zona de Repetição** e **Descrição/Método**, que são aplicados automaticamente ao selecionar o método na prescrição.
- **Reprodução de Vídeos (até 30s), Links e GIFs**: Os vídeos, links e GIFs cadastrados nos exercícios abrem em uma **janela modal separada e dedicada** sempre que o usuário clicar no botão de visualizar vídeo/mídia durante a criação ou execução do treino.

---

## 1. Overview & Core Concept

- **O Que Faz**: Centraliza toda a personalização da conta do treinador e da metodologia de prescrição em um único painel acessível pelo cabeçalho superior ou pelo card do treinador na aba de clientes.
- **Público-Alvo / Contexto**: Personal trainers e consultores esportivos que precisam cadastrar novos exercícios com vídeos demonstrativos curtos (até 30s) ou GIFs/links, atualizar mídias de exercícios existentes do catálogo e criar seus próprios métodos avançados de intensidade com subséries padronizadas.
- **Valor Principal**: Elimina limitações de catálogo fixo, permitindo que o treinador personalize 100% dos exercícios, vídeos demonstrativos e métodos avançados utilizados no dia a dia.

---

## 2. User Experience & Visual Design

- **Fluxos de Uso**:
  1. **Acesso à Central**: Ao clicar na identificação do treinador (topo ou aba Clientes), abre-se a Central de Configuração do Sistema (ou vai direto para a etapa de boas-vindas no primeiro acesso).
  2. **Editar Perfil**:
     - Permite alterar **Nome do Treinador**, **Nova Senha**, **Mudar Logo** (com enquadramento interativo 1:1) e **Sair da Conta (Logout)**.
  3. **Configurações de Treino → Banco de Exercícios (Criar Exercício)**:
     - Campos para Nome do Exercício, Grupo Muscular principal, Músculo Primário, Músculo Secundário e Equipamento.
     - Seletor de Mídia:
       - **Upload de Vídeo (até 30 segundos)**: Valida automaticamente a duração do arquivo de vídeo selecionado ($\le 30\text{s}$) usando metadados HTML5 e gera pré-visualização imediata.
       - **Link de Vídeo ou GIF**: Campo para colar URL de vídeo (MP4, WebM, YouTube/embed) ou link/upload de GIF animado.
  4. **Configurações de Treino → Editar Exercício do Banco de Exercícios**:
     - Barra de busca e filtro por grupo muscular listando todos os exercícios do banco (nativos e personalizados).
     - Ao selecionar qualquer exercício, permite editar seus dados anatômicos/equipamento e anexar ou substituir a mídia (**carregar vídeo de até 30 segundos** ou **colocar vídeo com Link ou GIF**), salvando as customizações de forma persistente.
  5. **Configurações de Treino → Método Avançado (Criar Método Avançado)**:
     - Formulário para informar o **Nome do Método**.
     - Chave seletora **"Habilitar Subséries"**: quando ativada, exibe a configuração das subséries padrão do método com os campos de escrita para **Zona de Repetição** (ex: `"Até a falha"`, `"4-6 reps"`) e **Método / Observação da Subsérie** (ex: `"Drop -20% sem descanso"`, `"Pausa 15s"`).
     - Lista dos métodos avançados personalizados criados, permitindo editar ou excluir cada método.
  6. **Visualização em Janela Separada**:
     - Nos cards de exercício em **Criar Treino** e **Execução do Treino**, o botão de mídia abre uma janela modal dedicada para reproduzir o vídeo de até 30s, link, GIF ou demonstração visual do exercício.

- **Identidade Visual & Tema**:
  - *Direção Estética*: Dark Slate esportivo de alta precisão (`slate-950` / `slate-900`) com acentos semânticos em `emerald-400` (perfil e criação), `cyan-400` (banco de exercícios e mídia) e `purple-400` / `amber-400` (métodos avançados e subséries).
  - *Ergonomia e Layout*: Cards de seleção amplos no mobile/tablet ($\ge 48\text{px}$ de área de toque) e navegação em abas horizontais no desktop.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Validação Client-Side de Vídeo de até 30 Segundos**
  - *Abordagem Escolhida*: Validar a duração exata do vídeo via elemento `<video preload="metadata">` no momento da seleção do arquivo, rejeitando vídeos acima de 30 segundos com mensagem clara e armazenando vídeos válidos para reprodução instantânea.
  - *Por Quê*: Garante cumprimento estrito do limite de 30 segundos sem travar a interface e permite pré-visualização imediata pelo treinador.
- **Decisão 2: Sobrescrita Não-Destrutiva ao Editar Exercícios Nativos do Banco**
  - *Abordagem Escolhida*: Quando o treinador edita um exercício original do catálogo (por exemplo, adicionando um vídeo de 30s ou GIF), a customização é salva com o mesmo identificador do exercício e mesclada prioritariamente sobre o catálogo base.
  - *Por Quê*: Preserva todos os exercícios nativos e garante que qualquer treino já criado com aquele exercício passe a exibir automaticamente o novo vídeo ou GIF configurado pelo treinador.
- **Decisão 3: Janela Modal Dedicada para Reprodução de Vídeo / GIF**
  - *Abordagem Escolhida*: Criar um modal dedicado de reprodução de mídia acionado pelo botão de ver vídeo/mídia tanto na prescrição quanto na execução.
  - *Por Quê*: Mantém os cards de série compactos e oferece uma visualização limpa e ampliada do vídeo de até 30s, link ou GIF.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitetura e Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Cabeçalho Superior / Aba Clientes (Acesso ao Perfil do Treinador)        │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Central de Configuração do Sistema (TrainerProfileModal)                 │
│  ├── [Desktop: Abas no Topo] / [Mobile & Tablet: Menu de Cards Grandes]  │
│  │                                                                       │
│  ├── 1. Editar Perfil                                                    │
│  │      └── Nome, Nova Senha, Mudar Logo (Crop 1:1), Sair da Conta       │
│  │                                                                       │
│  └── 2. Configurações de Treino                                          │
│         ├── A. Criar Exercício no Banco                                  │
│         │      └── Nome, Músculo Primário/Secundário, Equipamento,       │
│         │          Vídeo <= 30s (Upload) ou Link / GIF                   │
│         ├── B. Editar Exercício do Banco                                 │
│         │      └── Busca no catálogo + Upload Vídeo <= 30s / Link / GIF  │
│         └── C. Método Avançado                                           │
│                └── Nome do Método + Toggle Habilitar Subséries           │
│                    (Escritas de Zona de Repetição e Método/Descrição)    │
└───────────────┬──────────────────────────────────────────┬───────────────┘
                ▼                                          ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────┐
│ Persistência Local & Sincronização    │  │ Criar Treino & Execução       │
│  ├── Catálogo Mesclado de Exercícios  │  │  ├── Seletor de Métodos       │
│  │   (Criados + Editados c/ Mídia)    │─►│  │   (Nativos + Criados)      │
│  └── Métodos Avançados Personalizados │  │  ├── Geração Automática de    │
│      (com Template de Subséries)      │  │  │   Subséries Personalizadas │
└───────────────────────────────────────┘  │  └── Botão "Ver Vídeo/Mídia"  │
                                           │      ──► Abre Modal Separado  │
                                           └───────────────────────────────┘
```

### Modelo de Dados e Estado
- **Exercícios do Banco (`DatabaseExercise`)**:
  - Suporte aos campos opcionais `videoUrl` (DataURL de vídeo de até 30s ou link externo MP4/WebM/YouTube), `gifUrl` (URL ou DataURL de GIF) e `mediaType` (`'video_upload' | 'video_link' | 'gif' | 'images'`).
  - Edições feitas em exercícios existentes do catálogo são salvas no armazenamento local e sincronizadas com a nuvem, sobrepondo os metadados originais do exercício.
- **Métodos Avançados Personalizados (`CustomWorkoutMethod`)**:
  - Estrutura contendo `id`, `name`, `hasSubSets` (booleano), `defaultSubSetsCount` (número de subséries geradas automaticamente), `subSetRepZone` (escrita padrão na Zona de Repetição da subsérie) e `subSetMethodNote` (escrita padrão de método/instrução da subsérie).
  - Integrado dinamicamente à lista de métodos disponíveis em toda a prescrição e execução de treinos.
