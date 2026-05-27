import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { KanbanEditorProvider } from './kanbanEditor';
import { buildInitialKanban } from './buildInitialKanban';
import { toggleKanban } from './toggleKanban';
import { PanelBoardViewProvider } from './panelBoardView';
import { ShortcutBounceViewProvider } from './shortcutBounceView';
import {
  isAutoOnSaveEnabled,
  reportOutcome,
  syncKanban,
  writeKanbanToDocument,
} from './sync/trackActivitySync';

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
}
