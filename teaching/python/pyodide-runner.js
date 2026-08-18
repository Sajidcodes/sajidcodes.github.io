/**
 * pyodide-runner.js
 * ------------------------------------------------------------
 * Professional browser-based Python execution engine powered
 * by Pyodide.
 *
 * Designed for:
 *   - Educational platforms
 *   - Coding exercises
 *   - Interactive Python notebooks
 *   - Auto-graders
 *   - Coding challenges
 *
 * Features:
 *   - Lazy Pyodide initialization
 *   - stdout / stderr capture
 *   - input() support
 *   - Execution timeout
 *   - Cancellation
 *   - Package loading
 *   - Namespace management
 *   - Structured errors
 *   - Execution statistics
 *   - Reset support
 *   - UI-independent architecture
 * ------------------------------------------------------------
 */

const PYODIDE_VERSION = "0.27.2";
const PYODIDE_CDN =
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`;

class PyodideRunner {
  constructor(options = {}) {
    this.options = {
      indexURL:
        options.indexURL ||
        `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,

      timeout: options.timeout ?? 10000,

      packages: options.packages ?? [],

      autoInstallPackages:
        options.autoInstallPackages ?? true,

      persistentState:
        options.persistentState ?? false,

      debug:
        options.debug ?? false,

      onReady:
        options.onReady ?? null,

      onStart:
        options.onStart ?? null,

      onOutput:
        options.onOutput ?? null,

      onError:
        options.onError ?? null,

      onComplete:
        options.onComplete ?? null
    };

    this.pyodide = null;
    this.readyPromise = null;

    this.isReady = false;
    this.isRunning = false;

    this.executionId = 0;
    this.activeExecution = null;

    this.namespace = null;

    this.loadedPackages = new Set();
  }

  /* ----------------------------------------------------------
     Logging
     ---------------------------------------------------------- */

  log(...args) {
    if (this.options.debug) {
      console.debug("[PyodideRunner]", ...args);
    }
  }

  /* ----------------------------------------------------------
     Initialization
     ---------------------------------------------------------- */

  async initialize() {
    if (this.isReady && this.pyodide) {
      return this.pyodide;
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = this._initialize();

    try {
      return await this.readyPromise;
    } catch (error) {
      this.readyPromise = null;
      throw error;
    }
  }

  async _initialize() {
    this.log("Loading Pyodide...");

    const {
      loadPyodide
    } = await import(PYODIDE_CDN);

    this.pyodide = await loadPyodide({
      indexURL: this.options.indexURL
    });

    this.namespace =
      this.pyodide.toPy({});

    this.isReady = true;

    this.log("Pyodide ready.");

    if (this.options.packages.length > 0) {
      await this.loadPackages(this.options.packages);
    }

    if (typeof this.options.onReady === "function") {
      this.options.onReady(this.pyodide);
    }

    return this.pyodide;
  }

  /* ----------------------------------------------------------
     Package Management
     ---------------------------------------------------------- */

  async loadPackages(packages = []) {
    await this.initialize();

    if (!Array.isArray(packages)) {
      packages = [packages];
    }

    const newPackages = packages.filter(
      pkg => !this.loadedPackages.has(pkg)
    );

    if (newPackages.length === 0) {
      return;
    }

    this.log("Loading packages:", newPackages);

    await this.pyodide.loadPackage(newPackages);

    newPackages.forEach(pkg => {
      this.loadedPackages.add(pkg);
    });
  }

  /* ----------------------------------------------------------
     Input Handling
     ---------------------------------------------------------- */

  createInputHandler(inputProvider) {
    if (typeof inputProvider === "function") {
      return inputProvider;
    }

    if (Array.isArray(inputProvider)) {
      const values = [...inputProvider];

      return async () => {
        if (values.length === 0) {
          throw new Error("No more input values available.");
        }

        return values.shift();
      };
    }

    return async (prompt = "") => {
      if (typeof window !== "undefined" && window.prompt) {
        const value = window.prompt(prompt);

        if (value === null) {
          throw new Error("Input cancelled by user.");
        }

        return value;
      }

      throw new Error(
        "No input provider was supplied."
      );
    };
  }

  /* ----------------------------------------------------------
     Python Code Preparation
     ---------------------------------------------------------- */

  prepareCode(code) {
    if (typeof code !== "string") {
      throw new TypeError(
        "Python code must be provided as a string."
      );
    }

    return code.replace(/\r\n/g, "\n");
  }

  /* ----------------------------------------------------------
     Execution
     ---------------------------------------------------------- */

  async run(code, options = {}) {
    const executionId = ++this.executionId;

    const config = {
      timeout:
        options.timeout ??
        this.options.timeout,

      input:
        options.input ?? [],

      packages:
        options.packages ?? [],

      resetState:
        options.resetState ??
        !this.options.persistentState,

      captureOutput:
        options.captureOutput ?? true
    };

    if (this.isRunning) {
      return {
        success: false,
        status: "busy",
        error: {
          type: "RunnerBusyError",
          message:
            "Another Python program is currently running."
        }
      };
    }

    const startedAt = performance.now();

    this.isRunning = true;

    if (typeof this.options.onStart === "function") {
      this.options.onStart({
        executionId,
        code
      });
    }

    try {
      await this.initialize();

      if (config.packages.length > 0) {
        await this.loadPackages(config.packages);
      }

      if (config.resetState) {
        this.resetNamespace();
      }

      const pythonCode = this.prepareCode(code);

      const result =
        await this._executeWithTimeout(
          pythonCode,
          config,
          executionId
        );

      const duration =
        performance.now() - startedAt;

      const response = {
        success: true,
        status: "completed",
        executionId,
        output: result.output,
        error: result.error,
        duration,
        timestamp: new Date().toISOString()
      };

      if (typeof this.options.onComplete === "function") {
        this.options.onComplete(response);
      }

      return response;

    } catch (error) {
      const duration =
        performance.now() - startedAt;

      const response = {
        success: false,
        status:
          error.name === "TimeoutError"
            ? "timeout"
            : "error",

        executionId,

        output:
          error.output ?? "",

        error:
          this.normalizeError(error),

        duration,

        timestamp:
          new Date().toISOString()
      };

      if (typeof this.options.onError === "function") {
        this.options.onError(response);
      }

      return response;

    } finally {
      this.isRunning = false;

      this.activeExecution = null;
    }
  }

  /* ----------------------------------------------------------
     Internal Execution
     ---------------------------------------------------------- */

  async _executeWithTimeout(
    code,
    config,
    executionId
  ) {
    const execution = {
      id: executionId,
      cancelled: false
    };

    this.activeExecution = execution;

    const executionPromise =
      this._executePython(
        code,
        config,
        execution
      );

    const timeoutPromise =
      new Promise((_, reject) => {
        execution.timeoutId =
          setTimeout(() => {
            execution.cancelled = true;

            const error =
              new Error(
                `Execution exceeded the ${config.timeout}ms timeout.`
              );

            error.name = "TimeoutError";

            reject(error);
          }, config.timeout);
      });

    try {
      return await Promise.race([
        executionPromise,
        timeoutPromise
      ]);

    } finally {
      clearTimeout(
        execution.timeoutId
      );
    }
  }

  /* ----------------------------------------------------------
     Python Execution Engine
     ---------------------------------------------------------- */

  async _executePython(
    code,
    config,
    execution
  ) {
    const output = [];
    const errors = [];

    const inputHandler =
      this.createInputHandler(
        config.input
      );

    const originalStdout =
  this.pyodide.setStdout({
    batched: text => {

      /*
       * Pyodide's batched stdout callback may provide
       * output chunks without the line-ending that
       * Python's print() produced.
       *
       * Preserve each batch as a separate line.
       */

      output.push(
        text.endsWith("\n")
          ? text
          : text + "\n"
      );

      if (
        typeof this.options.onOutput ===
        "function"
      ) {
        this.options.onOutput({
          type: "stdout",
          text
        });
      }
    }
  });

    const originalStderr =
      this.pyodide.setStderr({
        batched: text => {
          errors.push(text);

          if (
            typeof this.options.onOutput ===
            "function"
          ) {
            this.options.onOutput({
              type: "stderr",
              text
            });
          }
        }
      });

    try {
      /*
       * Inject a browser-safe input implementation.
       *
       * Python's input() calls this JavaScript function.
       */

      this.pyodide.globals.set(
        "__js_input",
        async prompt => {
          if (execution.cancelled) {
            throw new Error(
              "Execution cancelled."
            );
          }

          return await inputHandler(
            prompt
          );
        }
      );

      await this.pyodide.runPythonAsync(`
import builtins
import asyncio

_original_input = builtins.input

def _browser_input(prompt=""):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(
        __js_input(prompt)
    )

builtins.input = _browser_input
`);

      await this.pyodide.runPythonAsync(
        code
      );

      return {
        output:
          output.join(""),

        error:
          errors.length
            ? errors.join("")
            : null
      };

    } finally {
      /*
       * Restore stdout/stderr.
       */

      this.pyodide.setStdout(
        originalStdout
      );

      this.pyodide.setStderr(
        originalStderr
      );

      try {
        this.pyodide.globals.delete(
          "__js_input"
        );
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  /* ----------------------------------------------------------
     Cancellation
     ---------------------------------------------------------- */

  cancel() {
    if (!this.activeExecution) {
      return false;
    }

    this.activeExecution.cancelled = true;

    /*
     * Pyodide cannot reliably interrupt arbitrary
     * synchronous Python execution from JavaScript
     * without worker isolation.
     *
     * This flag prevents continued async work,
     * while Worker-based execution should be used
     * for hard CPU limits.
     */

    return true;
  }

  /* ----------------------------------------------------------
     Namespace Management
     ---------------------------------------------------------- */

  resetNamespace() {
    if (!this.pyodide) {
      return;
    }

    /*
     * Clear user-created globals while preserving
     * Pyodide internals.
     */

    this.pyodide.runPython(`
import builtins

__runner_protected__ = {
    "__name__",
    "__doc__",
    "__package__",
    "__loader__",
    "__spec__",
    "__builtins__",
    "__file__",
    "__cached__"
}

__runner_user_globals__ = [
    key
    for key in globals()
    if not key.startswith("_")
    and key not in __runner_protected__
]

for key in __runner_user_globals__:
    try:
        del globals()[key]
    except Exception:
        pass
`);
  }

  /* ----------------------------------------------------------
     Full Runtime Reset
     ---------------------------------------------------------- */

  async reset() {
    this.cancel();

    this.pyodide = null;
    this.namespace = null;
    this.readyPromise = null;

    this.isReady = false;
    this.isRunning = false;

    this.loadedPackages.clear();

    return this.initialize();
  }

  /* ----------------------------------------------------------
     Error Normalization
     ---------------------------------------------------------- */

  normalizeError(error) {
    if (!error) {
      return null;
    }

    return {
      type:
        error.name ||
        "PythonError",

      message:
        error.message ||
        String(error),

      stack:
        error.stack ||
        null
    };
  }

  /* ----------------------------------------------------------
     Status
     ---------------------------------------------------------- */

  getStatus() {
    return {
      ready: this.isReady,

      running:
        this.isRunning,

      executionId:
        this.executionId,

      loadedPackages:
        [...this.loadedPackages]
    };
  }
}

/* ============================================================
   Singleton
   ============================================================ */

let defaultRunner = null;

export function getPyodideRunner(options = {}) {
  if (!defaultRunner) {
    defaultRunner =
      new PyodideRunner(options);
  }

  return defaultRunner;
}

export { PyodideRunner };

/* ============================================================
   Convenience API
   ============================================================ */

export async function runPython(
  code,
  options = {}
) {
  const runner =
    getPyodideRunner(options.runner);

  return runner.run(
    code,
    options
  );
}
