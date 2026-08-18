// pyodide-runner.js
// Turns any <pre class="runnable"><code>...</code></pre> block into a
// live, executable Python snippet using Pyodide (runs entirely client-side).

(function () {
  let pyodideReadyPromise = null;
  const statusEl = () => document.getElementById('pyodide-status');

  function showStatus(text) {
    let el = statusEl();
    if (!el) {
      el = document.createElement('div');
      el.id = 'pyodide-status';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.remove('hidden');
  }

  function hideStatus() {
    const el = statusEl();
    if (el) el.classList.add('hidden');
  }

  async function getPyodide() {
    if (!pyodideReadyPromise) {
      showStatus('Loading Python environment…');
      pyodideReadyPromise = loadPyodide().then((pyodide) => {
        hideStatus();
        return pyodide;
      });
    }
    return pyodideReadyPromise;
  }

  // Pull the plain-text source out of a <pre><code>...</code></pre> block,
  // stripping the syntax-highlighting <span> tags used elsewhere on the site.
  function extractSource(codeEl) {
    return codeEl.textContent;
  }

  function buildRunnableUI(preEl) {
    const codeEl = preEl.querySelector('code');
    if (!codeEl) return;

    const originalSource = extractSource(codeEl);
    const editable = preEl.dataset.editable === 'true';

    const wrap = document.createElement('div');
    wrap.className = 'runnable';

    // Move the original <pre> into the wrapper first
    preEl.parentNode.insertBefore(wrap, preEl);
    wrap.appendChild(preEl);

    // If editable, replace the <pre><code> with a live textarea
    let sourceGetter = () => extractSource(codeEl);
    if (editable) {
      const textarea = document.createElement('textarea');
      textarea.className = 'code-editable';
      textarea.spellcheck = false;
      textarea.value = originalSource;
      textarea.rows = Math.max(3, originalSource.split('\n').length);
      preEl.replaceWith(textarea);
      wrap.appendChild(textarea);
      sourceGetter = () => textarea.value;
    }

    // Run bar
    const bar = document.createElement('div');
    bar.className = 'run-bar';

    const btn = document.createElement('button');
    btn.className = 'run-btn';
    btn.type = 'button';
    btn.innerHTML = '&#9654; Run';

    const status = document.createElement('span');
    status.className = 'run-status';

    bar.appendChild(btn);
    bar.appendChild(status);
    wrap.appendChild(bar);

    // Output area
    const outputWrap = document.createElement('div');
    outputWrap.className = 'run-output-wrap';
    const outputLabel = document.createElement('div');
    outputLabel.className = 'run-output-label';
    outputLabel.textContent = 'Output';
    const output = document.createElement('pre');
    output.className = 'run-output';
    outputWrap.appendChild(outputLabel);
    outputWrap.appendChild(output);
    wrap.appendChild(outputWrap);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      status.textContent = 'Running…';
      outputWrap.classList.add('show');
      output.classList.remove('is-error');
      output.textContent = '';

      try {
        const pyodide = await getPyodide();

        // Capture stdout/stderr into Python-side buffers, then read them back.
        pyodide.setStdout({ batched: (s) => { output.textContent += s + '\n'; } });
        pyodide.setStderr({ batched: (s) => { output.textContent += s + '\n'; } });

        await pyodide.runPythonAsync(sourceGetter());

        if (output.textContent.trim() === '') {
          output.textContent = '(no output — try adding a print() statement)';
        }
        status.textContent = 'Done';
      } catch (err) {
        output.classList.add('is-error');
        output.textContent += String(err);
        status.textContent = 'Error';
      } finally {
        btn.disabled = false;
        setTimeout(() => { status.textContent = ''; }, 2000);
      }
    });
  }

  function init() {
    document.querySelectorAll('pre.runnable').forEach(buildRunnableUI);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
