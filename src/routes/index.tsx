import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Play, RotateCcw, Trash2, Eye, Terminal, Loader2 } from 'lucide-react'
import { LANGUAGE_PRESETS, type LanguagePreset } from '#/lib/presets'
import { buildIframeSrcDoc, transpileTypeScript, type LogEntry } from '#/lib/web-runner'

export const Route = createFileRoute('/')({ component: IdeWorkspace })

function IdeWorkspace() {
  const [isMounted, setIsMounted] = useState<boolean>(false)
  const [selectedLang, setSelectedLang] = useState<LanguagePreset['id']>('html-css')
  const [code, setCode] = useState<string>(LANGUAGE_PRESETS[0].defaultCode)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'console' | 'preview'>('preview')
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>('')
  const [pythonPlot, setPythonPlot] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [pyStatus, setPyStatus] = useState<string>('idle')

  const workerRef = useRef<Worker | null>(null)
  const executionCounter = useRef<number>(0)

  const currentPreset = LANGUAGE_PRESETS.find((p) => p.id === selectedLang) || LANGUAGE_PRESETS[0]

  // Setup Python worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsMounted(true)

    const worker = new Worker('/python-worker.js')
    workerRef.current = worker

    worker.onmessage = (event) => {
      const data = event.data
      if (data.type === 'status') {
        setPyStatus(data.message)
      } else if (data.type === 'stdout') {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: 'log',
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else if (data.type === 'stderr') {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: 'error',
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else if (data.type === 'complete') {
        setIsRunning(false)
        if (data.plotBase64) {
          setPythonPlot(data.plotBase64)
          setActiveTab('preview')
        }
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: 'info',
            text: `Execution finished in ${data.duration}ms.`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      } else if (data.type === 'error') {
        setIsRunning(false)
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: 'error',
            text: data.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
      }
    }

    // Listen to iframe postMessage logs
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MODOOLS_IFRAME_LOG') {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: e.data.level,
            text: e.data.text,
            timestamp: e.data.timestamp || new Date().toLocaleTimeString(),
          },
        ])
      }
    }
    window.addEventListener('message', handleWindowMessage)

    return () => {
      worker.terminate()
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [])

  // Switch language
  const handleSelectLanguage = (langId: LanguagePreset['id']) => {
    const preset = LANGUAGE_PRESETS.find((p) => p.id === langId)
    if (!preset) return
    setSelectedLang(langId)
    setCode(preset.defaultCode)
    setLogs([])
    setPythonPlot(null)
    if (langId === 'html-css') {
      setActiveTab('preview')
      setIframeSrcDoc(buildIframeSrcDoc(preset.defaultCode, '', ''))
    } else {
      setActiveTab('console')
      setIframeSrcDoc('')
    }
  }

  // Run Code
  const runCode = useCallback(() => {
    setIsRunning(true)
    const runId = ++executionCounter.current
    const timestamp = new Date().toLocaleTimeString()

    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        level: 'info',
        text: `--- Running [${currentPreset.name}] at ${timestamp} ---`,
        timestamp,
      },
    ])

    if (selectedLang === 'python') {
      setActiveTab('console')
      if (workerRef.current) {
        workerRef.current.postMessage({
          id: runId,
          code,
          hasPlot: true,
        })
      }
      return
    }

    if (selectedLang === 'html-css') {
      setIframeSrcDoc(buildIframeSrcDoc(code, '', ''))
      setIsRunning(false)
      setActiveTab('preview')
      return
    }

    if (selectedLang === 'javascript') {
      const doc = buildIframeSrcDoc('<div style="font-size:13px; color:#64748b;">JavaScript script executed in sandboxed frame. See Console tab for output.</div>', '', code)
      setIframeSrcDoc(doc)
      setIsRunning(false)
      setActiveTab('console')
      return
    }

    if (selectedLang === 'typescript') {
      try {
        const jsCode = transpileTypeScript(code)
        const doc = buildIframeSrcDoc('<div style="font-size:13px; color:#64748b;">TypeScript transpiled and executed. See Console tab for output.</div>', '', jsCode)
        setIframeSrcDoc(doc)
        setIsRunning(false)
        setActiveTab('console')
      } catch (err: unknown) {
        setIsRunning(false)
        const msg = err instanceof Error ? err.message : String(err)
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            level: 'error',
            text: msg,
            timestamp: new Date().toLocaleTimeString(),
          },
        ])
        setActiveTab('console')
      }
    }
  }, [code, currentPreset.name, selectedLang])

  // Initial preview on mount for html
  useEffect(() => {
    if (selectedLang === 'html-css') {
      setIframeSrcDoc(buildIframeSrcDoc(code, '', ''))
    }
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              modools
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
              In-Browser Runner
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Language Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {LANGUAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectLanguage(preset.id)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                  selectedLang === preset.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {selectedLang === 'python' && pyStatus && (
            <span className="text-xs text-slate-400 flex items-center space-x-1 mr-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
              {pyStatus}
            </span>
          )}

          <button
            onClick={() => {
              setCode(currentPreset.defaultCode)
              setLogs([])
              setPythonPlot(null)
            }}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
            title="Reset to default code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={runCode}
            disabled={isRunning}
            className={`flex items-center space-x-2 text-xs font-semibold px-4 py-1.5 rounded-md shadow transition ${
              isRunning
                ? 'bg-sky-800/50 text-sky-200 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Pane (Left) */}
        <div className="flex-1 flex flex-col border-r border-slate-800 min-w-0">
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-slate-300 font-medium">editor.{currentPreset.monacoLanguage === 'html' ? 'html' : currentPreset.monacoLanguage === 'python' ? 'py' : currentPreset.monacoLanguage === 'typescript' ? 'ts' : 'js'}</span>
              <span className="text-slate-600">•</span>
              <span>{currentPreset.description}</span>
            </div>
            <span className="text-slate-500">100% Client-Side</span>
          </div>

          <div className="flex-1 min-h-0 relative">
            {isMounted ? (
              <Editor
                height="100%"
                language={currentPreset.monacoLanguage}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                  tabSize: 2,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xs text-slate-500 font-mono">
                Loading editor...
              </div>
            )}
          </div>
        </div>

        {/* Output & Preview Pane (Right) */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Tabs header */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('console')}
                className={`flex items-center space-x-1.5 text-xs px-3 py-1 rounded font-medium transition ${
                  activeTab === 'console'
                    ? 'bg-slate-800 text-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                {logs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-700 text-slate-300 font-mono">
                    {logs.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center space-x-1.5 text-xs px-3 py-1 rounded font-medium transition ${
                  activeTab === 'preview'
                    ? 'bg-slate-800 text-sky-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{selectedLang === 'python' ? 'Plots & Figures' : 'Live Preview'}</span>
                {selectedLang === 'python' && pythonPlot && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping ml-1" />
                )}
              </button>
            </div>

            {activeTab === 'console' && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center space-x-1 p-1 hover:bg-slate-800 rounded transition"
                title="Clear console"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Hidden persistent execution iframe for JS/TS/HTML execution */}
          <div className={activeTab === 'preview' ? 'flex-1 overflow-auto p-0 relative' : 'hidden'}>
            <div className="w-full h-full bg-white flex flex-col items-center justify-center relative overflow-auto">
              {selectedLang === 'python' ? (
                pythonPlot ? (
                  <div className="p-4 flex flex-col items-center justify-center max-w-full">
                    <div className="text-xs text-slate-500 font-mono mb-2 self-start">
                      Rendered via Pyodide Matplotlib:
                    </div>
                    <img
                      src={`data:image/png;base64,${pythonPlot}`}
                      alt="Matplotlib rendered plot"
                      className="rounded border border-slate-200 shadow-sm max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center justify-center space-y-2 select-none">
                    <Eye className="w-8 h-8 stroke-slate-300" />
                    <span className="text-sm">No plot rendered yet. Run code to generate matplotlib figures.</span>
                  </div>
                )
              ) : iframeSrcDoc ? (
                <iframe
                  title="Live Preview"
                  srcDoc={iframeSrcDoc}
                  sandbox="allow-scripts"
                  className="w-full h-full border-none bg-white"
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center justify-center space-y-2 select-none">
                  <Eye className="w-8 h-8 stroke-slate-300" />
                  <span className="text-sm">Click &quot;Run Code&quot; to load preview.</span>
                </div>
              )}
            </div>
          </div>

          {/* Console View */}
          <div className={activeTab === 'console' ? 'flex-1 overflow-auto p-0 relative' : 'hidden'}>
            <div className="p-4 font-mono text-xs leading-relaxed space-y-1.5 h-full overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-600 flex flex-col items-center justify-center h-full space-y-2 select-none">
                  <Terminal className="w-8 h-8 stroke-slate-700" />
                  <span>No logs yet. Click &quot;Run Code&quot; to execute.</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-2 py-0.5 border-b border-slate-900/50 ${
                      log.level === 'error'
                        ? 'text-rose-400 bg-rose-950/20 px-2 rounded'
                        : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'info'
                        ? 'text-sky-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 shrink-0 text-[11px] select-none">[{log.timestamp}]</span>
                    <pre className="whitespace-pre-wrap break-all font-mono m-0 flex-1">{log.text}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
