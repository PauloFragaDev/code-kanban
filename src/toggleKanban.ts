import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { buildInitialKanban } from './buildInitialKanban';
import { ensureGitignoreEntry } from './ensureGitignoreEntry';
import { type PanelBoardViewProvider } from './panelBoardView';

const DEFAULT_FILENAME = '.todo.kanban';
const CUSTOM_EDITOR_VIEW_TYPE = 'code-kanban.edit';
const PANEL_VIEW_FOCUS_COMMAND = 'code-kanban.panel-view.focus';

export async function toggleKanban(panelProvider: PanelBoardViewProvider): Promise<void> {
  const mode =
    vscode.workspace.getConfiguration().get<'shortcut' | 'panel'>('code-kanban.activity-bar-mode') ?? 'shortcut';

  if (mode === 'panel') {
    await togglePanelView(panelProvider);
    return;
  }

  await toggleEditorFile();
}

async function togglePanelView(panelProvider: PanelBoardViewProvider): Promise<void> {
  if (panelProvider.isVisible) {
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    return;
  }

  await vscode.commands.executeCommand(PANEL_VIEW_FOCUS_COMMAND);
}

async function toggleEditorFile(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0];
  if (!root) {
    await vscode.window.showWarningMessage('Open a folder or workspace to use Code Kanban.');
    return;
  }

  const target = vscode.Uri.joinPath(root.uri, DEFAULT_FILENAME);

  const exists = await fileExists(target);
  if (!exists) {
    await runAutoCreationFlow(target, root.uri.fsPath);
    return;
  }

  const openTab = findOpenTab(target);
  await (openTab
    ? vscode.window.tabGroups.close(openTab)
    : vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE));
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function findOpenTab(uri: vscode.Uri): vscode.Tab | undefined {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const { input } = tab;
      if (
        input instanceof vscode.TabInputCustom &&
        input.viewType === CUSTOM_EDITOR_VIEW_TYPE &&
        input.uri.toString() === uri.toString()
      ) {
        return tab;
      }
    }
  }

  return undefined;
}

async function runAutoCreationFlow(target: vscode.Uri, workspaceRoot: string): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const addToGitignore = config.get<boolean>('code-kanban.gitignore-todo') ?? true;

  const detail = addToGitignore
    ? '`*.kanban` will be added to `.gitignore` so personal to-dos stay out of source control. You can change this in Settings (`code-kanban.gitignore-todo`).'
    : 'The file will be tracked by git. You can change this in Settings (`code-kanban.gitignore-todo`).';

  const choice = await vscode.window.showInformationMessage(
    'No kanban found in this workspace. Create .todo.kanban at the root?',
    { modal: true, detail },
    'Create'
  );

  if (choice === undefined) {
    return; // User cancelled
  }

  const defaultLists = config.get<string[]>('code-kanban.default-lists') ?? [];
  const initialKanban = buildInitialKanban(defaultLists);
  const payload = Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8');

  await vscode.workspace.fs.writeFile(target, payload);

  if (addToGitignore) {
    await ensureGitignoreEntry(workspaceRoot, '*.kanban');
  }

  await vscode.commands.executeCommand('vscode.openWith', target, CUSTOM_EDITOR_VIEW_TYPE);
}
