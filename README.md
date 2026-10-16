# browseride

An in-browser code editor and client-side execution environment for web development and Python data science.

Built with TanStack Start, Monaco Editor, and WebAssembly.

## Features

- **Monaco Editor:** Syntax highlighting, line numbers, and indentation for HTML/CSS, JavaScript, TypeScript, and Python.
- **Client-Side Web Runner:** Sandboxed `iframe` execution with real-time DOM rendering, CSS injection, and console interception.
- **In-Browser TypeScript:** Automatic local transpilation via Sucrase before running.
- **Python in WebAssembly (Pyodide):** Executes CPython 3.12 inside a dedicated Web Worker with `numpy` and `matplotlib` plot rendering to canvas.
- **Zero Server Compute:** 100% of code execution runs locally on the user's browser with zero backend requests.

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the playground.

## Production Build

```bash
bun run build
bun run preview
```
