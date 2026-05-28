import * as vscode from 'vscode';

/**
 * Canal SSE hacia trackActivity para recibir cambios en vivo del proyecto
 * enlazado a un workspace. Cuando el server emite un evento `change`,
 * disparamos un callback (que el caller usa para lanzar una sync completa).
 *
 * Detalles:
 *   - Usamos `fetch` con ReadableStream porque VS Code (Node 22) no tiene
 *     `EventSource` global. Implementación manual del protocolo SSE basta.
 *   - Reconexión automática con backoff exponencial limitado (1.5 s → 30 s).
 *   - El server cierra la conexión cada ~60 s (eventos `rotate`); el cliente
 *     reabre sin perder cambios — el `latest` inicial lo confirma.
 *   - Stop limpio vía AbortController + flag interno.
 */

type StreamConfig = {
  url: string;            // base URL, ej. http://127.0.0.1:8000
  token: string;          // Bearer
  workspacePath: string;  // identifica el proyecto en server
};

type StreamHandlers = {
  onChange: (latest: string) => void; // server detectó updated_at más reciente
  onHello?: (info: { project_id: number; latest: string | null }) => void;
  onError?: (message: string) => void;
};

export type StreamCloser = () => void;

const INITIAL_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS     = 30_000;

export function openKanbanStream(config: StreamConfig, handlers: StreamHandlers): StreamCloser {
  let stopped = false;
  let controller: AbortController | undefined;
  let backoff = INITIAL_BACKOFF_MS;

  const url = new URL(`${config.url.replace(/\/+$/, '')}/api/sync/kanban/stream`);
  url.searchParams.set('workspace_path', config.workspacePath);

  // Logging diagnóstico al output channel propio para que el usuario
  // pueda inspeccionar el estado del live-pull. Accesible en VS Code via
  // View → Output → "Code Kanban Sync".
  const log = (msg: string): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ch = (globalThis as any).__codeKanbanLog__;
      if (ch && typeof ch.appendLine === 'function') {
        ch.appendLine(`[stream ${config.workspacePath}] ${msg}`);
      }
    } catch { /* ignore */ }
    console.log(`[code-kanban stream] ${msg}`);
  };

  const loop = async (): Promise<void> => {
    log(`opening ${url.toString()}`);
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Accept':        'text/event-stream',
          },
          signal: controller.signal,
        });
        log(`HTTP ${res.status}`);

        if (res.status === 422) {
          const body = await res.text().catch(() => '');
          handlers.onError?.(`Sync stream: ${body}`);
          return;
        }
        if (res.status === 401) {
          handlers.onError?.('Sync stream: 401 Unauthorized — check code-kanban.sync.token.');
          return;
        }
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        backoff = INITIAL_BACKOFF_MS;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        log('reader ready, awaiting chunks…');

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) { log('stream closed by server (done=true)'); break; }
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          log(`chunk (${value?.length ?? 0} bytes): ${chunk.replace(/\n/g, '\\n').slice(0, 120)}`);

          let sepIdx: number;
          while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);
            parseAndDispatch(block, handlers, log);
          }
        }
      } catch (err) {
        if (stopped) return;
        log(`fetch threw: ${String(err)}`);
      }

      if (stopped) return;
      log(`reconnect in ${backoff}ms`);
      await sleep(backoff);
      backoff = Math.min(MAX_BACKOFF_MS, Math.round(backoff * 1.6));
    }
  };

  void loop();

  return () => {
    stopped = true;
    try { controller?.abort(); } catch { /* ignore */ }
  };
}

function parseAndDispatch(block: string, handlers: StreamHandlers, log?: (msg: string) => void): void {
  // Cada bloque es un conjunto de líneas tipo "event: name" / "data: json"
  // / ": comentario". Ignoramos comentarios (heartbeats).
  const lines = block.split('\n');
  let event = 'message';
  const dataParts: string[] = [];
  for (const raw of lines) {
    if (raw.startsWith(':')) continue;            // comentario / heartbeat
    if (raw.startsWith('event:')) {
      event = raw.slice(6).trim();
    } else if (raw.startsWith('data:')) {
      dataParts.push(raw.slice(5).trim());
    }
  }
  const raw = dataParts.join('\n');
  if (raw === '') return;

  let data: unknown;
  try { data = JSON.parse(raw); } catch { return; }

  log?.(`event=${event} data=${raw.slice(0, 100)}`);
  if (event === 'change' && typeof data === 'object' && data && 'latest' in data) {
    const latest = (data as { latest: string }).latest;
    handlers.onChange(latest);
  } else if (event === 'hello' && typeof data === 'object' && data) {
    handlers.onHello?.(data as { project_id: number; latest: string | null });
  }
  // event === 'rotate' → no hacemos nada; el server cerrará la conexión y
  // el while interno la detectará como `done`, disparando reconexión.
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
