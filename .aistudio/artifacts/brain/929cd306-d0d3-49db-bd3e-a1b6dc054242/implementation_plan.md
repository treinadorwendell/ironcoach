# Atualização e Correlação Inteligente do Banco de Medidas Caseiras (POF/IBGE + TACO)

Este plano detalha a atualização do banco de medidas caseiras POF/IBGE e a construção de um motor de correlação semântica multi-token e por modo de preparo entre o arquivo oficial de medidas caseiras da POF e a base nutricional do aplicativo, permitindo prescrições com medidas de referência precisas, detalhes de fonte/preparo e expansão do catálogo com alimentos e preparações da POF.

## Revisão do Usuário & Decisões Confirmadas

> [!IMPORTANT]
> As diretrizes abaixo consolidam as escolhas confirmadas para a correlação e exibição das medidas caseiras POF/IBGE no sistema.

- **Decisão Confirmada 1 — Correlação de Modo de Preparo (TACO ↔ POF)**: **Priorizar medidas do mesmo preparo e exibir demais como apoio**. Quando um alimento selecionado possuir preparo específico (ex.: *cru*, *cozido*, *grelhado/brasa*, *assado*, *frito*, *refogado* ou *ensopado*), as medidas caseiras da POF correspondentes àquele preparo aparecem no topo da lista (destacando também a `descricao_medida_referencia` oficial da POF), seguidas pelas medidas gerais (`NAO SE APLICA`) e de apoio.
- **Decisão Confirmada 2 — Alimentos e Preparações Exclusivos da POF**: **Cadastrar também como alimentos selecionáveis no banco nutricional**. Itens e preparações presentes no arquivo da POF que não estão isolados na tabela TACO (ex.: *Tapioca de goma*, *Cuscuz*, *Granola*, *Aveia em flocos/farinha*, *Proteína de soja*, *Açaí / Açaí com granola*, *Pão de queijo*, *Pão integral*, *Peito de peru light*, *Ricota light*, *Omelete*, *Baião de dois*, *Feijão tropeiro*, *Strogonoff*, *Panqueca*, *Caldo verde*, entre outros) passam a integrar o banco nutricional selecionável com todas as suas medidas caseiras POF nativas.
- **Decisão Confirmada 3 — Formato de Exibição das Medidas Caseiras**: **Nome da medida com detalhe da fonte, preparo e gramas**. Nos seletores de prescrição, no modal de substituição dinâmica e no Painel do Profissional, cada unidade exibe o nome da medida, o preparo (quando aplicável), o detalhamento oficial da fonte (`descricao_fonte`) e o peso exato em gramas — sinalizando qual é a medida de referência padrão da POF (`★ Referência POF`).

---

## 1. Visão Geral & Conceito Central

- **O Que Faz**: Substitui o pareamento simples por primeira palavra por um motor de indexação e correlação semântica completa sobre as **11.800+ linhas** da tabela POF/IBGE (`codigo_alimento`, `descricao_alimento`, `codigo_preparacao`, `descricao_preparacao`, `codigo_medida`, `descricao_medida`, `codigo_medida_referencia`, `descricao_medida_referencia`, `quantidade_g`, `codigo_fonte`, `descricao_fonte`), conectando cada alimento TACO ao código POF exato e incorporando os alimentos exclusivos da POF ao catálogo de prescrição.
- **Público-Alvo / Persona**: Personal trainers e nutricionistas esportivos que utilizam o **IronCoach** para prescrever dietas práticas com medidas caseiras reais do dia a dia brasileiro (colher de arroz, escumadeira, concha, fatia, gomo, unidade média/pequena, copo americano, xícara, etc.) sem erros de conversão em gramas.
- **Valor Principal**: Elimina colisões entre alimentos de mesmo prefixo (como *Batata doce* vs. *Batata inglesa*, *Arroz integral* vs. *Arroz polido*, ou cortes bovinos/suínos que na TACO iniciam por *"Carne, bovina, patinho..."* e na POF estão indexados como *"PATINHO"*), garantindo gramaturas fiéis ao preparo e transparência total sobre a fonte da medida.

---

## 2. Experiência do Usuário & Design Visual

- **Fluxos Principais do Usuário**:
  1. **Seleção de Alimento na Montagem de Dieta**: Ao buscar um item (TACO ou POF nativo), o sistema pré-seleciona automaticamente a **Medida de Referência POF** (`codigo_medida === codigo_medida_referencia`, ex.: *Colher de arroz/servir* para arroz cozido, *Concha* para feijão, *Unidade* para ovo/banana, *Fatia* para queijos/pães).
  2. **Seletor de Unidades Enriquecido**: O dropdown e o resumo da medida exibem o rótulo completo com preparo, gramatura e descrição da fonte (ex.: `★ Colher de arroz/servir · Cozido(a) — 63g (Arroz integral cozido - colher de arroz cheia)`), separando visualmente medidas do mesmo preparo, medidas complementares e unidades universais (`g`, `kg`, `ml`, `L`).
  3. **Auditoria e Gestão no Painel do Profissional**: Na aba **Porções & Medidas Caseiras** do Painel do Profissional, além de criar porções personalizadas, o treinador conta com um explorador de correlação POF ↔ Alimento que permite consultar todos os códigos POF vinculados, filtrar por preparo e criar variações personalizadas a partir de qualquer medida oficial da POF.
- **Identidade Visual & Tema**:
  - *Direção Estética*: Utilitária de alta precisão (*Dark Slate Precision*), alinhada ao ecossistema IronCoach.
  - *Paleta de Cores*: Superfícies em `slate-950` (`#020617`) e `slate-900` (`#0f172a`), bordas estruturais sutis de `1px` em `slate-800` (`#1e293b`), destaques semânticos em `emerald-400` (`#34d399`) para medidas de referência e mesmo preparo, `cyan-400` (`#22d3ee`) para proteínas e `amber-400` (`#fbbf24`) para carboidratos.
  - *Tipografia & Hierarquia*: Todos os pesos em gramas, códigos de alimento/medida e cálculos nutricionais utilizam rigorosamente algarismos tabulares (`tabular-nums`) para alinhamento vertical imediato, sem poluição visual.
- **Feedback Interativo**: Ao trocar a medida caseira na prescrição ou no modal de substituição, um indicador textual limpo logo abaixo do seletor exibe a descrição oficial da fonte POF (`descricao_fonte`), o código do alimento POF correlacionado e a conversão instantânea em gramas e macronutrientes.

---

## 3. Decisões de Produto & Trade-Offs

- **Decisão 1: Algoritmo de Correlação Multi-Token + Dicionário de Sinônimos Nutricionais**
  - *Abordagem Escolhida*: Normalizar descrições removendo stop-words genéricas (*"carne"*, *"bovina"*, *"suína"*, *"de"*, *"com"*, *"sem"*, *"gordura"*) durante o cálculo de similaridade e aplicar mapa de equivalência semântica direta (ex.: `aipim`/`macaxeira`/`mandioca`, `mandioquinha`/`batata baroa`, `contra-filé`/`contrafile`, `muçarela`/`mussarela`/`muzarella`, `pão francês`/`pão de sal`, cortes de carnes e aves) combinado com pontuação extra quando o preparo da TACO coincide com `descricao_preparacao` da POF.
  - *Por Quê*: Na tabela TACO, os nomes seguem a taxonomia invertida (`"Carne, bovina, contra-filé, sem gordura, grelhado"`), enquanto na POF o item é nomeado diretamente pelo corte (`"CONTRAFILE"`, código `7100201`, preparo `"GRELHADO(A)/BRASA/CHURRASCO"`). O pareamento por primeira palavra falhava nesses casos; o pareamento semântico multi-token garante precisão cirúrgica.
- **Decisão 2: Incorporação de Alimentos Exclusivos da POF ao Catálogo Ativo**
  - *Abordagem Escolhida*: Agrupar os códigos `codigo_alimento` da POF que não possuem duplicata direta na TACO e registrá-los como itens selecionáveis no banco nutricional, estimando sua composição nutricional por 100g a partir da matriz nutricional correspondente da própria família alimentar na TACO/IBGE.
  - *Por Quê*: Permite que o treinador prescreva diretamente itens muito frequentes na rotina brasileira (como *Tapioca de goma*, *Cuscuz*, *Granola*, *Açaí com granola*, *Pão de queijo*, *Omelete*, *Baião de dois*, *Feijão tropeiro*, *Peito de peru light*, etc.) usando todas as medidas caseiras oficiais do CSV enviado.

---

## 4. Arquitetura Técnica & Estratégia de Dados

### Diagrama de Arquitetura e Fluxo de Correlação

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  FONTES DE DADOS OFICIAIS (/public/assets)                 │
│  ┌──────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ tabela_alimentos_9df259cc.json   │  │ pof_medidas_caseiras_...csv    │  │
│  │ (597 Alimentos TACO - 100g/ml)   │  │ (11.802 Linhas POF / 11 Cols)  │  │
│  └────────────────┬─────────────────┘  └───────────────┬────────────────┘  │
└───────────────────┼────────────────────────────────────┼───────────────────┘
                    │                                    │
                    ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             MOTOR DE CORRELAÇÃO POF ↔ TACO (lib/nutritionEngine.ts)        │
│                                                                            │
│  1. Parser CSV Integral (11 colunas):                                      │
│     • codigo_alimento, descricao_alimento                                  │
│     • codigo_preparacao, descricao_preparacao                              │
│     • codigo_medida, descricao_medida                                      │
│     • codigo_medida_referencia, descricao_medida_referencia                │
│     • quantidade_g, codigo_fonte, descricao_fonte                          │
│                                                                            │
│  2. Indexador Semântico Multi-Token + Mapa de Sinônimos Regionais:         │
│     • Distingue subtipos (Arroz Integral ≠ Arroz Polido;                   │
│       Batata Doce ≠ Batata Inglesa ≠ Batata Baroa)                         │
│     • Conecta cortes TACO ("Carne, bovina, patinho...") ao código POF      │
│       específico ("PATINHO" - 7100501)                                     │
│                                                                            │
│  3. Ordenação por Modo de Preparo & Medida de Referência:                  │
│     • 1º: Medida de Referência POF do mesmo preparo (★ Referência)         │
│     • 2º: Demais medidas POF do mesmo preparo (Cru, Cozido, Grelhado...)   │
│     • 3º: Medidas POF de apoio (Não se aplica / Outros preparos)           │
│     • 4º: Medidas Universais (g, Porção 100g, kg, ml, L)                   │
│                                                                            │
│  4. Gerador de Alimentos Exclusivos POF:                                   │
│     • Cria itens selecionáveis para códigos POF ausentes na TACO           │
│       com perfil nutricional por 100g + todas as medidas do código POF     │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────┐
│ Montagem de Dieta   │  │ Modal de Substituição│  │ Painel do Profissional  │
│ • Seletor com fonte,│  │ Dinâmica             │  │ • Explorador da Base    │
│   preparo e gramas  │  │ • Equivalência usando│  │   POF correlacionada    │
│ • Pré-seleção da    │  │   medida de          │  │ • Criação de porções a  │
│   medida referência │  │   referência POF     │  │   partir de itens POF   │
└─────────────────────┘  └──────────────────────┘  └─────────────────────────┘
```

### Modelo de Dados Atualizado (`types/index.ts`)

- **`HouseholdMeasureOption`**:
  - `id: string`
  - `unitName: string` (ex.: `"Colher de arroz/servir"`)
  - `label: string` (ex.: `"★ Colher de arroz/servir · Cozido(a) — 45g (Arroz cozido - colher de arroz cheia)"`)
  - `grams: number`
  - `source: 'pof' | 'universal' | 'custom'`
  - `preparation?: string` (`descricao_preparacao` normalizada, ex.: `"Cozido(a)"`, `"Grelhado(a)/Brasa"`, `"Cru(a)"`)
  - `sourceDescription?: string` (`descricao_fonte` oficial da POF, ex.: `"Arroz cozido - colher de arroz cheia"`)
  - `pofFoodCode?: string` (`codigo_alimento` da POF, ex.: `"6300101"`)
  - `pofFoodDescription?: string` (`descricao_alimento` da POF)
  - `pofMeasureCode?: string` (`codigo_medida` da POF)
  - `isReferenceMeasure?: boolean` (`true` quando `codigo_medida === codigo_medida_referencia`)
  - `isPreparationMatch?: boolean` (`true` quando o modo de preparo da medida coincide com o preparo do alimento)
- **`NutritionFoodItem`**:
  - Adição de metadados opcionais de rastreabilidade POF (`pofCode?: string`, `pofDescription?: string`, `preparationMethod?: string`, `origin?: 'taco' | 'pof' | 'custom'`).

### Mapeamento de Componentes e Estados Interativos

1. **Atualização e Validação do CSV (`public/assets/aistudio/pof_medidas_caseiras_baf30028.csv`)**:
   - Garantia de sincronia integral com os dados enviados pelo usuário (incluindo todos os códigos de `6300101` a `8800109`).
2. **Motor de Correlação (`lib/nutritionEngine.ts`)**:
   - Parser completo das 11 colunas do CSV POF, agrupando por `codigo_alimento`.
   - Função `correlateTacoItemWithPofGroup(tacoName, tacoCategory, pofGroups)` que calcula score de especificidade léxica, sinônimos culinários e qualificadores (`integral`, `doce`, `inglesa`, `baroa`, `light`, `diet`, `desnatado`, `em pó`, `conserva`, cortes de carnes).
   - Função `sortAndFormatPofMeasuresForFood(pofMeasures, detectedPrep)` que prioriza medidas cujo `preparation` bate com o preparo do alimento TACO, coloca a medida de referência (`codigo_medida_referencia`) no topo e formata o rótulo completo com `descricao_fonte`, preparo e gramas.
   - Geração automática dos alimentos selecionáveis oriundos da POF que não possuem equivalente direto na TACO, enriquecendo o catálogo de busca.
3. **Interface de Prescrição & Substituição (`ClientNutritionWorkspace.tsx` e `DynamicSubstitutionModal.tsx`)**:
   - Pré-seleção inteligente da medida de referência (`isReferenceMeasure`) ao escolher um alimento.
   - Exibição clara da nota de referência/fonte da POF (`descricao_fonte` + preparo + código POF) ao lado do seletor de unidade e nos itens prescritos da refeição.
4. **Explorador de Medidas POF no Painel do Profissional (`ProfessionalNutritionPanel.tsx`)**:
   - Na aba de **Porções & Medidas Caseiras**, inclusão de uma seção interativa de consulta das medidas oficiais POF correlacionadas por alimento e modo de preparo, permitindo filtrar por código/nome e clonar qualquer medida POF como porção personalizada.

---

## 5. Integração das Configurações da Dieta no Perfil do Treinador (Concluído)

- **Localização**: Central de Configuração do Sistema (`TrainerProfileModal.tsx`), no perfil do treinador.
- **Aba Desktop**: `"Configurações da Dieta"` (ícone `Utensils`), ao lado de `"Editar Perfil"` e `"Configurações de Treino"`.
- **Card Mobile/Tablet**: Terceiro card na grade principal do perfil, com acesso direto a todas as ferramentas nutricionais e botão de retorno.
- **Funcionalidades Disponíveis na Aba**:
  1. **Receitas Categorizadas**: Criação e catalogação de receitas com ingredientes, porções e cálculo automático de macronutrientes.
  2. **Alimentos & Suplementos Personalizados**: Cadastro de alimentos do treinador e suplementos esportivos com tabela nutricional completa.
  3. **Refeições Pré-definidas**: Templates estruturados de refeições (ex.: Café Pré-Treino, Almoço Anabólico) para inserção ágil nas dietas dos alunos.
  4. **Porções Personalizadas & Explorador POF/IBGE**: Gestão de porções customizadas e consulta direta de todas as medidas oficiais da POF correlacionadas.
- **Sincronização & Persistência**: Toda edição salva é armazenada localmente em `storage.saveNutritionLibrary()` e sincronizada na nuvem com o Firestore via `cloudSync.syncNutritionLibrary()`.

---

## 6. Critérios de Sucesso & Verificação

1. **Validação TypeScript**: `npx tsc --noEmit` executado sem erros (exit code 0).
2. **Linting de Código**: `eslint .` executado sem erros impeditivos.
3. **Servidor Ativo**: Next.js rodando na porta 3000 respondendo com HTTP 200.
4. **Responsividade**: Navegação fluida em desktop (abas superiores), tablet e mobile (cards de navegação integrados).
