// ── i18n ──
const I18N = {
  zh: {
    heroTitle: '清理 Claude 对话记录',
    heroDesc: '上传 Claude Code 导出的 .zip 或 .jsonl 文件，自动过滤工具调用与系统元数据，仅保留人机核心对话内容。',
    uploadText: '拖拽文件到此处，或 <strong>点击选择</strong>',
    uploadHint: '支持 .zip 和 .jsonl | 可多选',
    processing: '正在解析和过滤中...',
    trustPrivacy: '本地处理',
    trustFast: '智能过滤',
    trustPreview: '即时预览',
    sessions: '个会话',
    messages: '条消息',
    kept: '保留',
    filtered: '过滤',
    ratio: '保留率',
    size: '大小',
    download: '下载',
    downloadAll: '下载全部',
    preview: '预览',
    hide: '收起',
    previewHeader: (n) => `预览（前 ${n} 条消息）`,
    moreMessages: (n) => `还有 ${n} 条消息，请下载查看完整内容`,
    untitled: '未命名会话',
    turns: (n) => `${n} 轮`,
    errorUnsupported: (name) => `不支持的文件格式: ${name}`,
    errorNoData: '未找到有效的 .jsonl 数据',
    langToggle: 'EN',
  },
  en: {
    heroTitle: 'Clean Claude Transcripts',
    heroDesc: 'Upload Claude Code exported .zip or .jsonl files. Automatically filters out tool calls and system metadata, keeping only the core conversation.',
    uploadText: 'Drop files here, or <strong>click to browse</strong>',
    uploadHint: 'Supports .zip and .jsonl | Multiple files',
    processing: 'Parsing and filtering...',
    trustPrivacy: 'Local processing',
    trustFast: 'Smart filtering',
    trustPreview: 'Instant preview',
    sessions: 'sessions',
    messages: 'messages',
    kept: 'Kept',
    filtered: 'Filtered',
    ratio: 'Ratio',
    size: 'Size',
    download: 'Download',
    downloadAll: 'Download All',
    preview: 'Preview',
    hide: 'Hide',
    previewHeader: (n) => `Preview (first ${n} messages)`,
    moreMessages: (n) => `+${n} more messages in full download`,
    untitled: 'Untitled Session',
    turns: (n) => `${n} turns`,
    errorUnsupported: (name) => `Unsupported file format: ${name}`,
    errorNoData: 'No valid .jsonl data found',
    langToggle: '中文',
  },
};

let lang = (navigator.language || '').startsWith('zh') ? 'zh' : 'en';
function t(key) { return I18N[lang][key]; }

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n'));
    if (typeof val === 'string') {
      if (val.includes('<')) el.innerHTML = val; else el.textContent = val;
    }
  });
  document.getElementById('langLabel').textContent = t('langToggle');
  if (_sessions.length) renderResults(_sessions);
}

function toggleLang() {
  lang = lang === 'zh' ? 'en' : 'zh';
  applyI18n();
}
window.toggleLang = toggleLang;

// ── DOM ──
const uploadWrap = document.getElementById('uploadWrap');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const processing = document.getElementById('processing');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');
const resultsEl = document.getElementById('results');
const heroSection = document.getElementById('heroSection');

// ── Upload ──
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

async function handleFiles(files) {
  if (!files.length) return;
  processing.classList.add('active');
  resultsEl.classList.remove('active');
  errorMsg.classList.remove('active');

  try {
    const sessions = [];
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        sessions.push(...await processZip(file));
      } else if (name.endsWith('.jsonl')) {
        const text = await file.text();
        sessions.push(processSession(text, null, file.name.replace(/\.jsonl$/i, '')));
      } else {
        throw new Error(t('errorUnsupported')(file.name));
      }
    }
    if (!sessions.length) throw new Error(t('errorNoData'));
    uploadWrap.classList.add('has-results');
    heroSection.classList.add('hidden');
    renderResults(sessions);
  } catch (err) {
    errorText.textContent = err.message;
    errorMsg.classList.add('active');
  } finally {
    processing.classList.remove('active');
    fileInput.value = '';
  }
}

// ── Zip ──
async function processZip(file) {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.keys(zip.files);
  const jsonlFiles = entries.filter(n => n.endsWith('.jsonl'));
  const metadataMap = {};
  for (const n of entries) {
    if (n.endsWith('metadata.json')) {
      metadataMap[n.substring(0, n.lastIndexOf('/'))] = n;
    }
  }
  const sessions = [];
  for (const jf of jsonlFiles) {
    const dir = jf.substring(0, jf.lastIndexOf('/'));
    let metadata = null;
    if (metadataMap[dir]) {
      try { metadata = JSON.parse(await zip.file(metadataMap[dir]).async('string')); } catch (_) {}
    }
    const content = await zip.file(jf).async('string');
    const baseName = jf.substring(jf.lastIndexOf('/') + 1).replace(/\.jsonl$/, '');
    sessions.push(processSession(content, metadata, baseName));
  }
  return sessions;
}

// ── Parse ──
function parseJsonl(content) {
  const messages = [];
  let filteredOut = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let data;
    try { data = JSON.parse(trimmed); } catch (_) { continue; }
    if (!data.message) { filteredOut++; continue; }
    const role = (data.message.role || 'unknown').toUpperCase();
    const raw = data.message.content;
    let text = '';
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = raw.filter(b => b && b.type === 'text').map(b => b.text || '').join('');
    }
    if (text.trim()) {
      messages.push({ role, text: text.trim() });
    } else {
      filteredOut++;
    }
  }
  return { messages, filteredOut };
}

function cleanFilename(name) { return name.replace(/[\\/*?:"<>|]/g, ''); }

function processSession(content, metadata, fallbackName) {
  const { messages, filteredOut } = parseJsonl(content);
  let baseName = fallbackName;
  if (metadata && metadata.title) {
    const safe = cleanFilename(metadata.title.trim());
    if (safe) baseName = safe;
  }
  const outputText = buildOutputText(messages, metadata);
  let createdAt = null;
  if (metadata && metadata.createdAt) {
    try {
      createdAt = new Date(metadata.createdAt).toLocaleString(
        lang === 'zh' ? 'zh-CN' : 'en-US',
        { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }
      );
    } catch (_) {}
  }
  return {
    baseName,
    downloadName: baseName + '_cleaned.txt',
    outputText,
    title: (metadata && metadata.title) || fallbackName,
    model: metadata?.model || null,
    createdAt,
    turns: metadata?.completedTurns || null,
    cwd: metadata?.cwd || null,
    messageCount: messages.length,
    filteredOut,
    outputSize: new Blob([outputText]).size,
    preview: messages.slice(0, 20),
  };
}

function buildOutputText(messages, metadata) {
  const parts = [];
  if (metadata) {
    parts.push('='.repeat(40), ' Metadata', '='.repeat(40));
    parts.push(`Title: ${metadata.title || 'Unknown'}`);
    if (metadata.createdAt) try { parts.push(`Created: ${new Date(metadata.createdAt).toLocaleString()}`); } catch (_) {}
    if (metadata.model) parts.push(`Model: ${metadata.model}`);
    if (metadata.completedTurns) parts.push(`Turns: ${metadata.completedTurns}`);
    if (metadata.cwd) parts.push(`Working Dir: ${metadata.cwd}`);
    parts.push('='.repeat(40), '');
  }
  for (const msg of messages) parts.push(`[${msg.role}]`, msg.text, '-'.repeat(40), '');
  return parts.join('\n');
}

// ── Download ──
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function downloadSession(s) {
  downloadBlob(new Blob([s.outputText], { type: 'text/plain;charset=utf-8' }), s.downloadName);
}
async function downloadAll(sessions) {
  const zip = new JSZip();
  for (const s of sessions) zip.file(s.downloadName, s.outputText);
  downloadBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), 'claude_cleaned_all.zip');
}
window.downloadSession = downloadSession;
window.downloadAll = downloadAll;

// ── SVG ──
const SVG = {
  down: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

// ── Render ──
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function trunc(s, n) { return s.length > n ? s.substring(0, n) + '\u2026' : s; }
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

let _sessions = [];

function renderResults(sessions) {
  _sessions = sessions;
  let html = '';

  if (sessions.length > 1) {
    const totalMsgs = sessions.reduce((a, s) => a + s.messageCount, 0);
    html += `<div class="batch-bar">
      <div class="batch-stats">
        <div class="batch-stat-item"><div class="batch-stat-val">${sessions.length}</div><div class="batch-stat-lbl">${t('sessions')}</div></div>
        <div class="batch-stat-item"><div class="batch-stat-val">${totalMsgs}</div><div class="batch-stat-lbl">${t('messages')}</div></div>
      </div>
      <button class="btn btn-primary" onclick="downloadAll(_sessions)">${SVG.down} ${t('downloadAll')}</button>
    </div>`;
  }

  sessions.forEach((s, i) => {
    const pid = 'preview-' + i;
    const total = s.filteredOut + s.messageCount;
    const pct = total > 0 ? Math.round(s.messageCount / total * 100) : 0;

    html += `<div class="session-card"><div class="session-header">
      <div class="session-title">${esc(s.title || t('untitled'))}</div>
      <div class="session-meta">
        ${s.model ? `<span class="meta-tag"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><span class="meta-val">${esc(s.model)}</span></span>` : ''}
        ${s.createdAt ? `<span class="meta-tag"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="meta-val">${esc(s.createdAt)}</span></span>` : ''}
        ${s.turns ? `<span class="meta-tag"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span class="meta-val">${t('turns')(s.turns)}</span></span>` : ''}
      </div>
    </div>`;

    html += `<div class="session-stats">
      <div class="sstat"><div class="sstat-val green">${s.messageCount}</div><div class="sstat-label">${t('kept')}</div></div>
      <div class="sstat"><div class="sstat-val">${s.filteredOut}</div><div class="sstat-label">${t('filtered')}</div></div>
      <div class="sstat"><div class="sstat-val">${pct}%</div><div class="sstat-label">${t('ratio')}</div></div>
      <div class="sstat"><div class="sstat-val">${fmtSize(s.outputSize)}</div><div class="sstat-label">${t('size')}</div></div>
    </div>`;

    html += `<div class="session-actions">
      <button class="btn btn-primary" onclick="downloadSession(_sessions[${i}])">${SVG.down} ${t('download')}</button>
      <button class="btn btn-ghost" id="tbtn-${i}" onclick="togglePreview('${pid}',this)">${SVG.eyeOff} ${t('hide')}</button>
    </div>`;

    html += `<div class="preview-wrap open" id="${pid}">
      <div class="preview-header">${SVG.chat} ${t('previewHeader')(s.preview.length)}</div>
      <div class="message-list">`;

    s.preview.forEach((m, mi) => {
      const cls = (m.role === 'HUMAN' || m.role === 'USER') ? 'human' : 'assistant';
      html += `<div class="msg ${cls}"><div class="msg-top">
        <span class="msg-role-badge">${esc(m.role)}</span><span class="msg-index">#${mi+1}</span>
      </div><div class="msg-body">${esc(trunc(m.text, 2000))}</div></div>`;
    });

    if (s.messageCount > s.preview.length) {
      html += `<div class="more-indicator">${t('moreMessages')(s.messageCount - s.preview.length)}</div>`;
    }
    html += `</div></div></div>`;
  });

  resultsEl.innerHTML = html;
  resultsEl.classList.add('active');
}

function togglePreview(id, btn) {
  const el = document.getElementById(id);
  const open = el.classList.toggle('open');
  btn.innerHTML = open ? SVG.eyeOff + ' ' + t('hide') : SVG.eye + ' ' + t('preview');
}
window.togglePreview = togglePreview;

// ── Init ──
applyI18n();
