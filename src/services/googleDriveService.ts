/**
 * SERVIÇO DE SINCRONIZAÇÃO AUTOMÁTICA VIA GOOGLE DRIVE API (appDataFolder)
 * 
 * Funcionalidades:
 * 1. Salva automaticamente em segundo plano o arquivo 'backup_app.json' na pasta oculta do app (appDataFolder).
 * 2. Restaura automaticamente todos os lançamentos, despesas e dados de perfil ao fazer login.
 * 3. Suporte offline total: grava localmente e sincroniza assim que a conexão retornar.
 * 4. Independente de banco de dados compartilhado (dados privados no Drive do usuário).
 */

export interface GoogleDriveBackupPayload {
  version: string;
  updatedAt: string;
  transactions: any[];
  incomeCategories: any[];
  expenseCategories: any[];
  budgets: Record<string, number>;
  defaultBudget: number;
  categoryBudgets: Record<string, number>;
  monthlyIncomes?: Record<string, number>;
  defaultIncome?: number;
  userProfile?: any;
  recurringRules: any[];
  trashTransactions?: any[];
  deletedItemIds?: string[];
  security?: any;
}

// Token de acesso mantido em memória (conforme diretrizes de segurança)
let inMemoryAccessToken: string | null = null;
let cachedFileId: string | null = null;

export function setGoogleDriveAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getGoogleDriveAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function clearGoogleDriveAccessToken(): void {
  inMemoryAccessToken = null;
  cachedFileId = null;
}

/**
 * Localiza o arquivo 'backup_app.json' na pasta oculta do aplicativo (appDataFolder)
 */
export async function findAppDataBackupFile(
  accessToken: string
): Promise<{ id: string; name: string; modifiedTime?: string } | null> {
  if (!accessToken) return null;

  try {
    const query = encodeURIComponent("name = 'backup_app.json' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)&pageSize=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearGoogleDriveAccessToken();
        throw new Error('UNAUTHORIZED');
      }
      const errText = await res.text().catch(() => '');
      console.warn('[GoogleDrive] Falha ao consultar appDataFolder:', res.status, errText);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      cachedFileId = data.files[0].id;
      return data.files[0];
    }

    return null;
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') throw err;
    console.warn('[GoogleDrive] Erro na busca de backup:', err);
    return null;
  }
}

/**
 * Baixa e decodifica o conteúdo JSON do backup na pasta oculta do Google Drive
 */
export async function downloadAppDataBackup(
  accessToken: string,
  fileId: string
): Promise<GoogleDriveBackupPayload | null> {
  if (!accessToken || !fileId) return null;

  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearGoogleDriveAccessToken();
        throw new Error('UNAUTHORIZED');
      }
      console.warn('[GoogleDrive] Falha ao baixar backup:', res.status);
      return null;
    }

    const json = await res.json();
    return json as GoogleDriveBackupPayload;
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') throw err;
    console.warn('[GoogleDrive] Erro ao ler dados do backup:', err);
    return null;
  }
}

/**
 * Salva ou atualiza silenciosamente o arquivo 'backup_app.json' no Google Drive (appDataFolder)
 */
export async function uploadAppDataBackup(
  accessToken: string,
  payload: GoogleDriveBackupPayload,
  knownFileId?: string | null
): Promise<{ id: string; success: boolean }> {
  if (!accessToken) {
    throw new Error('Sem token de autenticação do Google Drive.');
  }

  let fileId = knownFileId || cachedFileId;

  // Se não temos o ID em cache, verifica se o arquivo já existe no appDataFolder
  if (!fileId) {
    const existing = await findAppDataBackupFile(accessToken);
    if (existing?.id) {
      fileId = existing.id;
    }
  }

  const jsonContent = JSON.stringify(payload, null, 2);

  // 1. Se o arquivo já existe, faz atualização direta de mídia (PATCH)
  if (fileId) {
    try {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const patchRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: jsonContent,
      });

      if (patchRes.ok) {
        cachedFileId = fileId;
        return { id: fileId, success: true };
      }

      if (patchRes.status === 401) {
        clearGoogleDriveAccessToken();
        throw new Error('UNAUTHORIZED');
      }

      // Se o arquivo tiver sido removido remotamente (404), limpa e recria
      if (patchRes.status === 404) {
        fileId = null;
        cachedFileId = null;
      }
    } catch (patchErr: any) {
      if (patchErr.message === 'UNAUTHORIZED') throw patchErr;
      fileId = null;
    }
  }

  // 2. Cria novo arquivo no appDataFolder usando upload multipart (metadados + conteúdo)
  const boundary = 'FINANZO_DRIVE_BACKUP_BOUNDARY_994';
  const metadata = JSON.stringify({
    name: 'backup_app.json',
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  });

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${jsonContent}\r\n` +
    `--${boundary}--`;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!createRes.ok) {
    if (createRes.status === 401) {
      clearGoogleDriveAccessToken();
      throw new Error('UNAUTHORIZED');
    }
    const errText = await createRes.text().catch(() => '');
    throw new Error(`Falha ao criar backup_app.json no Google Drive: ${createRes.status} ${errText}`);
  }

  const createData = await createRes.json();
  cachedFileId = createData.id;
  return { id: createData.id, success: true };
}
