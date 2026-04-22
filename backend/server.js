<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>rzprivate obfuscator</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #080a0f;
      --surface:   #0f1218;
      --surface2:  #151922;
      --border:    rgba(255,255,255,0.06);
      --border-h:  rgba(255,255,255,0.12);
      --blue:      #3b82f6;
      --blue-dim:  rgba(59,130,246,0.12);
      --blue-glow: rgba(59,130,246,0.25);
      --green-dim: rgba(34,197,94,0.12);
      --red-dim:   rgba(239,68,68,0.1);
      --text:      #f1f5f9;
      --text-2:    #64748b;
      --text-3:    #334155;
      --mono:      'JetBrains Mono', monospace;
      --sans:      'DM Sans', sans-serif;
      --display:   'Syne', sans-serif;
      --ease:      cubic-bezier(0.25, 0.46, 0.45, 0.94);
      --spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    body {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      overflow-x: hidden;
    }

    .mesh {
      position: fixed; inset: 0;
      pointer-events: none; z-index: 0; overflow: hidden;
    }
    .mesh::before {
      content: '';
      position: absolute;
      top: -20%; left: 50%;
      transform: translateX(-50%);
      width: 900px; height: 600px;
      background:
        radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 70% 60%, rgba(139,92,246,0.05) 0%, transparent 55%);
    }

    .grid-lines {
      position: fixed; inset: 0;
      pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 100%);
    }

    .container {
      width: 100%; max-width: 660px;
      position: relative; z-index: 1;
      animation: pageIn 0.55s var(--ease) both;
    }
    @keyframes pageIn {
      from { opacity:0; transform:translateY(28px); }
      to   { opacity:1; transform:translateY(0); }
    }

    /* Header */
    .header { text-align: center; margin-bottom: 36px; }

    .logo-row {
      display: inline-flex; align-items: center; gap: 8px;
      margin-bottom: 18px;
    }
    .logo-icon {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      box-shadow: 0 4px 16px rgba(59,130,246,0.3);
    }
    .logo-text {
      font-family: var(--display);
      font-size: 13px; font-weight: 700;
      color: var(--text-2); letter-spacing: 0.08em;
    }

    h1 {
      font-family: var(--display);
      font-size: clamp(28px, 5vw, 40px);
      font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: var(--text-2); font-size: 15px;
      font-weight: 300; font-style: italic;
    }

    /* Card */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px; padding: 28px;
      box-shadow:
        0 0 0 1px rgba(0,0,0,0.3),
        0 32px 80px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(255,255,255,0.04);
      position: relative; overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute; top:0; left:0; right:0; height:1px;
      background: linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent);
    }

    /* Section label */
    .section-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-3); margin-bottom: 10px;
    }
    .section-label::after {
      content: ''; flex:1; height:1px; background: var(--border);
    }

    /* Textarea */
    .textarea-wrap { position: relative; margin-bottom: 20px; }
    textarea {
      width: 100%; height: 190px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      color: #4ade80;
      font-family: var(--mono); font-size: 13px; line-height: 1.7;
      padding: 14px 16px; resize: vertical; outline: none;
      transition: border-color 0.25s var(--ease), box-shadow 0.25s var(--ease);
    }
    textarea:focus {
      border-color: rgba(59,130,246,0.5);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
    }
    textarea::placeholder { color: var(--text-3); font-style: italic; }
    .char-count {
      position: absolute; bottom: 10px; right: 12px;
      font-size: 10px; color: var(--text-3);
      font-family: var(--mono); pointer-events: none;
      transition: color 0.2s;
    }

    /* Preset grid */
    .preset-grid {
      display: grid; grid-template-columns: repeat(4,1fr);
      gap: 8px; margin-bottom: 20px;
    }
    .preset-card { cursor: pointer; }
    .preset-card input[type="radio"] { display: none; }
    .preset-inner {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px; padding: 12px 10px;
      display: flex; flex-direction: column; gap: 5px;
      transition:
        border-color 0.2s var(--ease),
        background   0.2s var(--ease),
        transform    0.15s var(--spring),
        box-shadow   0.2s var(--ease);
      user-select: none;
    }
    .preset-card:hover .preset-inner {
      border-color: var(--border-h); transform: translateY(-2px);
    }
    .preset-card:active .preset-inner { transform: scale(0.97); }
    .preset-card.selected .preset-inner {
      border-color: var(--blue);
      background: var(--blue-dim);
      box-shadow: 0 0 0 1px rgba(59,130,246,0.15), 0 4px 20px rgba(59,130,246,0.12);
    }
    .preset-name {
      font-family: var(--display); font-size: 12px; font-weight: 700;
      color: var(--text); transition: color 0.2s;
    }
    .preset-card.selected .preset-name { color: #93c5fd; }
    .preset-desc { font-size: 9.5px; color: var(--text-3); line-height: 1.4; }
    .preset-card.selected .preset-desc { color: rgba(147,197,253,0.55); }
    .preset-bars { display: flex; gap: 3px; margin-top: 5px; }
    .bar {
      height: 3px; flex:1; border-radius: 2px;
      background: var(--border);
      transition: background 0.25s var(--ease);
    }
    .bar.active { background: rgba(255,255,255,0.15); }
    .preset-card.selected .bar.active { background: var(--blue); }
    .preset-card.selected .bar:nth-child(1) { transition-delay: 0ms; }
    .preset-card.selected .bar:nth-child(2) { transition-delay: 50ms; }
    .preset-card.selected .bar:nth-child(3) { transition-delay: 100ms; }
    .preset-card.selected .bar:nth-child(4) { transition-delay: 150ms; }

    /* Button */
    .btn-obfuscate {
      width: 100%; padding: 14px 24px;
      background: var(--blue); color: #fff;
      font-family: var(--sans); font-size: 15px; font-weight: 500;
      border: none; border-radius: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      position: relative; overflow: hidden;
      transition:
        background  0.2s var(--ease),
        box-shadow  0.2s var(--ease),
        transform   0.15s var(--spring);
      box-shadow: 0 2px 20px var(--blue-glow), inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .btn-obfuscate::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 55%);
      pointer-events: none;
    }
    .btn-obfuscate:not(:disabled):hover {
      background: #2563eb;
      box-shadow: 0 6px 30px var(--blue-glow);
      transform: translateY(-2px);
    }
    .btn-obfuscate:not(:disabled):active {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 1px 8px var(--blue-glow);
    }
    .btn-obfuscate:disabled {
      background: #1e3a5f; color: #475569;
      cursor: not-allowed; transform: none; box-shadow: none;
    }

    /* Ripple */
    .ripple {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.22);
      transform: scale(0);
      animation: rippleAnim 0.55s var(--ease) forwards;
      pointer-events: none;
    }
    @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }

    /* Spinner */
    .spinner {
      display: none; width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.65s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Result */
    .result {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.45s var(--ease), opacity 0.3s var(--ease), margin 0.35s var(--ease);
      margin-top: 0;
    }
    .result.show { max-height: 320px; opacity: 1; margin-top: 16px; }
    .result-inner {
      background: var(--bg);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 12px; padding: 16px;
      position: relative; overflow: hidden;
    }
    .result-inner::before {
      content: '';
      position: absolute; top:0; left:0; right:0; height:1px;
      background: linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent);
    }
    .result-label {
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--blue);
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 10px;
    }
    .result-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--blue); box-shadow: 0 0 6px var(--blue);
      animation: pulseDot 2s ease-in-out infinite;
    }
    @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .result-code {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px; padding: 12px 14px;
      font-family: var(--mono); font-size: 11.5px;
      color: #94a3b8; word-break: break-all; line-height: 1.7;
      margin-bottom: 12px;
    }
    .btn-copy {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px;
      background: var(--blue-dim);
      border: 1px solid rgba(59,130,246,0.25);
      color: #93c5fd;
      font-family: var(--sans); font-size: 13px; font-weight: 500;
      border-radius: 8px; cursor: pointer;
      position: relative; overflow: hidden;
      transition:
        background  0.18s var(--ease),
        border-color 0.18s var(--ease),
        transform   0.12s var(--spring);
    }
    .btn-copy:hover { background: rgba(59,130,246,0.2); transform: translateY(-1px); }
    .btn-copy:active { transform: scale(0.97); }
    .btn-copy.copied {
      background: var(--green-dim);
      border-color: rgba(34,197,94,0.3); color: #86efac;
    }

    /* Error */
    .error-box {
      overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height 0.3s var(--ease), opacity 0.25s var(--ease), margin 0.3s var(--ease);
      margin-top: 0;
    }
    .error-box.show { max-height: 80px; opacity: 1; margin-top: 14px; }
    .error-inner {
      background: var(--red-dim);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 10px; padding: 12px 16px;
      color: #f87171; font-size: 13px;
      display: flex; align-items: center; gap: 8px;
    }

    /* Footer */
    .footer {
      margin-top: 24px; text-align: center;
      color: var(--text-3); font-size: 12px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .footer a { color: var(--text-2); text-decoration: none; transition: color 0.2s; }
    .footer a:hover { color: var(--blue); }

    @media (max-width: 480px) {
      .preset-grid { grid-template-columns: repeat(2,1fr); }
      h1 { font-size: 26px; }
      .card { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="mesh"></div>
  <div class="grid-lines"></div>

  <div class="container">
    <div class="header">
      <div class="logo-row">
        <div class="logo-icon">🔥</div>
        <span class="logo-text">Instant Obfuscator</span>
      </div>
      <h1>Lua Obfuscator</h1>
      <p class="subtitle">Obfuscate &amp; protect your scripts instantly</p>
    </div>

    <div class="card">
      <div class="section-label">Script Lua</div>
      <div class="textarea-wrap">
        <textarea id="scriptInput" spellcheck="false"
          placeholder="-- Paste script Lua kamu di sini&#10;print(&quot;Hello World!&quot;)"
          oninput="updateCharCount(this)"></textarea>
        <span class="char-count" id="charCount">0 chars</span>
      </div>

      <div class="section-label">Preset Obfuscation</div>
      <div class="preset-grid">
        <label class="preset-card" id="pc-Minify">
          <input type="radio" name="preset" value="Minify"/>
          <div class="preset-inner">
            <span class="preset-name">Minify</span>
            <span class="preset-desc">Paling kecil · Tercepat</span>
            <div class="preset-bars">
              <span class="bar active"></span><span class="bar"></span>
              <span class="bar"></span><span class="bar"></span>
            </div>
          </div>
        </label>
        <label class="preset-card" id="pc-Weak">
          <input type="radio" name="preset" value="Weak"/>
          <div class="preset-inner">
            <span class="preset-name">Weak</span>
            <span class="preset-desc">Ringan · Cepat</span>
            <div class="preset-bars">
              <span class="bar active"></span><span class="bar active"></span>
              <span class="bar"></span><span class="bar"></span>
            </div>
          </div>
        </label>
        <label class="preset-card selected" id="pc-Medium">
          <input type="radio" name="preset" value="Medium" checked/>
          <div class="preset-inner">
            <span class="preset-name">Medium</span>
            <span class="preset-desc">Seimbang · Default</span>
            <div class="preset-bars">
              <span class="bar active"></span><span class="bar active"></span>
              <span class="bar active"></span><span class="bar"></span>
            </div>
          </div>
        </label>
        <label class="preset-card" id="pc-Strong">
          <input type="radio" name="preset" value="Strong"/>
          <div class="preset-inner">
            <span class="preset-name">Strong</span>
            <span class="preset-desc">Terkuat · Lambat</span>
            <div class="preset-bars">
              <span class="bar active"></span><span class="bar active"></span>
              <span class="bar active"></span><span class="bar active"></span>
            </div>
          </div>
        </label>
      </div>

      <button class="btn-obfuscate" id="obfBtn" onclick="obfuscate(event)">
        <span class="spinner" id="spinner"></span>
        <span id="btnText">⚡ Obfuscate &amp; Get Loader</span>
      </button>

      <div class="error-box" id="errorBox">
        <div class="error-inner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span id="errorMsg"></span>
        </div>
      </div>

      <div class="result" id="resultBox">
        <div class="result-inner">
          <div class="result-label">
            <span class="result-dot"></span>
            Loadstring siap pakai
          </div>
          <div class="result-code" id="loaderCode"></div>
          <button class="btn-copy" id="copyBtn" onclick="copyLoader()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Loadstring
          </button>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>Powered by </span>
      <a href="https://t.me/deuznih" target="_blank">@deuznih</a>
      <span>·</span>
      <span>Protected by Prometheus</span>
    </div>
  </div>

  <script>
    function updateCharCount(ta) {
      const el = document.getElementById('charCount');
      const n  = ta.value.length;
      el.textContent = n.toLocaleString() + ' chars';
      el.style.color = n > 50000 ? '#f87171' : '';
    }

    document.querySelectorAll('input[name="preset"]').forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
        radio.closest('.preset-card').classList.add('selected');
      });
    });

    function createRipple(e, btn) {
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const rip  = document.createElement('span');
      rip.className = 'ripple';
      rip.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
      btn.appendChild(rip);
      rip.addEventListener('animationend', () => rip.remove());
    }

    function setLoading(on) {
      const btn = document.getElementById('obfBtn');
      document.getElementById('spinner').style.display = on ? 'block' : 'none';
      document.getElementById('btnText').textContent   = on ? 'Memproses...' : '⚡ Obfuscate & Get Loader';
      btn.disabled = on;
    }

    function showResult(loader) {
      document.getElementById('loaderCode').textContent = loader;
      document.getElementById('resultBox').classList.add('show');
      resetCopyBtn();
    }

    function showError(msg) {
      document.getElementById('errorMsg').textContent = msg;
      document.getElementById('errorBox').classList.add('show');
    }

    async function obfuscate(e) {
      const btn    = document.getElementById('obfBtn');
      const script = document.getElementById('scriptInput').value.trim();
      const preset = document.querySelector('input[name="preset"]:checked')?.value || 'Medium';

      createRipple(e, btn);
      if (!script) { showError('Script tidak boleh kosong!'); return; }

      setLoading(true);
      document.getElementById('errorBox').classList.remove('show');
      document.getElementById('resultBox').classList.remove('show');

      try {
        const res  = await fetch('https://obfus-production.up.railway.app/api/obfuscate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script, preset })
        });
        const data = await res.json();
        data.success ? showResult(data.loader) : showError('Error: ' + data.error);
      } catch {
        showError('Gagal terhubung ke server. Coba lagi.');
      }

      setLoading(false);
    }

    function resetCopyBtn() {
      const btn = document.getElementById('copyBtn');
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Loadstring`;
    }

    function copyLoader() {
      navigator.clipboard.writeText(document.getElementById('loaderCode').textContent).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.classList.add('copied');
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(resetCopyBtn, 2200);
      });
    }
  </script>
</body>
</html>
