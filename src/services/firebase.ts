/**
 * =========================================================================================
 * CONFIGURAÇÃO DO BANCO DE DADOS NA NUVEM (FIREBASE FIRESTORE)
 * =========================================================================================
 * Para conectar seu próprio projeto gratuito do Firebase:
 * 1. Acesse https://console.firebase.google.com/ e crie ou selecione seu projeto.
 * 2. Em "Configurações do Projeto" > "Geral", copie o objeto "firebaseConfig".
 * 3. Você pode substituir os valores abaixo ou no arquivo /firebase-applet-config.json.
 * 
 * Este aplicativo já está configurado e funcional com o Firestore Enterprise / Spark.
 * =========================================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
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
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import {
  Transaction,
  Category,
  UserProfile,
  RecurringExpenseRule,
} from '../types/finance';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDLxKnZW-_9J8RAspiA7ul7gtE7F63wr_M",
  authDomain: "impressive-superstate-csmzh.firebaseapp.com",
  projectId: "impressive-superstate-csmzh",
  storageBucket: "impressive-superstate-csmzh.appspot.com",
  messagingSenderId: "1079469168199",
  appId: "1:1079469168199:web:d58392f19152a1c698c362"
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (conecta na base de dados ativa do projeto)
const databaseId =
  (appletConfig as any)?.firestoreDatabaseId && (appletConfig as any).firestoreDatabaseId !== '(default)'
    ? (appletConfig as any).firestoreDatabaseId
    : undefined;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);

// 1. Configura persistência como LOCAL para garantir que a sessão persista ao fechar e abrir o aplicativo
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[FirebaseAuth] Não foi possível ativar persistência local:', err);
});

try {
  auth.useDeviceLanguage();
} catch {
  // Ignore in SSR/headless environments
}
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Error Handling Infrastructure conforming to Skill
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
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by Skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] O cliente está em modo offline ou conectando...');
      return false;
    }
    return true;
  }
}
testFirestoreConnection();

// Google Sign-In with popup
export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  try {
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('[FirebaseAuth] Erro no login Google:', err);
    throw err;
  }
}

// Sign-Out
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[FirebaseAuth] Erro no logout:', err);
  }
}

// Subscribe to Auth changes
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ==========================================
// User Cloud Data Synchronization Services
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
 * Save all transactions, profile, security and settings to cloud for a specific user
 * Dual persistence: saves to users/{userId} and subcollections
 */
export async function syncUserDataToCloud(userId: string, data: UserCloudData): Promise<void> {
  if (!userId) return;

  try {
    // 1. Dual-Engine Persistence: Documento Principal do Usuário ('users/{userId}')
    // Salva Nome do Gestor/Usuário, login, chave Pix, configurações e status da Biometria/Digital
    const userDocRef = doc(db, 'users', userId);
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

    // Subcoleção de Perfil ('users/{userId}/profile/current')
    if (data.userProfile) {
      const profileRef = doc(db, 'users', userId, 'profile', 'current');
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

    // 2. Sync Budget Settings
    const budgetRef = doc(db, 'users', userId, 'budgetConfig', 'current');
    await setDoc(
      budgetRef,
      {
        userId,
        defaultBudget: data.defaultBudget,
        budgets: data.budgets || {},
        categoryBudgets: data.categoryBudgets || {},
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. Batch sync categories (ignoring deleted categories)
    const deletedSet = new Set(data.deletedItemIds || []);
    const allCategories = [...data.incomeCategories, ...data.expenseCategories];
    for (const cat of allCategories) {
      if (deletedSet.has(cat.id)) continue;
      const catRef = doc(db, 'users', userId, 'categories', cat.id);
      await setDoc(
        catRef,
        {
          id: cat.id,
          userId,
          name: cat.name,
          type: cat.type,
          iconName: cat.iconName || '',
          color: cat.color || '',
        },
        { merge: true }
      );
    }

    // 4. Sync Transactions in batch (filtering out any deleted items)
    for (const tx of data.transactions) {
      if (deletedSet.has(tx.id)) continue;
      const txRef = doc(db, 'users', userId, 'transactions', tx.id);
      await setDoc(
        txRef,
        {
          ...tx,
          userId,
          createdAt: tx.createdAt || new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // 5. Sync Recurring Rules
    for (const rule of data.recurringRules) {
      if (deletedSet.has(rule.id)) continue;
      const ruleRef = doc(db, 'users', userId, 'recurringRules', rule.id);
      await setDoc(
        ruleRef,
        {
          ...rule,
          userId,
        },
        { merge: true }
      );
    }

    // 6. Delete any deleted items from cloud to ensure permanent exclusion
    if (data.deletedItemIds && data.deletedItemIds.length > 0) {
      for (const delId of data.deletedItemIds) {
        // Asynchronously delete from all candidate collections without throwing
        deleteDoc(doc(db, 'users', userId, 'transactions', delId)).catch(() => {});
        deleteDoc(doc(db, 'users', userId, 'categories', delId)).catch(() => {});
        deleteDoc(doc(db, 'users', userId, 'recurringRules', delId)).catch(() => {});
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Fetch all cloud data for a user with automatic restoration of profile, Pix, and Biometrics
 */
export async function fetchUserDataFromCloud(userId: string): Promise<UserCloudData | null> {
  if (!userId) return null;

  try {
    // 1. Fetch User Main Document ('users/{userId}')
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    const userData = userDocSnap.exists() ? userDocSnap.data() : null;

    // 2. Fetch Profile Subcollection
    const profileSnap = await getDoc(doc(db, 'users', userId, 'profile', 'current'));
    const profileSubData = profileSnap.exists() ? (profileSnap.data() as UserProfile) : undefined;

    let userProfile: UserProfile | undefined = undefined;
    if (userData?.name || profileSubData?.name) {
      userProfile = {
        name: userData?.name || profileSubData?.name || 'Usuário',
        managerName: userData?.managerName || profileSubData?.managerName || userData?.name || 'Usuário',
        login: userData?.login || profileSubData?.login || '@usuario',
        pixKey: userData?.pixKey || profileSubData?.pixKey || '',
        avatarUrl: userData?.avatarUrl || profileSubData?.avatarUrl || '',
        avatarColor: userData?.avatarColor || profileSubData?.avatarColor || '#7dd3fc',
        bio: userData?.bio || profileSubData?.bio || '',
        joinedDate: userData?.joinedDate || profileSubData?.joinedDate || 'Setembro 2026',
        themeColor: userData?.themeColor || profileSubData?.themeColor,
      };
    }

    const security: UserSecurityCloudData | undefined = userData?.security || undefined;
    const deletedItemIds: string[] = Array.isArray(userData?.deletedItemIds) ? userData.deletedItemIds : [];
    const deletedSet = new Set(deletedItemIds);

    // 3. Fetch Budgets
    const budgetSnap = await getDoc(doc(db, 'users', userId, 'budgetConfig', 'current'));
    const budgetConfig = budgetSnap.exists() ? budgetSnap.data() : null;

    // 4. Fetch Categories
    const catSnaps = await getDocs(collection(db, 'users', userId, 'categories'));
    const fetchedCategories: Category[] = [];
    catSnaps.forEach((docSnap) => {
      const c = docSnap.data() as Category;
      if (!deletedSet.has(c.id)) {
        fetchedCategories.push(c);
      } else {
        // Item was marked as deleted: remove from cloud permanently
        deleteDoc(docSnap.ref).catch(() => {});
      }
    });

    // 5. Fetch Transactions
    const txSnaps = await getDocs(collection(db, 'users', userId, 'transactions'));
    const fetchedTransactions: Transaction[] = [];
    txSnaps.forEach((docSnap) => {
      const t = docSnap.data() as Transaction;
      if (!deletedSet.has(t.id)) {
        fetchedTransactions.push(t);
      } else {
        // Item was marked as deleted: remove from cloud permanently
        deleteDoc(docSnap.ref).catch(() => {});
      }
    });

    // 6. Fetch Recurring Rules
    const ruleSnaps = await getDocs(collection(db, 'users', userId, 'recurringRules'));
    const fetchedRules: RecurringExpenseRule[] = [];
    ruleSnaps.forEach((docSnap) => {
      const r = docSnap.data() as RecurringExpenseRule;
      if (!deletedSet.has(r.id)) {
        fetchedRules.push(r);
      } else {
        // Item was marked as deleted: remove from cloud permanently
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
  }
}

/**
 * Delete a transaction directly from the cloud
 */
export async function deleteTransactionFromCloud(userId: string, transactionId: string): Promise<void> {
  if (!userId || !transactionId) return;
  try {
    const txRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(txRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions/${transactionId}`);
  }
}

/**
 * Delete a category directly from the cloud
 */
export async function deleteCategoryFromCloud(userId: string, categoryId: string): Promise<void> {
  if (!userId || !categoryId) return;
  try {
    const catRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/categories/${categoryId}`);
  }
}

/**
 * Delete a recurring rule directly from the cloud
 */
export async function deleteRecurringRuleFromCloud(userId: string, ruleId: string): Promise<void> {
  if (!userId || !ruleId) return;
  try {
    const ruleRef = doc(db, 'users', userId, 'recurringRules', ruleId);
    await deleteDoc(ruleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/recurringRules/${ruleId}`);
  }
}

/**
 * Save user profile and security credentials directly to users/{userId}
 */
export async function saveProfileAndSecurityToCloud(
  userId: string,
  profile: UserProfile,
  security?: UserSecurityCloudData
): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
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
 * Clear all transactions in cloud for user
 */
export async function clearAllTransactionsFromCloud(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const txSnaps = await getDocs(collection(db, 'users', userId, 'transactions'));
    const batch = writeBatch(db);
    txSnaps.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const ruleSnaps = await getDocs(collection(db, 'users', userId, 'recurringRules'));
    ruleSnaps.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions`);
  }
}

