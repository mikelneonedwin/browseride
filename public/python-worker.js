// Web Worker that initializes and executes Python using Pyodide
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

let pyodidePromise = null;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      self.postMessage({ type: 'status', status: 'loading', message: 'Downloading & initializing Pyodide WebAssembly...' });
      
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
        stdout: (text) => {
          self.postMessage({ type: 'stdout', text });
        },
        stderr: (text) => {
          self.postMessage({ type: 'stderr', text });
        }
      });

      self.postMessage({ type: 'status', status: 'ready', message: 'Pyodide ready.' });
      return pyodide;
    })();
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const { id, code, hasPlot } = event.data;

  try {
    const pyodide = await getPyodide();

    // Setup matplotlib capturing if plot is requested or code imports matplotlib
    const needsMatplotlib = hasPlot || code.includes('matplotlib') || code.includes('plt.');

    if (needsMatplotlib) {
      self.postMessage({ type: 'status', status: 'installing', message: 'Loading packages (matplotlib, numpy)...' });
      await pyodide.loadPackage(['matplotlib', 'numpy']);
      self.postMessage({ type: 'status', status: 'ready', message: 'Packages loaded.' });

      // Configure matplotlib to render offscreen and capture PNG base64
      await pyodide.runPythonAsync(`
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def _get_active_figure_base64():
    figs = [plt.figure(n) for n in plt.get_fignums()]
    if not figs:
        return None
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
    plt.close('all')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')
`);
    }

    const startTime = performance.now();
    await pyodide.runPythonAsync(code);
    const duration = Math.round(performance.now() - startTime);

    let plotBase64 = null;
    if (needsMatplotlib) {
      try {
        plotBase64 = pyodide.runPython('_get_active_figure_base64()');
      } catch (err) {
        // Plot capture ignored if none generated
      }
    }

    self.postMessage({
      type: 'complete',
      id,
      duration,
      plotBase64: plotBase64 || null
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      message: error.message || String(error)
    });
  }
};
