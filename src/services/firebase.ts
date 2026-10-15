/**
 * =========================================================================================
 * CONFIGURAÇÃO DO BANCO DE DADOS NA NUVEM (FIREBASE FIRESTORE) - CARREGAMENTO SEGURO
 * =========================================================================================
 * 1. O bloco do Firebase (firebaseConfig, initializeApp, getAuth) é encapsulado em try/catch.
 * 2. Se a internet ou o Firebase falharem, o app abre 100% no modo Armazenamento Local Seguro.
 * 3. Nenhuma chamada de rede síncrona ocorre no topo do arquivo.
 * =========================================================================================
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
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

// Configuração do Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyDLxKnZW-_9J8RAspiA7ul7gtE7F63wr_M",
  authDomain: "impressive-superstate-csmzh.firebaseapp.com",
  projectId: "impressive-superstate-csmzh",
  storageBucket: "impressive-superstate-csmzh.appspot.com",
  messagingSenderId: "1079469168199",
  appId: "1:1079469168199:web:d58392f19152a1c698c362"
};

// 2. TRATAMENTO DE ERROS (TRY / CATCH):
// Coloque o bloco do Firebase (firebaseConfig, initializeApp, getAuth) dentro de um try/catch.
// Se falhar, o aplicativo abre 100% no modo local ("Armazenamento Local Ativo"), sem tela branca.
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;
let isFirebaseAvailable = false;
let firebaseInitErrorMessage: string | null = null;

try {
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  const databaseId =
    (appletConfig as any)?.firestoreDatabaseId && (appletConfig as any).firestoreDatabaseId !== '(default)'
      ? (appletConfig as any).firestoreDatabaseId
      : undefined;

  dbInstance = databaseId ? getFirestore(appInstance, databaseId) : getFirestore(appInstance);
  authInstance = getAuth(appInstance);

  try {
    setPersistence(authInstance, browserLocalPersistence).catch((err) => {
      console.warn('[FirebaseAuth] Persistência local em segundo plano:', err);
    });
  } catch (persistErr) {
    console.warn('[FirebaseAuth] Persistência em cache:', persistErr);
  }

  try {
    authInstance.useDeviceLanguage();
  } catch {
    // Ignora em ambientes sem suporte
  }

  googleProviderInstance = new GoogleAuthProvider();
  googleProviderInstance.setCustomParameters({
    prompt: 'select_account',
  });

  isFirebaseAvailable = true;
  console.log('[Firebase] Inicialização segura concluída com sucesso.');
} catch (e: any) {
  console.error('[Firebase] Falha na inicialização do Firebase. Modo Armazenamento Local Ativo:', e);
  firebaseInitErrorMessage = e?.message || 'Falha ao inicializar o Firebase';
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
export { isFirebaseAvailable, firebaseInitErrorMessage };

// Tipos de Operação
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || null,
      email: authInstance?.currentUser?.email || null,
    },
    operationType,
    path,
  };
  console.warn('[Firestore Operação]:', JSON.stringify(errInfo));
}

// Teste de conexão seguro e assíncrono (não bloqueante)
export async function testFirestoreConnection(): Promise<boolean> {
  if (!dbInstance) return false;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Cliente em modo offline');
      return false;
    }
    return true;
  }
}

// Google Sign-In seguro
export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  if (!authInstance || !googleProviderInstance) {
    throw new Error('Serviço do Google indisponível no momento. O aplicativo está operando no modo Armazenamento Local Seguro.');
  }

  try {
    await setPersistence(authInstance, browserLocalPersistence).catch(() => {});
    const result = await signInWithPopup(authInstance, googleProviderInstance);
    return result.user;
  } catch (err: any) {
    console.error('[FirebaseAuth] Erro no login Google:', err);
    throw err;
  }
}

// Sign-Out seguro
export async function logoutUser(): Promise<void> {
  if (!authInstance) return;
  try {
    await signOut(authInstance);
  } catch (err) {
    console.warn('[FirebaseAuth] Erro no logout:', err);
  }
}

// Subscribe to Auth changes seguro
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  try {
    return onAuthStateChanged(
      authInstance,
      (user) => {
        callback(user);
      },
      (error) => {
        console.warn('[FirebaseAuth] Status de rede/auth:', error);
        callback(null);
      }
    );
  } catch (err) {
    console.warn('[FirebaseAuth] Erro ao registrar listener:', err);
    callback(null);
    return () => {};
  }
}

// ==========================================
// Sincronização Segura de Dados na Nuvem
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
  userProfile?: UserProfile;
  recurringRules: RecurringExpenseRule[];
  security?: UserSecurityCloudData;
  deletedItemIds?: string[];
}

/**
 * Salva lançamentos, perfil, senhas e configurações na nuvem
 */
export async function syncUserDataToCloud(userId: string, data: UserCloudData): Promise<void> {
  if (!userId || !dbInstance) {
    console.warn('[Firebase] Nuvem inativa. Dados preservados no Armazenamento Local Seguro.');
    return;
  }

  try {
    // 1. Persistência Principal em users/{userId}
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

    // 2. Orçamentos
    const budgetRef = doc(dbInstance, 'users', userId, 'budgetConfig', 'current');
    await setDoc(
      budgetRef,
      {
        userId,
        budgets: data.budgets,
        defaultBudget: data.defaultBudget,
        categoryBudgets: data.categoryBudgets,
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

    // 4. Lançamentos
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
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Busca dados sincronizados da nuvem
 */
export async function fetchUserDataFromCloud(userId: string): Promise<UserCloudData | null> {
  if (!userId || !dbInstance) return null;

  try {
    // 1. Documento Raiz do Usuário
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

    // 2. Perfil
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

    // 3. Orçamento
    const budgetRef = doc(dbInstance, 'users', userId, 'budgetConfig', 'current');
    const budgetSnap = await getDoc(budgetRef);
    const budgetConfig = budgetSnap.exists() ? budgetSnap.data() : null;

    // 4. Categorias
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

    // 5. Lançamentos
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

    // 6. Regras Recorrentes
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

    const incomeCategories = fetchedCategories.filter((c) => c.type === 'income');
    const expenseCategories = fetchedCategories.filter((c) => c.type === 'expense');

    return {
      transactions: fetchedTransactions,
      incomeCategories,
      expenseCategories,
      budgets: budgetConfig?.budgets || {},
      defaultBudget: budgetConfig?.defaultBudget ?? 3500,
      categoryBudgets: budgetConfig?.categoryBudgets || {},
      userProfile,
      recurringRules: fetchedRules,
      security,
      deletedItemIds,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

/**
 * Exclui lançamento da nuvem
 */
export async function deleteTransactionFromCloud(userId: string, transactionId: string): Promise<void> {
  if (!userId || !transactionId || !dbInstance) return;
  try {
    const txRef = doc(dbInstance, 'users', userId, 'transactions', transactionId);
    await deleteDoc(txRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions/${transactionId}`);
  }
}

/**
 * Exclui categoria da nuvem
 */
export async function deleteCategoryFromCloud(userId: string, categoryId: string): Promise<void> {
  if (!userId || !categoryId || !dbInstance) return;
  try {
    const catRef = doc(dbInstance, 'users', userId, 'categories', categoryId);
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/categories/${categoryId}`);
  }
}

/**
 * Exclui regra recorrente da nuvem
 */
export async function deleteRecurringRuleFromCloud(userId: string, ruleId: string): Promise<void> {
  if (!userId || !ruleId || !dbInstance) return;
  try {
    const ruleRef = doc(dbInstance, 'users', userId, 'recurringRules', ruleId);
    await deleteDoc(ruleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/recurringRules/${ruleId}`);
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
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Zera todas as transações na nuvem para o usuário
 */
export async function clearAllTransactionsFromCloud(userId: string): Promise<void> {
  if (!userId || !dbInstance) return;
  try {
    const txSnaps = await getDocs(collection(dbInstance, 'users', userId, 'transactions'));
    const batch = writeBatch(dbInstance);
    txSnaps.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const ruleSnaps = await getDocs(collection(dbInstance, 'users', userId, 'recurringRules'));
    ruleSnaps.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions`);
  }
}
