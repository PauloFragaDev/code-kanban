# Fork changelog · PauloFragaDev/code-kanban

Changes specific to this fork on top of upstream `marcover9000/code-kanban`.
The fork's purpose is integration with [trackActivity](https://github.com/PauloFragaDev/trackActivity);
the original feature set of code-kanban stays intact and opt-in.

## paulo-trackactivity-sync (May 2026)

### Added
- **Sync with trackActivity** (opt-in). New module `src/sync/trackActivitySync.ts` posts the
  current `.kanban` state to `POST /api/sync/kanban` and applies the server's resolved
  state back. Last-writer-wins per card by `updated_at`; cards missing from the local
  file are archived on the server side (not hard-deleted).
- New settings:
  - `code-kanban.sync.trackactivity-url` (string, default empty — sync disabled).
  - `code-kanban.sync.token` (string, Bearer token).
  - `code-kanban.sync.auto-on-save` (boolean, default `false`).
- New command: `code-kanban.sync-now` (manual one-shot sync).
- Hook `onDidSaveTextDocument` for `*.kanban` when `auto-on-save` is enabled.
  Reentrancy-safe: the extension marks documents being written by the sync itself
  to avoid feedback loops.

### Changed
- `code-kanban.default-lists` default changed from 4 to 6 columns to match
  trackActivity's fixed set:
  `Blocked, Backlog, To Do, Doing, Stand By, Done`.
- README adds an "Optional sync with trackActivity" section explaining the integration.

### Compatibility
- Upstream behaviour is preserved when the sync URL is empty (default).
- Existing `.kanban` files continue to work; only newly created files get the 6-column default.
- No new runtime dependencies (uses the global `fetch` available in VS Code's Node 22).
