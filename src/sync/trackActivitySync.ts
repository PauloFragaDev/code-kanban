import * as vscode from 'vscode';
import { type Kanban, type Card, type Label, fromJson, toJson } from '../kanban/models/kanban';
import { uuid } from '../kanban/utils';

/**
 * Sincronización opcional con trackActivity (https://github.com/PauloFragaDev/trackActivity).
 *
 * El usuario configura URL base y un Bearer token en los settings de la
 * extensión. Al sincronizar, mandamos el estado completo del kanban del
 * workspace abierto y aplicamos al archivo la respuesta del servidor.
 *
 * El servidor identifica el proyecto a partir del `workspace_path` (via
 * ProjectMapping de trackActivity). Si no hay mapping, devuelve 422 y se
 * muestra un mensaje claro al usuario.
 */

type ServerCard = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  labels?: Array<{ title: string; color?: string }>;
  updated_at?: string;
};

type ServerList = { title: string; cards: ServerCard[] };

type ServerResponseOk = {
  project: { id: number; code: string; name: string; color: string };
  applied_at: string;
  lists: ServerList[];
  errors: string[];
  stats: { created: number; updated_local: number; kept_server: number; archived: number };
};

type ServerResponseErr = {
  error: string;
  message?: string;
};

export type SyncOutcome =
  | { kind: 'disabled'; reason: string }
  | { kind: 'no-workspace' }
  | { kind: 'http-error'; status: number; body: string }
  | { kind: 'no-mapping'; message: string }
  | { kind: 'transport-error'; message: string }
  | { kind: 'ok'; result: ServerResponseOk; kanban: Kanban };

function readConfig(): { url: string; token: string; autoOnSave: boolean } {
  const cfg = vscode.workspace.getConfiguration();
  return {
    url:        (cfg.get<string>('code-kanban.sync.trackactivity-url') ?? '').trim().replace(/\/+$/, ''),
    token:      (cfg.get<string>('code-kanban.sync.token') ?? '').trim(),
    autoOnSave:  cfg.get<boolean>('code-kanban.sync.auto-on-save') ?? false,
  };
}

/** ¿Hay configuración suficiente para que la sync intente correr? */
export function isSyncConfigured(): boolean {
  const { url, token } = readConfig();
  return url.length > 0 && token.length > 0;
}

export function isAutoOnSaveEnabled(): boolean {
  return isSyncConfigured() && readConfig().autoOnSave;
}

/** Live-pull (SSE) activado por config y con sync configurada. */
export function isLivePullEnabled(): boolean {
  if (!isSyncConfigured()) return false;
  return vscode.workspace.getConfiguration().get<boolean>('code-kanban.sync.live-pull') ?? false;
}

/** Devuelve url + token para abrir el stream sin volver a parsear settings. */
export function getSyncCredentials(): { url: string; token: string } {
  const { url, token } = readConfig();
  return { url, token };
}

/**
 * Convierte el modelo local de la extensión al payload que espera
 * `POST /api/sync/kanban` en trackActivity.
 */
function kanbanToPayload(workspacePath: string, clientUpdatedAt: Date, kanban: Kanban): unknown {
  return {
    workspace_path:    workspacePath,
    client_updated_at: clientUpdatedAt.toISOString(),
    lists: kanban.lists.map((list) => ({
      title: list.title,
      cards: list.cards.map((card: Card) => ({
        id:          card.id,
        title:       card.title,
        description: card.description ?? null,
        due_date:    card.dueDate instanceof Date && !isNaN(card.dueDate.getTime())
          ? card.dueDate.toISOString().slice(0, 10)
          : null,
        labels: (card.labels ?? []).map((l: Label) => ({ title: l.title, color: l.color })),
      })),
    })),
  };
}

/**
 * Convierte la respuesta del servidor al modelo Kanban local, preservando
 * lo que existe (archivo, settings.labels locales) y reescribiendo solo las
 * lists/cards. Los labels nuevos del server se añaden al catálogo local.
 */
function applyServerResponse(current: Kanban, response: ServerResponseOk): Kanban {
  // Catálogo combinado de labels: respetamos los existentes y añadimos los
  // que vienen del server por título (case-insensitive).
  const labelByTitle = new Map<string, Label>();
  for (const lab of current.settings.labels ?? []) {
    labelByTitle.set(lab.title.toLowerCase(), lab);
  }
  for (const list of response.lists) {
    for (const card of list.cards) {
      for (const l of card.labels ?? []) {
        const key = l.title.toLowerCase();
        if (!labelByTitle.has(key)) {
          labelByTitle.set(key, {
            id:    uuid(),
            title: l.title,
            // El cast es seguro: si el server entrega algo inesperado el
            // decoder lo aceptará si es hex válido y si no, el fromJson
            // posterior lo rechazaría — aquí ya escribimos el archivo.
            color: ((l.color ?? '#9CA3AF') as Label['color']),
          });
        }
      }
    }
  }
  const labels = [...labelByTitle.values()];

  // Mapa rápido título-de-label → id local para reusar IDs cuando coinciden.
  const labelIdByTitle = new Map<string, string>(
    labels.map((l) => [l.title.toLowerCase(), l.id])
  );

  // Mantener los IDs de columnas si los títulos coinciden con los actuales,
  // así no se invalidan referencias salvadas en el archivo.
  const localListByTitle = new Map<string, (typeof current.lists)[number]>(
    current.lists.map((l) => [l.title.toLowerCase(), l])
  );

  const lists = response.lists.map((srvList) => {
    const local = localListByTitle.get(srvList.title.toLowerCase());
    const listId = local?.id ?? uuid();
    return {
      id:    listId,
      title: srvList.title,
      color: local?.color,
      cards: srvList.cards.map((c) => ({
        id:          c.id,
        listId,
        title:       c.title,
        description: c.description ?? '',
        dueDate:     c.due_date ? new Date(c.due_date + 'T00:00:00Z') : undefined,
        labels: (c.labels ?? []).flatMap((l) => {
          const id = labelIdByTitle.get(l.title.toLowerCase());
          if (!id) return [];
          const found = labels.find((x) => x.id === id);
          return found ? [found] : [];
        }),
        checkboxes: [],
        comments:   [],
      })),
    };
  });

  return {
    lists,
    archive: current.archive,        // archivo local intacto
    settings: { labels },
  };
}

/**
 * Ejecuta una sync: lee el `.kanban` del workspace, lo envía al servidor
 * y devuelve el resultado. NO escribe el archivo — el caller decide cuándo
 * persistir para no entrar en un loop con `onDidSaveTextDocument`.
 */
export async function syncKanban(document: vscode.TextDocument): Promise<SyncOutcome> {
  const { url, token } = readConfig();
  if (!url || !token) {
    return { kind: 'disabled', reason: 'Configure code-kanban.sync.trackactivity-url and code-kanban.sync.token.' };
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return { kind: 'no-workspace' };
  }

  let kanban: Kanban;
  try {
    kanban = await fromJson(document.getText());
  } catch (err) {
    return { kind: 'transport-error', message: `Local kanban is not valid JSON: ${String(err)}` };
  }

  // `client_updated_at` debe reflejar cuándo se editó realmente el archivo
  // en disco — no `new Date()` (que sería "ahora" y haría que el cliente
  // gane siempre el conflicto, sobreescribiendo cambios hechos en el server
  // entre syncs). Usamos el mtime del filesystem. Si VS Code tiene el
  // documento "dirty" sin guardar, igualmente el mtime del disco es la
  // verdad — ese cambio se llevará tras el siguiente save.
  let clientUpdatedAt: Date;
  try {
    const stat = await vscode.workspace.fs.stat(document.uri);
    clientUpdatedAt = new Date(stat.mtime);
  } catch {
    // Fallback prudente: si no podemos leer el mtime, asumimos "ahora".
    clientUpdatedAt = new Date();
  }
  const payload = kanbanToPayload(workspaceFolder.uri.fsPath, clientUpdatedAt, kanban);

  let res: Response;
  try {
    res = await fetch(`${url}/api/sync/kanban`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return { kind: 'transport-error', message: String(err) };
  }

  if (res.status === 422) {
    const body = await res.json().catch(() => ({})) as ServerResponseErr;
    return { kind: 'no-mapping', message: body.message ?? 'No project mapping for this workspace.' };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { kind: 'http-error', status: res.status, body };
  }

  const result = (await res.json()) as ServerResponseOk;
  const merged = applyServerResponse(kanban, result);
  return { kind: 'ok', result, kanban: merged };
}

/**
 * Escribe el Kanban resuelto al documento. Hace edit + save explícitos
 * para que el cambio entre por el flujo normal del editor.
 */
export async function writeKanbanToDocument(document: vscode.TextDocument, kanban: Kanban): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  const range = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  );
  edit.replace(document.uri, range, toJson(kanban));
  const applied = await vscode.workspace.applyEdit(edit);
  if (applied) {
    await document.save();
  }
  return applied;
}

/**
 * Toast resumen tras una sync. Diferencia claramente entre OK, configuración
 * faltante, error de mapping y errores HTTP/red.
 */
export function reportOutcome(outcome: SyncOutcome): void {
  switch (outcome.kind) {
    case 'disabled':
      vscode.window.showWarningMessage(`Code Kanban sync is disabled. ${outcome.reason}`);
      return;
    case 'no-workspace':
      vscode.window.showWarningMessage('Code Kanban sync: open a folder/workspace first.');
      return;
    case 'no-mapping':
      vscode.window.showErrorMessage(`Code Kanban sync: ${outcome.message}`);
      return;
    case 'http-error':
      vscode.window.showErrorMessage(`Code Kanban sync HTTP ${outcome.status}: ${outcome.body.slice(0, 200)}`);
      return;
    case 'transport-error':
      vscode.window.showErrorMessage(`Code Kanban sync transport error: ${outcome.message}`);
      return;
    case 'ok': {
      const s = outcome.result.stats;
      const errors = outcome.result.errors ?? [];
      const parts = [
        `Synced with ${outcome.result.project.code}`,
        `+${s.created} created`,
        `~${s.updated_local} updated`,
        `=${s.kept_server} kept`,
        `−${s.archived} archived`,
      ];
      if (errors.length > 0) {
        vscode.window.showWarningMessage(`${parts.join(' · ')} (${errors.length} warning${errors.length === 1 ? '' : 's'})`);
      } else {
        vscode.window.showInformationMessage(parts.join(' · '));
      }
    }
  }
}
