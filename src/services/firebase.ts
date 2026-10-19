/**
 * =========================================================================================
 * BANCO DE DADOS NA NUVEM (FIREBASE FIRESTORE) - CÓDIGO DEFINITIVO
 * =========================================================================================
 * 1. Carregamento seguro e assíncrono em segundo plano (Zero tela branca).
 * 2. Persistência local obrigatória ('browserLocalPersistence').
 * 3. Deleção definitiva na nuvem com deleteDoc e tombstones anti-ressurgimento.
 * =========================================================================================
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import {
  Transaction,
  Category,
  UserProfile,
  RecurringExpenseRule,
} from '../types/finance';

// 2. CONFIGURAÇÃO OFICIAL DO FIREBASE:
export const firebaseConfig = {
  apiKey: "AIzaSyDLxKnZW-_9J8RAspiA7ul7gtE7F63wr_M",
  authDomain: "impressive-superstate-csmzh.firebaseapp.com",
  projectId: "impressive-superstate-csmzh",
  storageBucket: "impressive-superstate-csmzh.firebasestorage.app",
  messagingSenderId: "1079469168199",
  appId: "1:1079469168199:web:d58392f19152a1c698c362"
};

// 1. TRATAMENTO DE ERROS E INICIALIZAÇÃO SEGURA (TRY / CATCH):
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;
let isFirebaseAvailable = false;

try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("COLE_AQUI")) {
    console.warn('[Firebase] Chaves não configuradas. Operando 100% no Modo Local.');
    isFirebaseAvailable = false;
  } else {
    appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();

    const dbId = (appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== '(default)')
      ? appletConfig.firestoreDatabaseId
      : undefined;

    // Ativa cache offline local (IndexedDB) no Firestore para carregamento instantâneo offline-first
    try {
      const cacheConfig = {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
      if (dbId) {
        dbInstance = initializeFirestore(appInstance, cacheConfig, dbId);
      } else {
        dbInstance = initializeFirestore(appInstance, cacheConfig);
      }
      console.log('[Firestore] Persistência offline local ativada com sucesso.');
    } catch (errCache) {
      try {
        dbInstance = dbId ? getFirestore(appInstance, dbId) : getFirestore(appInstance);
      } catch (e2) {
        console.warn('[Firestore] Inicialização em modo local:', errCache, e2);
        dbInstance = null;
      }
    }

    try {
      // 1. Inicialização correta e oficial do Auth via getAuth(app)
      authInstance = getAuth(appInstance);
      try {
        authInstance.useDeviceLanguage();
      } catch {}

      // Configura persistência permanente com fallback para browserLocalPersistence
      if (typeof window !== 'undefined') {
        const authRef = authInstance;
        setPersistence(authRef, indexedDBLocalPersistence)
          .catch(() => setPersistence(authRef, browserLocalPersistence))
          .catch((errPersist) => {
            console.warn('[FirebaseAuth] Aviso ao configurar persistência:', errPersist);
          });
      }
      googleProviderInstance = new GoogleAuthProvider();
      googleProviderInstance.setCustomParameters({ prompt: 'select_account' });

      // Captura inicial do retorno do redirecionamento do Google (signInWithRedirect)
      getRedirectResult(authInstance)
        .then((redirectUser) => {
          if (redirectUser?.user) {
            console.log('[FirebaseAuth] Usuário autenticado com sucesso pós-redirecionamento:', redirectUser.user.email);
          }
        })
        .catch((redirectErr) => {
          console.warn('[FirebaseAuth] Aviso seguro no getRedirectResult inicial:', redirectErr);
        });
    } catch (errAuth) {
      console.warn('[FirebaseAuth] Inicialização em modo local:', errAuth);
      authInstance = null;
      googleProviderInstance = null;
    }

    isFirebaseAvailable = Boolean(appInstance && authInstance);
  }
} catch (e) {
  console.warn('[Firebase] Operando 100% no Armazenamento Local Seguro:', e);
  isFirebaseAvailable = false;
  appInstance = null;
  dbInstance = null;
  authInstance = null;
  googleProviderInstance = null;
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const googleProvider = googleProviderInstance;
export { isFirebaseAvailable };

// Função para detectar smartphones, tablets e webviews móveis
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Captura segura do resultado de redirect do Google no carregamento da aplicação
export async function checkRedirectResult(): Promise<FirebaseUser | null> {
  if (!authInstance) return null;
  try {
    const result = await getRedirectResult(authInstance);
    if (result && result.user) {
      console.log('[FirebaseAuth] Login capturado com sucesso via redirect:', result.user.email);
      return result.user;
    }
    return null;
  } catch (err: any) {
    console.warn('[FirebaseAuth] Erro seguro ao verificar getRedirectResult:', err);
    return null;
  }
}

// 1. Google Sign-In Oficial 1-Clique (Popup com fallback limpo para Redirect)
export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  // 1. Obter auth garantido via getAuth(appInstance)
  let currentAuth = authInstance;
  if (!currentAuth && appInstance) {
    try {
      currentAuth = getAuth(appInstance);
      authInstance = currentAuth;
    } catch {}
  }

  if (!currentAuth) {
    const err = new Error('Não foi possível conectar com o serviço de autenticação no momento. Tente novamente.');
    (err as any).friendlyMessage = 'Não foi possível conectar com o serviço de autenticação no momento. Tente novamente.';
    throw err;
  }

  // 1. Instanciação correta do provedor Google
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    // 2. Chamada de login segura: signInWithPopup(auth, provider) com EXATAMENTE esses dois parâmetros válidos
    const result = await signInWithPopup(currentAuth, provider);
    return result.user;
  } catch (popupErr: any) {
    console.warn('[FirebaseAuth] Popup bloqueado ou indisponível. Verificando fallback...', popupErr);
    const code = popupErr?.code || '';
    const message = (popupErr?.message || '').toLowerCase();

    // Detecta se pop-up foi bloqueado, fechado ou se estamos em dispositivo móvel/webview
    const isBlockedOrMobile =
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      message.includes('popup') ||
      isMobileDevice();

    if (isBlockedOrMobile) {
      console.log('[FirebaseAuth] Executando fallback seguro com signInWithRedirect(auth, provider)...');
      try {
        await signInWithRedirect(currentAuth, provider);
        return null;
      } catch (redirectErr: any) {
        console.warn('[FirebaseAuth] Redirect falhou:', redirectErr);
        const err = new Error('Não foi possível concluir o login com o Google. Tente novamente.');
        (err as any).friendlyMessage = 'Não foi possível concluir o login com o Google. Tente novamente.';
        throw err;
      }
    }

    // 3. Tratamento de Erros Amigável (Não exibe auth/argument-error)
    let friendlyMessage = 'Não foi possível autenticar com o Google. Por favor, tente novamente.';
    if (code === 'auth/network-request-failed') {
      friendlyMessage = 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
    } else if (code === 'auth/unauthorized-domain') {
      friendlyMessage = 'Domínio não autorizado no Firebase Console para autenticação Google.';
    } else if (code === 'auth/operation-not-allowed') {
      friendlyMessage = 'O provedor Google não está ativado no Firebase Authentication.';
    }

    const safeError = new Error(friendlyMessage);
    (safeError as any).code = code;
    (safeError as any).friendlyMessage = friendlyMessage;
    throw safeError;
  }
}

// Desconectar Sessão
export async function logoutUser(): Promise<void> {
  if (!authInstance) return;
  try {
    await signOut(authInstance);
  } catch (err) {
    console.warn('[FirebaseAuth] Erro no logout:', err);
  }
}

// Observador onAuthStateChanged para Reconhecimento Imediato e Sessão Persistente
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  try {
    return onAuthStateChanged(
      authInstance,
      (user) => {
        // Reconexão suave em segundo plano preservando sessão do usuário
        if (user) {
          console.log('[FirebaseAuth] Sessão ativa autenticada:', user.email);
        } else {
          console.log('[FirebaseAuth] Nenhuma sessão ativa no momento.');
        }
        callback(user);
      },
      (error) => {
        console.warn('[FirebaseAuth] Aviso na verificação de sessão em segundo plano:', error);
        // Não desconecta abruptamente caso haja currentUser em cache persistente local
        if (authInstance?.currentUser) {
          callback(authInstance.currentUser);
        }
      }
    );
  } catch (err) {
    console.warn('[FirebaseAuth] Falha ao registrar observador de autenticação:', err);
    if (authInstance?.currentUser) {
      callback(authInstance.currentUser);
    } else {
      callback(null);
    }
    return () => {};
  }
}

// ==========================================
// Estrutura de Sincronização e Lixeira Real
// ==========================================

export interface UserSecurityCloudData {
  pin?: string | null;
  pinEnabled?: boolean;
  biometricEnabled?: boolean;
  biometricRegistered?: boolean;
  biometricType?: string;
  biometricDate?: string;
  biometricCredentialId?: string | null;
}

export interface UserCloudData {
  transactions: Transaction[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  budgets: Record<string, number>;
  defaultBudget: number;
  categoryBudgets: Record<string, number>;
  monthlyIncomes?: Record<string, number>;
  defaultIncome?: number;
  userProfile?: UserProfile;
  recurringRules: RecurringExpenseRule[];
  security?: UserSecurityCloudData;
  deletedItemIds?: string[];
}

/**
 * Sincroniza lançamentos, perfil e configurações no Firestore
 */
export async function syncUserDataToCloud(userId: string, data: UserCloudData): Promise<void> {
  if (!userId || !dbInstance) return;

  try {
    // 1. Documento Raiz do Usuário
    const userDocRef = doc(dbInstance, 'users', userId);
    await setDoc(
      userDocRef,
      {
        userId,
        name: data.userProfile?.name || 'Usuário',
        managerName: data.userProfile?.managerName || data.userProfile?.name || 'Usuário',
        login: data.userProfile?.login || '@usuario',
        pixKey: data.userProfile?.pixKey || '',
        avatarUrl: data.userProfile?.avatarUrl || '',
        avatarColor: data.userProfile?.avatarColor || '#7dd3fc',
        bio: data.userProfile?.bio || '',
        joinedDate: data.userProfile?.joinedDate || 'Setembro 2026',
        themeColor: data.userProfile?.themeColor || 'sky',
        budgets: data.budgets,
        defaultBudget: data.defaultBudget,
        categoryBudgets: data.categoryBudgets,
        monthlyIncomes: data.monthlyIncomes || {},
        defaultIncome: data.defaultIncome ?? 0,
        ...(data.security ? { security: data.security } : {}),
        ...(data.deletedItemIds && data.deletedItemIds.length > 0 ? { deletedItemIds: data.deletedItemIds } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Subcoleção de Perfil
    if (data.userProfile) {
      const profileRef = doc(dbInstance, 'users', userId, 'profile', 'current');
      await setDoc(
        profileRef,
        {
          userId,
          name: data.userProfile.name,
          managerName: data.userProfile.managerName || data.userProfile.name,
          login: data.userProfile.login,
          pixKey: data.userProfile.pixKey || '',
          avatarUrl: data.userProfile.avatarUrl || '',
          avatarColor: data.userProfile.avatarColor || '#7dd3fc',
          bio: data.userProfile.bio || '',
          joinedDate: data.userProfile.joinedDate,
          themeColor: data.userProfile.themeColor || 'sky',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 2. Orçamentos e Renda
    const budgetRef = doc(dbInstance, 'users', userId, 'budgetConfig', 'current');
    await setDoc(
      budgetRef,
      {
        userId,
        budgets: data.budgets,
        defaultBudget: data.defaultBudget,
        categoryBudgets: data.categoryBudgets,
        monthlyIncomes: data.monthlyIncomes || {},
        defaultIncome: data.defaultIncome ?? 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. Categorias
    const allCategories = [...data.incomeCategories, ...data.expenseCategories];
    const catBatch = writeBatch(dbInstance);
    for (const cat of allCategories) {
      const catRef = doc(dbInstance, 'users', userId, 'categories', cat.id);
      catBatch.set(catRef, { ...cat, userId }, { merge: true });
    }
    await catBatch.commit();

    // 4. Lançamentos (em lotes)
    const txChunks: Transaction[][] = [];
    const chunkSize = 200;
    for (let i = 0; i < data.transactions.length; i += chunkSize) {
      txChunks.push(data.transactions.slice(i, i + chunkSize));
    }

    for (const chunk of txChunks) {
      const txBatch = writeBatch(dbInstance);
      for (const tx of chunk) {
        const txRef = doc(dbInstance, 'users', userId, 'transactions', tx.id);
        txBatch.set(txRef, { ...tx, userId }, { merge: true });
      }
      await txBatch.commit();
    }

    // 5. Regras Recorrentes
    if (data.recurringRules.length > 0) {
      const ruleBatch = writeBatch(dbInstance);
      for (const rule of data.recurringRules) {
        const ruleRef = doc(dbInstance, 'users', userId, 'recurringRules', rule.id);
        ruleBatch.set(ruleRef, { ...rule, userId }, { merge: true });
      }
      await ruleBatch.commit();
    }
  } catch (error) {
    console.warn('[Firestore Sync] Operação em segundo plano:', error);
  }
}

/**
 * Busca dados da nuvem garantindo que itens apagados (deletedItemIds) nunca retornem
 */
export async function fetchUserDataFromCloud(userId: string): Promise<UserCloudData | null> {
  if (!userId || !dbInstance) return null;

  try {
    const userDocRef = doc(dbInstance, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);

    let security: UserSecurityCloudData | undefined = undefined;
    let deletedItemIds: string[] = [];
    let rootUserData: any = null;

    if (userDocSnap.exists()) {
      rootUserData = userDocSnap.data();
      if (rootUserData.security) {
        security = rootUserData.security as UserSecurityCloudData;
      }
      if (rootUserData.deletedItemIds && Array.isArray(rootUserData.deletedItemIds)) {
        deletedItemIds = rootUserData.deletedItemIds;
      }
    }

    const deletedSet = new Set(deletedItemIds);

    // Perfil
    const profileRef = doc(dbInstance, 'users', userId, 'profile', 'current');
    const profileSnap = await getDoc(profileRef);
    let userProfile: UserProfile | undefined = undefined;

    if (profileSnap.exists()) {
      userProfile = profileSnap.data() as UserProfile;
    } else if (rootUserData?.name) {
      userProfile = {
        name: rootUserData.name,
        managerName: rootUserData.managerName || rootUserData.name,
        login: rootUserData.login || '@usuario',
        pixKey: rootUserData.pixKey || '',
        avatarUrl: rootUserData.avatarUrl || '',
        avatarColor: rootUserData.avatarColor || '#7dd3fc',
        bio: rootUserData.bio || '',
        joinedDate: rootUserData.joinedDate || 'Setembro 2026',
        themeColor: rootUserData.themeColor || 'sky',
      };
    }

    // Orçamento
    const budgetRef = doc(dbInstance, 'users', userId, 'budgetConfig', 'current');
    const budgetSnap = await getDoc(budgetRef);
    const budgetConfig = budgetSnap.exists() ? budgetSnap.data() : null;

    // Categorias (exclui permanentemente itens apagados)
    const catSnaps = await getDocs(collection(dbInstance, 'users', userId, 'categories'));
    const fetchedCategories: Category[] = [];
    catSnaps.forEach((docSnap) => {
      const c = docSnap.data() as Category;
      if (!deletedSet.has(c.id)) {
        fetchedCategories.push(c);
      } else {
        deleteDoc(docSnap.ref).catch(() => {});
      }
    });

    // Lançamentos (exclui permanentemente itens apagados)
    const txSnaps = await getDocs(collection(dbInstance, 'users', userId, 'transactions'));
    const fetchedTransactions: Transaction[] = [];
    txSnaps.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (!deletedSet.has(t.id)) {
        fetchedTransactions.push(t);
      } else {
        deleteDoc(docSnap.ref).catch(() => {});
      }
    });

    // Regras Recorrentes (exclui permanentemente itens apagados)
    const ruleSnaps = await getDocs(collection(dbInstance, 'users', userId, 'recurringRules'));
    const fetchedRules: RecurringExpenseRule[] = [];
    ruleSnaps.forEach((docSnap) => {
      const r = docSnap.data() as RecurringExpenseRule;
      if (!deletedSet.has(r.id)) {
        fetchedRules.push(r);
      } else {
        deleteDoc(docSnap.ref).catch(() => {});
      }
    });

    // Orçamentos e Renda: busca em budgetConfig e também no documento raiz
    const cloudBudgets = budgetConfig?.budgets || rootUserData?.budgets || {};
    const cloudDefaultBudget = typeof budgetConfig?.defaultBudget === 'number'
      ? budgetConfig.defaultBudget
      : typeof rootUserData?.defaultBudget === 'number'
      ? rootUserData.defaultBudget
      : null;
    const cloudCategoryBudgets = budgetConfig?.categoryBudgets || rootUserData?.categoryBudgets || {};
    const cloudMonthlyIncomes = budgetConfig?.monthlyIncomes || rootUserData?.monthlyIncomes || {};
    const cloudDefaultIncome = typeof budgetConfig?.defaultIncome === 'number'
      ? budgetConfig.defaultIncome
      : typeof rootUserData?.defaultIncome === 'number'
      ? rootUserData.defaultIncome
      : 0;

    return {
      transactions: fetchedTransactions,
      incomeCategories: fetchedCategories.filter((c) => c.type === 'income'),
      expenseCategories: fetchedCategories.filter((c) => c.type === 'expense'),
      budgets: cloudBudgets,
      defaultBudget: cloudDefaultBudget ?? 3500,
      categoryBudgets: cloudCategoryBudgets,
      monthlyIncomes: cloudMonthlyIncomes,
      defaultIncome: cloudDefaultIncome,
      userProfile,
      recurringRules: fetchedRules,
      security,
      deletedItemIds,
    };
  } catch (error) {
    console.warn('[Firestore Fetch] Fallback para armazenamento local:', error);
    return null;
  }
}

/**
 * Salva Renda e Orçamento Mensal imediatamente no Firestore (sem debounce)
 */
export async function saveBudgetAndIncomeToCloud(
  userId: string,
  budgets: Record<string, number>,
  defaultBudget: number,
  monthlyIncomes?: Record<string, number>,
  defaultIncome?: number,
  categoryBudgets?: Record<string, number>
): Promise<void> {
  if (!userId || !dbInstance) return;
  try {
    const payload = {
      userId,
      budgets,
      defaultBudget,
      monthlyIncomes: monthlyIncomes || {},
      defaultIncome: defaultIncome ?? 0,
      categoryBudgets: categoryBudgets || {},
      updatedAt: new Date().toISOString(),
    };

    // 1. Salva imediatamente no documento raiz users/{userId}
    const userDocRef = doc(dbInstance, 'users', userId);
    await setDoc(userDocRef, payload, { merge: true });

    // 2. Salva imediatamente na subcoleção users/{userId}/budgetConfig/current
    const budgetRef = doc(dbInstance, 'users', userId, 'budgetConfig', 'current');
    await setDoc(budgetRef, payload, { merge: true });

    console.log('[Firestore] Renda e Orçamento salvos imediatamente na nuvem com sucesso.');
  } catch (error) {
    console.warn('[Firestore] Erro ao salvar Renda e Orçamento imediatamente:', error);
  }
}

// 3. EXCLUSÃO DEFINITIVA (LIXEIRA REAL COM deleteDoc):

/**
 * Exclui lançamento da nuvem imediatamente
 */
export async function deleteTransactionFromCloud(userId: string, transactionId: string): Promise<void> {
  if (!userId || !transactionId || !dbInstance) return;
  try {
    const txRef = doc(dbInstance, 'users', userId, 'transactions', transactionId);
    await deleteDoc(txRef);
  } catch (error) {
    console.warn('[Firestore deleteDoc] Erro ao excluir transação:', error);
  }
}

/**
 * Exclui categoria da nuvem imediatamente
 */
export async function deleteCategoryFromCloud(userId: string, categoryId: string): Promise<void> {
  if (!userId || !categoryId || !dbInstance) return;
  try {
    const catRef = doc(dbInstance, 'users', userId, 'categories', categoryId);
    await deleteDoc(catRef);
  } catch (error) {
    console.warn('[Firestore deleteDoc] Erro ao excluir categoria:', error);
  }
}

/**
 * Exclui regra recorrente da nuvem imediatamente
 */
export async function deleteRecurringRuleFromCloud(userId: string, ruleId: string): Promise<void> {
  if (!userId || !ruleId || !dbInstance) return;
  try {
    const ruleRef = doc(dbInstance, 'users', userId, 'recurringRules', ruleId);
    await deleteDoc(ruleRef);
  } catch (error) {
    console.warn('[Firestore deleteDoc] Erro ao excluir regra:', error);
  }
}

/**
 * Salva perfil e credenciais de segurança diretamente em users/{userId}
 */
export async function saveProfileAndSecurityToCloud(
  userId: string,
  profile: UserProfile,
  security?: UserSecurityCloudData
): Promise<void> {
  if (!userId || !dbInstance) return;
  try {
    const userDocRef = doc(dbInstance, 'users', userId);
    await setDoc(
      userDocRef,
      {
        userId,
        name: profile.name,
        managerName: profile.managerName || profile.name,
        login: profile.login,
        pixKey: profile.pixKey || '',
        avatarUrl: profile.avatarUrl || '',
        avatarColor: profile.avatarColor || '#7dd3fc',
        bio: profile.bio || '',
        joinedDate: profile.joinedDate,
        themeColor: profile.themeColor || 'sky',
        ...(security ? { security } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firestore Profile] Erro ao salvar perfil:', error);
  }
}

/**
 * Zera todas as transações na nuvem para o usuário
 */
export async function clearAllTransactionsFromCloud(userId: string): Promise<void> {
  if (!userId || !dbInstance) {
    console.warn('[Firestore Clear] Banco de dados em nuvem indisponível.');
    return;
  }
  try {
    // 1. Apaga todos os documentos de transações em lotes seguros de até 400
    const txColl = collection(dbInstance, 'users', userId, 'transactions');
    const txSnaps = await getDocs(txColl);
    const txDocs = txSnaps.docs;

    if (txDocs.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < txDocs.length; i += chunkSize) {
        const chunk = txDocs.slice(i, i + chunkSize);
        try {
          const batch = writeBatch(dbInstance);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        } catch (batchErr) {
          console.warn('[Firestore Clear] Falha no writeBatch, executando deleteDoc individual:', batchErr);
          await Promise.allSettled(chunk.map((d) => deleteDoc(d.ref)));
        }
      }
    }

    // 2. Apaga todas as regras recorrentes na nuvem
    const ruleColl = collection(dbInstance, 'users', userId, 'recurringRules');
    const ruleSnaps = await getDocs(ruleColl);
    const ruleDocs = ruleSnaps.docs;

    if (ruleDocs.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < ruleDocs.length; i += chunkSize) {
        const chunk = ruleDocs.slice(i, i + chunkSize);
        try {
          const batch = writeBatch(dbInstance);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        } catch (batchErr) {
          console.warn('[Firestore Clear] Falha no writeBatch de regras, executando deleteDoc individual:', batchErr);
          await Promise.allSettled(chunk.map((d) => deleteDoc(d.ref)));
        }
      }
    }

    // 3. Atualiza o documento raiz do usuário no Firestore registrando totalTransactions: 0
    try {
      const userDocRef = doc(dbInstance, 'users', userId);
      await setDoc(
        userDocRef,
        {
          totalTransactions: 0,
          transactionsClearedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (eDoc) {
      console.warn('[Firestore Clear] Aviso ao atualizar documento raiz:', eDoc);
    }

    console.log(`[Firestore Clear] Exclusão definitiva concluída: ${txDocs.length} transações e ${ruleDocs.length} regras apagadas da nuvem.`);
  } catch (error) {
    console.warn('[Firestore Clear] Erro ao zerar histórico:', error);
    try {
      const txColl = collection(dbInstance, 'users', userId, 'transactions');
      const txSnaps = await getDocs(txColl);
      await Promise.allSettled(txSnaps.docs.map((d) => deleteDoc(d.ref)));
    } catch (fallbackErr) {
      console.warn('[Firestore Clear] Erro no fallback final:', fallbackErr);
    }
  }
}
