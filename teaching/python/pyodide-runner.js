/**
 * pyodide-runner.js
 * ------------------------------------------------------------
 * Browser-based Python execution engine powered by Pyodide.
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

      timeout:
        options.timeout ?? 10000,

      packages:
        options.packages ?? [],

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


  /* ==========================================================
     LOGGING
  ========================================================== */

  log(...args) {

    if (this.options.debug) {

      console.debug(
        "[PyodideRunner]",
        ...args
      );

    }

  }


  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  async initialize() {

    if (
      this.isReady &&
      this.pyodide
    ) {

      return this.pyodide;

    }


    if (this.readyPromise) {

      return this.readyPromise;

    }


    this.readyPromise =
      this._initialize();


    try {

      return await this.readyPromise;

    } catch (error) {

      this.readyPromise = null;

      throw error;

    }

  }


  async _initialize() {

    this.log(
      "Loading Pyodide..."
    );


    const {
      loadPyodide
    } = await import(
      PYODIDE_CDN
    );


    this.pyodide =
      await loadPyodide({

        indexURL:
          this.options.indexURL

      });


    this.namespace =
      this.pyodide.toPy({});


    this.isReady = true;


    this.log(
      "Pyodide ready."
    );


    if (
      this.options.packages.length > 0
    ) {

      await this.loadPackages(
        this.options.packages
      );

    }


    if (
      typeof this.options.onReady ===
      "function"
    ) {

      this.options.onReady(
        this.pyodide
      );

    }


    return this.pyodide;

  }


  /* ==========================================================
     PACKAGE MANAGEMENT
  ========================================================== */

  async loadPackages(packages = []) {

    await this.initialize();


    if (!Array.isArray(packages)) {

      packages = [packages];

    }


    const newPackages =
      packages.filter(
        pkg =>
          !this.loadedPackages.has(pkg)
      );


    if (
      newPackages.length === 0
    ) {

      return;

    }


    this.log(
      "Loading packages:",
      newPackages
    );


    await this.pyodide.loadPackage(
      newPackages
    );


    newPackages.forEach(
      pkg => {

        this.loadedPackages.add(
          pkg
        );

      }
    );

  }


  /* ==========================================================
     INPUT HANDLING
  ========================================================== */

  createInputHandler(
    inputProvider
  ) {

    if (
      typeof inputProvider ===
      "function"
    ) {

      return inputProvider;

    }


    if (
      Array.isArray(inputProvider)
    ) {

      const values =
        [...inputProvider];


      return async () => {

        if (
          values.length === 0
        ) {

          throw new Error(
            "No more input values available."
          );

        }


        return values.shift();

      };

    }


    return async (
      prompt = ""
    ) => {

      if (
        typeof window !== "undefined" &&
        window.prompt
      ) {

        const value =
          window.prompt(prompt);


        if (
          value === null
        ) {

          throw new Error(
            "Input cancelled by user."
          );

        }


        return value;

      }


      throw new Error(
        "No input provider was supplied."
      );

    };

  }


  /* ==========================================================
     PYTHON CODE PREPARATION
  ========================================================== */

  prepareCode(code) {

    if (
      typeof code !== "string"
    ) {

      throw new TypeError(
        "Python code must be provided as a string."
      );

    }


    return code.replace(
      /\r\n/g,
      "\n"
    );

  }


  /* ==========================================================
     EXECUTION
  ========================================================== */

  async run(
    code,
    options = {}
  ) {

    const executionId =
      ++this.executionId;


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

          type:
            "RunnerBusyError",

          message:
            "Another Python program is currently running."

        }

      };

    }


    const startedAt =
      performance.now();


    this.isRunning = true;


    if (
      typeof this.options.onStart ===
      "function"
    ) {

      this.options.onStart({

        executionId,

        code

      });

    }


    try {

      await this.initialize();


      if (
        config.packages.length > 0
      ) {

        await this.loadPackages(
          config.packages
        );

      }


      if (
        config.resetState
      ) {

        this.resetNamespace();

      }


      const pythonCode =
        this.prepareCode(code);


      const result =
        await this._executeWithTimeout(

          pythonCode,

          config,

          executionId

        );


      const duration =
        performance.now() -
        startedAt;


      const response = {

        success: true,

        status:
          "completed",

        executionId,

        output:
          result.output,

        error:
          result.error,

        duration,

        timestamp:
          new Date().toISOString()

      };


      if (
        typeof this.options.onComplete ===
        "function"
      ) {

        this.options.onComplete(
          response
        );

      }


      return response;


    } catch (error) {

      const duration =
        performance.now() -
        startedAt;


      const response = {

        success: false,

        status:
          error.name ===
          "TimeoutError"

            ? "timeout"

            : "error",


        executionId,


        output:
          error.output ?? "",


        error:
          this.normalizeError(
            error
          ),


        duration,


        timestamp:
          new Date().toISOString()

      };


      if (
        typeof this.options.onError ===
        "function"
      ) {

        this.options.onError(
          response
        );

      }


      return response;

    } finally {

      this.isRunning =
        false;


      this.activeExecution =
        null;

    }

  }


  /* ==========================================================
     INTERNAL EXECUTION
  ========================================================== */

  async _executeWithTimeout(
    code,
    config,
    executionId
  ) {

    const execution = {

      id:
        executionId,

      cancelled:
        false,

      timeoutId:
        null

    };


    this.activeExecution =
      execution;


    const executionPromise =
      this._executePython(

        code,

        config,

        execution

      );


    const timeoutPromise =
      new Promise(
        (_, reject) => {

          execution.timeoutId =
            setTimeout(
              () => {

                execution.cancelled =
                  true;


                const error =
                  new Error(
                    `Execution exceeded the ${config.timeout}ms timeout.`
                  );


                error.name =
                  "TimeoutError";


                reject(
                  error
                );

              },
              config.timeout
            );

        }
      );


    try {

      return await Promise.race([

        executionPromise,

        timeoutPromise

      ]);

    } finally {

      if (
        execution.timeoutId
      ) {

        clearTimeout(
          execution.timeoutId
        );

      }

    }

  }


  /* ==========================================================
     PYTHON EXECUTION ENGINE
  ========================================================== */

  async _executePython(
    code,
    config,
    execution
  ) {

    /*
     * IMPORTANT:
     *
     * stdout and stderr are strings rather than arrays.
     *
     * This preserves Python's actual line breaks.
     *
     * For example:
     *
     * print("*", end=" ")
     * print("*", end=" ")
     * print()
     *
     * remains:
     *
     * * * 
     *
     * rather than being flattened into one line.
     */

    let output = "";

    let errors = "";


    const inputHandler =
      this.createInputHandler(
        config.input
      );


    /* ========================================================
       STDOUT
    ======================================================== */

    const originalStdout =
      this.pyodide.setStdout({

        batched: text => {

          /*
           * DO NOT add "\n" here.
           *
           * Pyodide is responsible for preserving
           * Python's actual output formatting.
           */

          output += text;


          if (
            typeof this.options.onOutput ===
            "function"
          ) {

            this.options.onOutput({

              type:
                "stdout",

              text:
                text

            });

          }

        }

      });


    /* ========================================================
       STDERR
    ======================================================== */

    const originalStderr =
      this.pyodide.setStderr({

        batched: text => {

          errors += text;


          if (
            typeof this.options.onOutput ===
            "function"
          ) {

            this.options.onOutput({

              type:
                "stderr",

              text:
                text

            });

          }

        }

      });


    try {

      /* ======================================================
         INPUT SUPPORT
      ====================================================== */

      this.pyodide.globals.set(

        "__js_input",

        async prompt => {

          if (
            execution.cancelled
          ) {

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

        asyncio.set_event_loop(
            loop
        )


    return loop.run_until_complete(

        __js_input(prompt)

    )


builtins.input = _browser_input

`);


      /* ======================================================
         RUN STUDENT CODE
      ====================================================== */

      await this.pyodide.runPythonAsync(
        code
      );


      /* ======================================================
         RETURN OUTPUT
      ====================================================== */

      return {

        output:
          output,

        error:
          errors.length > 0
            ? errors
            : null

      };


    } finally {

      /* ======================================================
         RESTORE STDOUT / STDERR
      ====================================================== */

      this.pyodide.setStdout(
        originalStdout
      );


      this.pyodide.setStderr(
        originalStderr
      );


      /* ======================================================
         CLEANUP INPUT
      ====================================================== */

      try {

        this.pyodide.globals.delete(
          "__js_input"
        );

      } catch {

        /*
         * Ignore cleanup errors.
         */

      }

    }

  }


  /* ==========================================================
     CANCELLATION
  ========================================================== */

  cancel() {

    if (
      !this.activeExecution
    ) {

      return false;

    }


    this.activeExecution.cancelled =
      true;


    /*
     * Pyodide cannot reliably interrupt arbitrary
     * synchronous Python execution from JavaScript
     * without Worker isolation.
     *
     * This flag prevents continued async work.
     */

    return true;

  }


  /* ==========================================================
     NAMESPACE MANAGEMENT
  ========================================================== */

  resetNamespace() {

    if (
      !this.pyodide
    ) {

      return;

    }


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


  /* ==========================================================
     FULL RUNTIME RESET
  ========================================================== */

  async reset() {

    this.cancel();


    this.pyodide =
      null;


    this.namespace =
      null;


    this.readyPromise =
      null;


    this.isReady =
      false;


    this.isRunning =
      false;


    this.loadedPackages.clear();


    return this.initialize();

  }


  /* ==========================================================
     ERROR NORMALIZATION
  ========================================================== */

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


  /* ==========================================================
     STATUS
  ========================================================== */

  getStatus() {

    return {

      ready:
        this.isReady,


      running:
        this.isRunning,


      executionId:
        this.executionId,


      loadedPackages:
        [
          ...this.loadedPackages
        ]

    };

  }

}


/* ============================================================
   SINGLETON
============================================================ */

let defaultRunner = null;


export function getPyodideRunner(
  options = {}
) {

  if (!defaultRunner) {

    defaultRunner =
      new PyodideRunner(
        options
      );

  }


  return defaultRunner;

}


export {
  PyodideRunner
};


/* ============================================================
   CONVENIENCE API
============================================================ */

export async function runPython(
  code,
  options = {}
) {

  const runner =
    getPyodideRunner(
      options.runner
    );


  return runner.run(
    code,
    options
  );

}
