import { Buffer } from 'node:buffer';
import * as vscode from 'vscode';
import { buildInitialKanban } from './buildInitialKanban';
import { ensureGitignoreEntry } from './ensureGitignoreEntry';
import { buildWebviewHtml, readSidebarSettings } from './webviewHtml';

const TARGET_FILENAME = '.todo.kanban';
const COLLAPSE_KEY = 'code-kanban.sidebar.collapsed-lists';

export class PanelBoardViewProvider implements vscode.WebviewViewProvider {
  private currentView: vscode.WebviewView | undefined;

  public get isVisible(): boolean {
    return this.currentView?.visible ?? false;
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    watcher: vscode.FileSystemWatcher
  ) {
    watcher.onDidChange((uri) => {
      void this.onFileEvent(uri);
    });
    watcher.onDidCreate((uri) => {
      void this.onFileEvent(uri);
    });
    watcher.onDidDelete((uri) => {
      void this.onFileEvent(uri);
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.currentView = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };

    const collapsed = this.context.workspaceState.get<Record<string, boolean>>(COLLAPSE_KEY) ?? {};
    const settings = readSidebarSettings();

    view.webview.html = buildWebviewHtml(view.webview, this.context.extensionUri, {
      mode: 'sidebar',
      ...settings,
      collapsedLists: collapsed,
    });

    view.webview.onDidReceiveMessage(async (msg: { [k: string]: unknown; type: string }) => {
      switch (msg.type) {
        case 'load':
        case 'reload': {
          await this.sendUpdate();
          break;
        }

        case 'edit': {
          await this.persistEdit(msg.kanban);
          break;
        }

        case 'set-collapse-state': {
          await this.context.workspaceState.update(COLLAPSE_KEY, msg.collapsedLists);
          break;
        }

        case 'create-todo-kanban': {
          await this.runAutoCreationFlow();
          break;
        }

        case 'open': {
          if (typeof msg.url === 'string') {
            await vscode.env.openExternal(vscode.Uri.parse(msg.url));
          }

          break;
        }

        case 'info-message': {
          if (typeof msg.message === 'string') {
            await vscode.window.showInformationMessage(msg.message);
          }

          break;
        }

        default: {
          break;
        }
      }
    });
  }

  private async onFileEvent(uri: vscode.Uri): Promise<void> {
    if (!uri.path.endsWith(`/${TARGET_FILENAME}`)) return;
    await this.sendUpdate();
  }

  private async sendUpdate(): Promise<void> {
    const view = this.currentView;
    if (!view) return;
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      await view.webview.postMessage({ type: 'update', text: '', title: '' });
      return;
    }

    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    try {
      const bytes = await vscode.workspace.fs.readFile(target);
      await view.webview.postMessage({
        type: 'update',
        text: Buffer.from(bytes).toString('utf8'),
        title: TARGET_FILENAME.replace('.kanban', ''),
      });
    } catch {
      await view.webview.postMessage({ type: 'update', text: '', title: '' });
    }
  }

  private async persistEdit(kanban: unknown): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) return;
    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    const payload = Buffer.from(JSON.stringify(kanban, null, 2), 'utf8');
    await vscode.workspace.fs.writeFile(target, payload);
  }

  private async runAutoCreationFlow(): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root) {
      await vscode.window.showWarningMessage('Open a folder or workspace to use Code Kanban.');
      return;
    }

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
    if (choice === undefined) return;

    const defaultLists = config.get<string[]>('code-kanban.default-lists') ?? [];
    const initialKanban = buildInitialKanban(defaultLists);
    const target = vscode.Uri.joinPath(root.uri, TARGET_FILENAME);
    await vscode.workspace.fs.writeFile(target, Buffer.from(JSON.stringify(initialKanban, null, 2), 'utf8'));

    if (addToGitignore) {
      await ensureGitignoreEntry(root.uri.fsPath, '*.kanban');
    }

    await this.sendUpdate();
  }
}
