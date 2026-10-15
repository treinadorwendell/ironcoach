# Plano de Implementação - Autenticação de Treinador & Isolamento de Dados Firebase

## 1. Visão Geral
Criar uma tela de login dedicada antes de acessar o aplicativo, suportando:
- Acesso com E-mail e Senha (Login e Cadastro de novos treinadores).
- Login com Conta do Google (Firebase Authentication Popup).
- Isolamento completo de dados por treinador (`userId`), garantindo que clientes, treinos, agenda e relatórios sejam salvos e consultados de forma segura e independente por usuário no Firestore.

## 2. Passos de Implementação
1. **Módulo de Autenticação Firebase (`src/lib/firebaseAuth.ts` ou `lib/firebase.ts`)**:
   - Inicializar Auth e Firestore.
   - Prover funções `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `logoutUser`, e observador `onAuthStateChanged`.
2. **Componente de Tela de Login Dedicada (`components/AuthScreen.tsx`)**:
   - Interface moderna (compatível com desktop, mobile e tablet / frame).
   - Abas ou alternância entre Entrar e Cadastrar.
   - Campos de E-mail, Senha e botões de ação e Google Sign-In.
   - Tratamento de erros amigável em português.
3. **Isolamento de Dados no Firestore (`hooks/useFirebaseSync.ts` ou gerenciamento de estado em `page.tsx`)**:
   - Ajustar as coleções e consultas do Firestore para filtrar por `userId` do treinador logado (ex: `users/{userId}/clients`, `users/{userId}/workouts`, etc.).
4. **Integração com `page.tsx`**:
   - Se o usuário não estiver autenticado (`!user`), exibir a `AuthScreen` dedicada.
   - Se autenticado, carregar o painel do treinador com seus respectivos dados do Firestore.
5. **Regras de Segurança (`firestore.rules`)**:
   - Garantir regras rigorosas onde cada usuário (`request.auth.uid`) só pode ler/escrever em seus próprios subdocumentos e coleções vinculadas.
