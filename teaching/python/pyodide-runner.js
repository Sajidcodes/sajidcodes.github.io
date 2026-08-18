let pyodide = null;

const output = document.getElementById("output");
const runButton = document.getElementById("run-button");
const clearButton = document.getElementById("clear-button");
const codeEditor = document.getElementById("code");


/* =========================
   LOAD PYODIDE
========================= */

async function loadPython() {

  try {

    output.textContent = "Loading Python...";

    pyodide = await loadPyodide();

    output.textContent =
      "Python is ready. Click “Run Python” to execute your code.";

    runButton.disabled = false;
    runButton.textContent = "Run Python";

  } catch (error) {

    output.textContent =
      "Could not load Python.\n\n" + error;

    runButton.disabled = true;

  }

}


/* =========================
   RUN PYTHON
========================= */

async function runPython() {

  if (!pyodide) {

    output.textContent =
      "Python is still loading. Please wait a moment.";

    return;

  }

  const code = codeEditor.value;

  if (!code.trim()) {

    output.textContent =
      "Write some Python code first.";

    return;

  }


  runButton.disabled = true;
  runButton.textContent = "Running...";

  output.textContent = "";


  try {

    /*
      Capture print() output
    */

    pyodide.setStdout({

      batched: (text) => {

        output.textContent += text;

      }

    });


    /*
      Capture Python errors / stderr
    */

    pyodide.setStderr({

      batched: (text) => {

        output.textContent += text;

      }

    });


    /*
      Execute the student's Python code
    */

    await pyodide.runPythonAsync(code);


    /*
      If the program produced no output
    */

    if (output.textContent.trim() === "") {

      output.textContent =
        "Code executed successfully.";

    }

  } catch (error) {

    output.textContent =
      "Error:\n\n" + error;

  }


  runButton.disabled = false;
  runButton.textContent = "Run Python";

}


/* =========================
   CLEAR OUTPUT
========================= */

clearButton.addEventListener("click", () => {

  output.textContent = "";

});


/* =========================
   TAB SUPPORT
========================= */

codeEditor.addEventListener("keydown", (event) => {

  if (event.key === "Tab") {

    event.preventDefault();

    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;

    codeEditor.value =
      codeEditor.value.substring(0, start) +
      "    " +
      codeEditor.value.substring(end);

    codeEditor.selectionStart =
      codeEditor.selectionEnd =
      start + 4;

  }

});


/* =========================
   KEYBOARD SHORTCUT
   Cmd + Enter / Ctrl + Enter
========================= */

codeEditor.addEventListener("keydown", (event) => {

  if (
    (event.ctrlKey || event.metaKey) &&
    event.key === "Enter"
  ) {

    event.preventDefault();

    runPython();

  }

});


/* =========================
   RUN BUTTON
========================= */

runButton.addEventListener("click", runPython);


/* =========================
   START PYODIDE
========================= */

runButton.disabled = true;

loadPython();
