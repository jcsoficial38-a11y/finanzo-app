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

export interface UserCloudData {
  transactions: Transaction[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  budgets: Record<string, number>;
  defaultBudget: number;
  categoryBudgets: Record<string, number>;
  userProfile?: UserProfile;
  recurringRules: RecurringExpenseRule[];
}

/**
 * Save all transactions and settings to cloud for a specific user
 */
export async function syncUserDataToCloud(userId: string, data: UserCloudData): Promise<void> {
  if (!userId) return;

  try {
    // 1. Sync User Profile
    if (data.userProfile) {
      const profileRef = doc(db, 'users', userId, 'profile', 'current');
      await setDoc(
        profileRef,
        {
          userId,
          name: data.userProfile.name,
          login: data.userProfile.login,
          avatarUrl: data.userProfile.avatarUrl || '',
          avatarColor: data.userProfile.avatarColor || '#7dd3fc',
          bio: data.userProfile.bio || '',
          joinedDate: data.userProfile.joinedDate,
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

    // 3. Batch sync categories
    const allCategories = [...data.incomeCategories, ...data.expenseCategories];
    if (allCategories.length > 0) {
      for (const cat of allCategories) {
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
    }

    // 4. Sync Transactions in batch
    for (const tx of data.transactions) {
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Fetch all cloud data for a user
 */
export async function fetchUserDataFromCloud(userId: string): Promise<UserCloudData | null> {
  if (!userId) return null;

  try {
    // 1. Fetch Profile
    const profileSnap = await getDoc(doc(db, 'users', userId, 'profile', 'current'));
    const profileData = profileSnap.exists() ? (profileSnap.data() as UserProfile) : undefined;

    // 2. Fetch Budgets
    const budgetSnap = await getDoc(doc(db, 'users', userId, 'budgetConfig', 'current'));
    const budgetConfig = budgetSnap.exists() ? budgetSnap.data() : null;

    // 3. Fetch Categories
    const catSnaps = await getDocs(collection(db, 'users', userId, 'categories'));
    const fetchedCategories: Category[] = [];
    catSnaps.forEach((docSnap) => {
      fetchedCategories.push(docSnap.data() as Category);
    });

    // 4. Fetch Transactions
    const txSnaps = await getDocs(collection(db, 'users', userId, 'transactions'));
    const fetchedTransactions: Transaction[] = [];
    txSnaps.forEach((docSnap) => {
      fetchedTransactions.push(docSnap.data() as Transaction);
    });

    // 5. Fetch Recurring Rules
    const ruleSnaps = await getDocs(collection(db, 'users', userId, 'recurringRules'));
    const fetchedRules: RecurringExpenseRule[] = [];
    ruleSnaps.forEach((docSnap) => {
      fetchedRules.push(docSnap.data() as RecurringExpenseRule);
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
      userProfile: profileData,
      recurringRules: fetchedRules,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

/**
 * Delete a transaction from the cloud
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
