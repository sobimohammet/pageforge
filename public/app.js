/* ═══════════════════════════════════════════════════════════
   PageForge — app.js
   Collects form config, calls /api/generate, streams the
   HTML back, injects into iframe, handles download/copy/tab.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── DOM refs ───────────────────────────────────────────── */
const configForm       = document.getElementById('configForm');
const generateBtn      = document.getElementById('generateBtn');
const productName      = document.getElementById('productName');
const productDesc      = document.getElementById('productDesc');
const styleGrid        = document.getElementById('styleGrid');
const colorRow         = document.getElementById('colorRow');
const sectionsGrid     = document.getElementById('sectionsGrid');
const previewEmpty     = document.getElementById('previewEmpty');
const previewGenerating= document.getElementById('previewGenerating');
const previewFrameWrap = document.getElementById('previewFrameWrap');
const previewFrame     = document.getElementById('previewFrame');
const toolbarActions   = document.getElementById('toolbarActions');
const previewLabel     = document.getElementById('previewLabel');
const copyHtmlBtn      = document.getElementById('copyHtmlBtn');
const downloadBtn      = document.getElementById('downloadBtn');
const openTabBtn       = document.getElementById('openTabBtn');
const genSteps         = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4'),
];

/* ── State ──────────────────────────────────────────────── */
let generatedHtml  = '';
let isGenerating   = false;
let stepTimer      = null;

/* ── Style selector ─────────────────────────────────────── */
styleGrid.addEventListener('click', e => {
  const card = e.target.closest('.style-card');
  if (!card) return;
  styleGrid.querySelectorAll('.style-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
});

/* ── Colour selector ────────────────────────────────────── */
colorRow.addEventListener('click', e => {
  const chip = e.target.closest('.color-chip');
  if (!chip) return;
  colorRow.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
});

/* ── Enable generate button when required fields filled ─── */
function checkForm() {
  const ready = productName.value.trim().length > 0 &&
                productDesc.value.trim().length > 0;
  generateBtn.disabled = ready ? isGenerating : true;
}

productName.addEventListener('input', checkForm);
productDesc.addEventListener('input', checkForm);

/* ── Viewport toggle ────────────────────────────────────── */
document.querySelectorAll('.viewport-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.viewport-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const vp = btn.dataset.vp;
    previewFrameWrap.classList.toggle('mobile', vp === 'mobile');
  });
});

/* ── Form submit ────────────────────────────────────────── */
configForm.addEventListener('submit', e => {
  e.preventDefault();
  if (isGenerating) return;
  generatePage();
});

generateBtn.addEventListener('click', () => {
  if (!generateBtn.disabled && !isGenerating) generatePage();
});

/* ══════════════════════════════════════════════════════════
   Core: generate page
   ══════════════════════════════════════════════════════════ */
async function generatePage() {
  const name     = productName.value.trim();
  const desc     = productDesc.value.trim();
  const style    = styleGrid.querySelector('.style-card.active')?.dataset.style || 'startup';
  const color    = colorRow.querySelector('.color-chip.active')?.dataset.color  || 'indigo';
  const sections = [...sectionsGrid.querySelectorAll('input:checked')].map(i => i.value);

  if (!name || !desc) return;

  setGeneratingState(true);
  startStepAnimation();
  generatedHtml = '';

  try {
    const res = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, desc, style, color, sections }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text)  generatedHtml += parsed.text;
        } catch (_) { /* ignore partial JSON */ }
      }
    }
  } catch (err) {
    console.error('[PageForge]', err);
    generatedHtml = errorPage(err.message);
  }

  clearStepAnimation();
  setGeneratingState(false);
  renderPreview(generatedHtml, name);
}

/* ── Inject HTML into iframe ────────────────────────────── */
function renderPreview(html, name) {
  if (!html) return;

  /* Strip any markdown fences Claude might wrap around the HTML */
  const clean = html
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/,      '')
    .replace(/```\s*$/,      '')
    .trim();

  generatedHtml = clean;

  /* Write into iframe */
  const doc = previewFrame.contentDocument || previewFrame.contentWindow.document;
  doc.open();
  doc.write(clean);
  doc.close();

  /* Show frame, hide empty/generating */
  previewEmpty.style.display      = 'none';
  previewGenerating.style.display = 'none';
  previewFrameWrap.style.display  = 'flex';
  toolbarActions.style.display    = 'flex';
  previewLabel.textContent        = name || 'Preview';
}

/* ── UI state helpers ───────────────────────────────────── */
function setGeneratingState(on) {
  isGenerating = on;
  generateBtn.classList.toggle('generating', on);
  generateBtn.disabled = on;
  productName.disabled = on;
  productDesc.disabled = on;

  if (on) {
    previewEmpty.style.display       = 'none';
    previewFrameWrap.style.display   = 'none';
    previewGenerating.style.display  = 'flex';
    toolbarActions.style.display     = 'none';
  }
}

/* Step animation during generation */
let currentStep = 0;
function startStepAnimation() {
  currentStep = 0;
  genSteps.forEach(s => { s.classList.remove('active', 'done'); });
  genSteps[0].classList.add('active');

  stepTimer = setInterval(() => {
    genSteps[currentStep]?.classList.remove('active');
    genSteps[currentStep]?.classList.add('done');
    currentStep++;
    if (currentStep < genSteps.length) {
      genSteps[currentStep].classList.add('active');
    } else {
      clearInterval(stepTimer);
    }
  }, 3500);
}

function clearStepAnimation() {
  clearInterval(stepTimer);
  genSteps.forEach(s => s.classList.add('done'));
}

/* ── Copy HTML ──────────────────────────────────────────── */
copyHtmlBtn.addEventListener('click', async () => {
  if (!generatedHtml) return;
  try {
    await navigator.clipboard.writeText(generatedHtml);
    copyHtmlBtn.classList.add('success');
    const orig = copyHtmlBtn.innerHTML;
    copyHtmlBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    setTimeout(() => {
      copyHtmlBtn.innerHTML = orig;
      copyHtmlBtn.classList.remove('success');
    }, 2000);
  } catch {
    copyHtmlBtn.textContent = 'Failed';
    setTimeout(() => { copyHtmlBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy HTML`; }, 2000);
  }
});

/* ── Download HTML file ─────────────────────────────────── */
downloadBtn.addEventListener('click', () => {
  if (!generatedHtml) return;
  const name = productName.value.trim().toLowerCase().replace(/\s+/g, '-') || 'landing-page';
  const blob = new Blob([generatedHtml], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}.html`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ── Open in new tab ────────────────────────────────────── */
openTabBtn.addEventListener('click', () => {
  if (!generatedHtml) return;
  const blob = new Blob([generatedHtml], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
});

/* ── Fallback error page ────────────────────────────────── */
function errorPage(msg) {
  return `<!doctype html><html><head><meta charset="UTF-8">
  <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#f1f5f9;}
  .box{text-align:center;padding:2rem;max-width:400px;}h2{color:#f87171;margin-bottom:1rem;}p{color:#94a3b8;font-size:.9rem;line-height:1.6;}</style>
  </head><body><div class="box"><h2>Generation failed</h2><p>${msg}</p><p>Check that ANTHROPIC_API_KEY is set in your Vercel environment variables.</p></div></body></html>`;
}