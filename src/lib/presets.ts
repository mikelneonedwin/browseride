export interface LanguagePreset {
  id: 'html-css' | 'javascript' | 'typescript' | 'python'
  name: string
  monacoLanguage: string
  defaultCode: string
  description: string
}

export const LANGUAGE_PRESETS: LanguagePreset[] = [
  {
    id: 'html-css',
    name: 'HTML & CSS',
    monacoLanguage: 'html',
    description: 'Sandboxed client-side iframe with live CSS and DOM updates',
    defaultCode: `<!-- Modools In-Browser Playground -->
<div class="card">
  <h1>Hello from Modools!</h1>
  <p>This code runs 100% inside your browser in a sandboxed iframe.</p>
  <button id="btn">Click me to test console</button>
</div>

<style>
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    background: #f8fafc;
  }
  .card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    text-align: center;
    border: 1px solid #e2e8f0;
  }
  h1 { color: #0284c7; margin-top: 0; }
  p { color: #64748b; line-height: 1.5; }
  button {
    background: #0284c7;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover { background: #0369a1; }
</style>

<script>
  console.log("Interactive card mounted at", new Date().toLocaleTimeString());
  document.getElementById("btn").addEventListener("click", () => {
    console.info("Button clicked! User interaction captured in console tab.");
  });
</script>`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoLanguage: 'javascript',
    description: 'Modern JavaScript with console interception',
    defaultCode: `// Algorithms & Data Processing in Browser
function findPrimes(limit) {
  const isPrime = new Uint8Array(limit + 1).fill(1);
  isPrime[0] = 0;
  isPrime[1] = 0;

  for (let p = 2; p * p <= limit; p++) {
    if (isPrime[p]) {
      for (let i = p * p; i <= limit; i += p) {
        isPrime[i] = 0;
      }
    }
  }

  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (isPrime[i]) primes.push(i);
  }
  return primes;
}

console.log("Computing prime numbers up to 100 in browser...");
const primes = findPrimes(100);
console.log("Found", primes.length, "primes:", primes);
console.info("Done! Zero backend requests sent.");`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoLanguage: 'typescript',
    description: 'Typed code transpiled in-browser via Sucrase before running',
    defaultCode: `// In-browser TypeScript Transpilation
interface Student {
  id: string;
  name: string;
  grade: number;
}

type GradeClassification = 'Distinction' | 'Merit' | 'Pass' | 'Fail';

function classifyStudent(student: Student): { student: Student; status: GradeClassification } {
  let status: GradeClassification;
  if (student.grade >= 75) status = 'Distinction';
  else if (student.grade >= 60) status = 'Merit';
  else if (student.grade >= 40) status = 'Pass';
  else status = 'Fail';

  return { student, status };
}

const roster: Student[] = [
  { id: 'S101', name: 'Ada Lovelace', grade: 98 },
  { id: 'S102', name: 'Alan Turing', grade: 94 },
  { id: 'S103', name: 'Grace Hopper', grade: 89 },
];

console.log("Analyzing academic records...");
roster.forEach(student => {
  const result = classifyStudent(student);
  console.log(\`[\${result.student.id}] \${result.student.name}: \${result.status} (\${result.student.grade}%)\`);
});`,
  },
  {
    id: 'python',
    name: 'Python (Pyodide WASM)',
    monacoLanguage: 'python',
    description: 'CPython 3.12 in WebAssembly with numpy and matplotlib plot generation',
    defaultCode: `# Python In-Browser with Pyodide (WASM)
import numpy as np
import matplotlib.pyplot as plt

# Generate damped sine wave
print("Generating mathematical series using numpy...")
x = np.linspace(0, 10, 500)
y = np.exp(-x / 3) * np.sin(2 * np.pi * x)

mean_val = np.mean(y)
max_val = np.max(y)
print(f"Data points: {len(x)}")
print(f"Mean value: {mean_val:.4f}, Peak: {max_val:.4f}")

# Render figure (captured and displayed in the Plots tab)
plt.figure(figsize=(8, 4))
plt.plot(x, y, label="y = e^(-x/3) * sin(2πx)", color="#0284c7", linewidth=2)
plt.title("Damped Harmonic Oscillation (Modools In-Browser Python)")
plt.xlabel("Time (s)")
plt.ylabel("Amplitude")
plt.grid(True, linestyle="--", alpha=0.6)
plt.legend()
plt.tight_layout()
plt.show()

print("Plot exported to the Plots tab.")`,
  },
]
