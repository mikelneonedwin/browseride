import { transform } from 'sucrase'

export interface LogEntry {
  id: string
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
  timestamp: string
}

export function transpileTypeScript(code: string): string {
  try {
    const compiled = transform(code, {
      transforms: ['typescript'],
      disableESTransforms: true,
    })
    return compiled.code
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`TypeScript Transpilation Error: ${errorMsg}`)
  }
}

export function buildIframeSrcDoc(html: string, css: string, js: string): string {
  // Inject console interceptor script that forwards calls to window.parent
  const consoleInterceptor = `
    <script>
      (function() {
        const _formatArg = (arg) => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); }
            catch (e) { return String(arg); }
          }
          return String(arg);
        };

        const _send = (level, args) => {
          const text = Array.from(args).map(_formatArg).join(' ');
          window.parent.postMessage({
            type: 'MODOOLS_IFRAME_LOG',
            level: level,
            text: text,
            timestamp: new Date().toLocaleTimeString()
          }, '*');
        };

        const origLog = console.log;
        const origInfo = console.info;
        const origWarn = console.warn;
        const origError = console.error;

        console.log = function(...args) { _send('log', args); origLog.apply(console, args); };
        console.info = function(...args) { _send('info', args); origInfo.apply(console, args); };
        console.warn = function(...args) { _send('warn', args); origWarn.apply(console, args); };
        console.error = function(...args) { _send('error', args); origError.apply(console, args); };

        window.onerror = function(message, source, lineno, colno, error) {
          _send('error', [message + ' (line ' + lineno + ')']);
          return false;
        };

        window.addEventListener('unhandledrejection', function(event) {
          _send('error', ['Unhandled Promise Rejection: ' + (event.reason?.message || event.reason)]);
        });
      })();
    </script>
  `

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            margin: 0;
            padding: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            background: #ffffff;
          }
          ${css}
        </style>
        ${consoleInterceptor}
      </head>
      <body>
        ${html}
        <script>
          try {
            ${js}
          } catch (err) {
            console.error(err.message || String(err));
          }
        </script>
      </body>
    </html>
  `
}
