import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { KanbanEditorProvider } from './kanbanEditor';
import { buildInitialKanban } from './buildInitialKanban';
import { toggleKanban } from './toggleKanban';
import { PanelBoardViewProvider } from './panelBoardView';
import { ShortcutBounceViewProvider } from './shortcutBounceView';
import {
  getSyncCredentials,
  isAutoOnSaveEnabled,
  isLivePullEnabled,
  reportOutcome,
  syncKanban,
  writeKanbanToDocument,
} from './sync/trackActivitySync';
import { openKanbanStream, type StreamCloser } from './sync/streamSync';

// Output channel para diagnóstico del live-pull. Accesible en VS Code via
// View → Output → "Code Kanban Sync".
const syncOutput = vscode.window.createOutputChannel('Code Kanban Sync');
// Expuesto globalmente para que streamSync.ts pueda escribir sin tener que
// pasarse el canal como dependencia explícita por cada llamada.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__codeKanbanLog__ = syncOutput;

export function activate(context: vscode.ExtensionContext) {
  const kanbanWatcher = vscode.workspace.createFileSystemWatcher('**/*.kanban');
  const panelBoardProvider = new PanelBoardViewProvider(context, kanbanWatcher);

  // Marca URIs cuya escritura nace de la propia sync, para que el hook
  // `onDidSaveTextDocument` no entre en bucle.
  const syncing = new Set<string>();

  const runSyncOn = async (doc: vscode.TextDocument): Promise<void> => {
    const outcome = await syncKanban(doc);
    if (outcome.kind === 'ok') {
      syncing.add(doc.uri.toString());
      try {
        await writeKanbanToDocument(doc, outcome.kanban);
      } finally {
        syncing.delete(doc.uri.toString());
      }
    }
    reportOutcome(outcome);
  };

  context.subscriptions.push(
    KanbanEditorProvider.register(context),
    vscode.commands.registerCommand('code-kanban.new', async () => {
      const fileInfos = await vscode.window.showSaveDialog({
        saveLabel: 'Create kanban',
        filters: {
          Kanban: ['kanban'],
        },
      });
      if (!fileInfos?.path.endsWith('.kanban')) {
        return;
      }

      try {
        const defaultLists = vscode.workspace.getConfiguration().get<string[]>('code-kanban.default-lists') ?? [];
        const initialKanban = buildInitialKanban(defaultLists);
        const kanbanJson = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(fileInfos, kanbanJson);
        await vscode.commands.executeCommand('vscode.openWith', fileInfos, 'code-kanban.edit');
      } catch (error) {
        await vscode.window.showErrorMessage(`Cannot create file "${fileInfos.toString()}`);
        console.error('Cannot create file', error);
      }
    }),
    vscode.commands.registerCommand('code-kanban.toggle', () => toggleKanban(panelBoardProvider)),
    vscode.commands.registerCommand('code-kanban.sync-now', async () => {
      const editor = vscode.window.activeTextEditor;
      const doc =
        editor?.document.fileName.endsWith('.kanban')
          ? editor.document
          : vscode.workspace.textDocuments.find((d) => d.fileName.endsWith('.kanban'));
      if (!doc) {
        await vscode.window.showWarningMessage('Open a .kanban file to sync it with trackActivity.');
        return;
      }
      await runSyncOn(doc);
    }),
    // Auto-sync al guardar (opcional según setting).
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (!doc.fileName.endsWith('.kanban')) return;
      if (!isAutoOnSaveEnabled()) return;
      if (syncing.has(doc.uri.toString())) return;

      const outcome = await syncKanban(doc);
      if (outcome.kind === 'ok') {
        syncing.add(doc.uri.toString());
        try {
          await writeKanbanToDocument(doc, outcome.kanban);
        } finally {
          syncing.delete(doc.uri.toString());
        }
      } else if (outcome.kind !== 'disabled') {
        // Sin configurar no espameamos el toast en cada save.
        reportOutcome(outcome);
      }
    })
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(checklist) Code Kanban';
  statusBarItem.tooltip = 'Toggle Code Kanban (Ctrl+Alt+K)';
  statusBarItem.command = 'code-kanban.toggle';
  const syncStatusBar = () => {
    const config = vscode.workspace.getConfiguration();
    const mode = config.get<'shortcut' | 'panel'>('code-kanban.activity-bar-mode') ?? 'shortcut';
    const shortcutLocation =
      config.get<'status-bar' | 'activity-bar'>('code-kanban.shortcut-mode.button-location') ?? 'status-bar';
    // Status bar shows whenever the button isn't anchored to the activity bar.
    // In panel mode the activity-bar icon is always present, but the status-bar button
    // is still useful as an alternative entry point.
    const hideStatusBar = mode === 'shortcut' && shortcutLocation === 'activity-bar';
    if (hideStatusBar) {
      statusBarItem.hide();
    } else {
      statusBarItem.show();
    }
  };
  syncStatusBar();
  context.subscriptions.push(
    statusBarItem,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('code-kanban.activity-bar-mode') ||
        e.affectsConfiguration('code-kanban.shortcut-mode.button-location')
      ) {
        syncStatusBar();
      }
    })
  );

  const shortcutBounceProvider = new ShortcutBounceViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('code-kanban.shortcut-view', shortcutBounceProvider)
  );

  context.subscriptions.push(
    kanbanWatcher,
    vscode.window.registerWebviewViewProvider('code-kanban.panel-view', panelBoardProvider)
  );

  // ─── Live pull (SSE) ──────────────────────────────────────────────
  //
  // Por cada documento `.kanban` abierto, mantenemos un stream al server.
  // Cuando el server emite `change`, lanzamos una sync para que el cliente
  // tire del estado nuevo. Cierre limpio al cerrar el documento.
  //
  // Reactivo a cambios de configuración: si activas/desactivas la opción
  // o tocas URL/token, los streams se reinician.
  const streams = new Map<string, StreamCloser>();

  const openStreamFor = (doc: vscode.TextDocument): void => {
    if (!doc.fileName.endsWith('.kanban')) {
      return;
    }
    if (!isLivePullEnabled()) {
      syncOutput.appendLine(`[live-pull] skipped (disabled or not configured): ${doc.fileName}`);
      return;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!workspaceFolder) {
      syncOutput.appendLine(`[live-pull] skipped (no workspace folder): ${doc.fileName}`);
      return;
    }
    const key = doc.uri.toString();
    if (streams.has(key)) {
      syncOutput.appendLine(`[live-pull] already streaming ${key}`);
      return;
    }
    syncOutput.appendLine(`[live-pull] starting stream for workspace ${workspaceFolder.uri.fsPath}`);

    const { url, token } = getSyncCredentials();
    const close = openKanbanStream(
      { url, token, workspacePath: workspaceFolder.uri.fsPath },
      {
        onChange: async () => {
          // El server vio updated_at más nuevo: tiramos del estado.
          const outcome = await syncKanban(doc);
          if (outcome.kind === 'ok') {
            await writeKanbanToDocument(doc, outcome.kanban);
          } else if (outcome.kind !== 'disabled') {
            reportOutcome(outcome);
          }
        },
        onError: (message) => {
          // Si el stream falla por un error duro (401/422), aviso una vez.
          vscode.window.showWarningMessage(message);
          const closer = streams.get(key);
          closer?.();
          streams.delete(key);
        },
      },
    );
    streams.set(key, close);
  };

  const closeStreamFor = (doc: vscode.TextDocument): void => {
    const key = doc.uri.toString();
    const closer = streams.get(key);
    if (closer) {
      closer();
      streams.delete(key);
    }
  };

  const closeAllStreams = (): void => {
    for (const closer of streams.values()) closer();
    streams.clear();
  };

  // Engancha los .kanban ya abiertos al activarse la extensión.
  for (const doc of vscode.workspace.textDocuments) {
    openStreamFor(doc);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => openStreamFor(doc)),
    vscode.workspace.onDidCloseTextDocument((doc) => closeStreamFor(doc)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      // Cualquier cambio en URL/token/live-pull reinicia los streams.
      const touched =
        e.affectsConfiguration('code-kanban.sync.trackactivity-url') ||
        e.affectsConfiguration('code-kanban.sync.token') ||
        e.affectsConfiguration('code-kanban.sync.live-pull');
      if (!touched) return;
      closeAllStreams();
      if (isLivePullEnabled()) {
        for (const doc of vscode.workspace.textDocuments) openStreamFor(doc);
      }
    }),
    // Cleanup al desactivar la extensión.
    { dispose: closeAllStreams } as vscode.Disposable,
  );
}
