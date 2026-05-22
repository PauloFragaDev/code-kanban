# Code Kanban

> Simple, hackable kanban for VSCode.

Personal to-do boards that live alongside your code. Toggle them open with one keystroke, drag cards while you think, and keep everything in a `.kanban` JSON file that ships with your repo (or stays out of it).

![Code Kanban hero shot](./media/hero.png)
<!-- TODO: hero.png — board open in main editor, light theme, ~3 columns with cards + at least one card with a label and a due date. 1600x900 ideally. -->

---

## Why

- **No accounts, no sync, no service.** Boards are plain JSON files in your workspace.
- **Two modes for two moods.** A keyboard-driven toggle when you just want to capture a thought, or a sidebar panel when you want the board next to your code while you work.
- **Customisable, not bloated.** Per-column colours, configurable default lists, configurable card density. Settings, not menus.
- **Native VSCode look.** Follows your theme (light, dark, system) and reuses VSCode tokens for surfaces and text.

## Features at a glance

### One-click toggle from the status bar

`Ctrl+Alt+K` (or `Cmd+Alt+K`) opens or closes your project's `.todo.kanban` in the main editor. There's also a status-bar button if you prefer the mouse. No sidebar, no flash — just the file opens.

![Status-bar toggle](./media/status-bar-toggle.png)
<!-- TODO: status-bar-toggle.png — close-up of the bottom status bar showing the "$(checklist) Code Kanban" item. Crop tight. -->

### Vertical board in the sidebar

Switch `code-kanban.activity-bar-mode` to `panel` and the activity-bar icon opens a compact vertical board in the sidebar. Glance, drag, add — without leaving the file you're editing.

![Sidebar panel mode](./media/sidebar-panel.png)
<!-- TODO: sidebar-panel.png — sidebar open with the vertical board, a couple of lists visible with cards. Light theme. -->

### Per-column colours

Pick a colour for any list from its menu — 8 presets that match the brand palette. The accent shows up on the column header, the card-selection border in the sidebar, and the inline "Add card" input.

![Per-column color picker](./media/color-picker.png)
<!-- TODO: color-picker.png — kanban board with the kebab menu open on one column, the Color popup visible with the 8 swatches. -->

### Rich card editor

Click a card to open the full editor: description (Markdown), labels, due date, task list with progress bar, and threaded comments. Everything saves to disk as you type — no "did you want to save?" dialog when you close the tab.

![Edit card modal](./media/edit-card.png)
<!-- TODO: edit-card.png — the EditCard modal open with a description, a label, a due date and a couple of tasks. -->

### Dark mode and theme awareness

Pick `light`, `dark`, or `system`. In `system` the kanban canvas pulls from your VSCode editor background, so it always matches the rest of the workbench.

![Dark mode](./media/dark-mode.png)
<!-- TODO: dark-mode.png — same board as the hero, but in dark theme. Shows the lime / blue / amber accents holding up on dark surfaces. -->

---

## Install

From VS Code:

1. Open Extensions (`Ctrl+Shift+X`)
2. Search for **Code Kanban**
3. Install

From the command line:

```bash
code --install-extension marcover9000.code-kanban
```

## Quick start

1. Press `Ctrl+Alt+K` in any workspace. A dialog will offer to create `.todo.kanban` at the workspace root (with an option to add `*.kanban` to your `.gitignore`).
2. The board opens. Click `+ Add Card` in any list, type a title, press Enter.
3. Drag cards between columns.
4. Click a card to add labels, due date, description, tasks, or comments.

That's it. No tutorial.

## Configuration

All settings live under `code-kanban.*` in VSCode settings.

### Interaction

| Setting | Default | Description |
|---|---|---|
| `code-kanban.activity-bar-mode` | `shortcut` | `shortcut` toggles the file in the main editor. `panel` opens a vertical board in the sidebar. |
| `code-kanban.shortcut-mode.button-location` | `status-bar` | Where the toggle button lives in shortcut mode. `activity-bar` re-enables the lateral icon with a small (~50ms) visible flash. |
| Keyboard shortcut | `Ctrl+Alt+K` / `Cmd+Alt+K` | Rebind in VSCode Keyboard Shortcuts UI. |

### Defaults

| Setting | Default | Description |
|---|---|---|
| `code-kanban.default-lists` | `["Backlog", "To Do", "Doing", "Done"]` | Column titles used when creating a new board. |
| `code-kanban.theme` | `system` | `light`, `dark`, or `system` (follow VSCode). |

### Card density

| Setting | Default | Description |
|---|---|---|
| `code-kanban.show-description` | `true` | First line of the description on cards. |
| `code-kanban.show-task-list` | `true` | Task list summary on cards. |
| `code-kanban.sidebar.show-labels` | `true` | Label pills on cards in the sidebar. |
| `code-kanban.sidebar.show-due-date` | `true` | Due-date icon on cards in the sidebar. |
| `code-kanban.sidebar.show-checkbox-count` | `true` | Checkbox progress (e.g. `3/5`) on cards in the sidebar. |

## File format

Boards are `.kanban` files — plain JSON. Easy to diff, version-control, share, or hand-edit. Per-list color is stored next to the list title; everything else looks like you'd expect.

```jsonc
{
  "lists": [
    { "id": "…", "title": "Backlog", "color": "#9CA3AF", "cards": [/* … */] }
  ],
  "archive": { "lists": [], "cards": [] },
  "settings": { "labels": [/* … */] }
}
```

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Toggle Code Kanban | `Ctrl+Alt+K` / `Cmd+Alt+K` |
| Open command palette | `Ctrl+Shift+P` |
| Confirm inline input | `Enter` |
| Add several cards in one go | `Enter` between titles in the bulk-add input |
| Cancel inline input / close modal | `Escape` |

## Development

Prerequisites: Node.js 22+, VSCode 1.101+.

```bash
git clone https://github.com/marcover9000/code-kanban.git
cd code-kanban
npm install
npm run watch       # webpack watch mode
```

Then open the folder in VSCode and press `F5` to launch an Extension Development Host with the latest build.

Useful scripts:

```bash
npm run build       # one-shot production build
npm run package     # builds the .vsix
npm test            # xo + vitest
```

## Contributing

Issues and PRs welcome at [marcover9000/code-kanban](https://github.com/marcover9000/code-kanban/issues).

If you're proposing a UX change, screenshots of before/after help a lot.

## Roadmap

Loose collection of ideas, not commitments:

- Sync with GitHub Projects / Trello
- Card templates
- Time tracking on cards
- Export to PDF / CSV
- Multi-root workspace support
- Reactive setting refresh (today, theme/density changes need a webview reload)

## License

MIT — see [LICENSE](LICENSE).

Originally based on [harehare/portable-kanban](https://github.com/harehare/portable-kanban) (also MIT). The codebase has since been substantially rewritten — Activity-bar entry points, sidebar panel mode, palette refresh, EditCard polish, configurable defaults — and is now maintained independently as Code Kanban.
