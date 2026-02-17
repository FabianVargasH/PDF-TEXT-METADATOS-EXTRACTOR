const API_BASE = 'http://localhost:8080';
let selectedFile = null;
let currentMode = 'full';
let rawCopyText = '';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');
const browseLink = document.getElementById('browseLink');
const submitBtn = document.getElementById('submitBtn');
const resultsSection = document.getElementById('resultsSection');
const errorSection = document.getElementById('errorSection');
const errorMsg = document.getElementById('errorMsg');
const copyBtn = document.getElementById('copyBtn');
const outputText = document.getElementById('outputText');
const outputMeta = document.getElementById('outputMeta');
const statsBar = document.getElementById('statsBar');
const resultsTitle = document.getElementById('resultsTitle');

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    const rangeOpts = document.getElementById('rangeOptions');
    if (currentMode === 'range') rangeOpts.classList.remove('hidden');
    else rangeOpts.classList.add('hidden');
    });
});

browseLink.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', e => { if (e.target !== browseLink) fileInput.click(); });

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') handleFile(file);
    else showError('Solo se aceptan archivos PDF.');
});

function handleFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    filePreview.classList.add('visible');
    dropzone.classList.add('has-file');
    submitBtn.disabled = false;
    clearResults();
}

removeFile.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.remove('visible');
    dropzone.classList.remove('has-file');
    submitBtn.disabled = true;
    clearResults();
});

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    setLoading(true);
    clearResults();

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
    let url, response;

    if (currentMode === 'full') {
        url = `${API_BASE}/upload`;
        response = await fetch(url, { method: 'POST', body: formData });
    } else if (currentMode === 'range') {
        const start = document.getElementById('startPage').value || '1';
        const end = document.getElementById('endPage').value || '1';
        url = `${API_BASE}/upload-page-range?startPage=${start}&endPage=${end}`;
        response = await fetch(url, { method: 'POST', body: formData });
    } else if (currentMode === 'metadata') {
        url = `${API_BASE}/metadata`;
        response = await fetch(url, { method: 'POST', body: formData });
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
        showError(data.error || 'Error desconocido del servidor.');
        return;
    }

    renderResults(data);
    } catch (err) {
    showError('No se pudo conectar con el servidor. ¿Está corriendo en localhost:8080?');
    } finally {
    setLoading(false);
    }
});

function renderResults(data) {
    resultsSection.classList.remove('hidden');
    statsBar.innerHTML = '';
    outputText.classList.add('hidden');
    outputMeta.classList.add('hidden');

    if (currentMode === 'metadata') {
    const meta = data.metadata;
    resultsTitle.textContent = 'Metadatos del PDF';

    addStat('Páginas', meta.pages);
    addStat('Creado', meta.creationDate);
    addStat('Modificado', meta.modificationDate);

    outputMeta.classList.remove('hidden');
    outputMeta.innerHTML = '';
    const fields = [
        { key: 'Título', val: meta.title },
        { key: 'Autor', val: meta.author },
        { key: 'Asunto', val: meta.subject },
        { key: 'Creador', val: meta.creator },
        { key: 'Productor', val: meta.producer },
        { key: 'Fecha creación', val: meta.creationDate },
        { key: 'Fecha modificación', val: meta.modificationDate },
        { key: 'Páginas totales', val: meta.pages },
    ];
    fields.forEach(f => {
        const item = document.createElement('div');
        item.className = 'meta-item';
        item.innerHTML = `<div class="meta-key">${f.key}</div><div class="meta-val">${f.val || 'N/A'}</div>`;
        outputMeta.appendChild(item);
    });

    rawCopyText = fields.map(f => `${f.key}: ${f.val || 'N/A'}`).join('\n');
    } else {
    const result = data.result;
    const text = result.text || '';

    const label = currentMode === 'range'
        ? `Páginas ${result.startPage}–${result.endPage}`
        : 'Texto extraído';
    resultsTitle.textContent = label;

    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    addStat('Caracteres', charCount.toLocaleString('es'));
    addStat('Palabras', wordCount.toLocaleString('es'));
    if (result.numpages) addStat('Páginas', result.numpages);
    if (result.totalPages) addStat('Total páginas', result.totalPages);

    outputText.classList.remove('hidden');
    outputText.textContent = text || '(No se encontró texto en este PDF)';
    rawCopyText = text;
    }
}

function addStat(label, value) {
    const chip = document.createElement('div');
    chip.className = 'stat-chip';
    chip.innerHTML = `<span>${label}</span><span>${value}</span>`;
    statsBar.appendChild(chip);
}


copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(rawCopyText).then(() => {
    copyBtn.classList.add('copied');
    copyBtn.querySelector('svg').style.color = 'var(--success)';
    const span = copyBtn.childNodes[1];
    span.textContent = ' Copiado!';
    setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.querySelector('svg').style.color = '';
        span.textContent = ' Copiar';
    }, 2000);
    });
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorSection.classList.remove('hidden');
}

function clearResults() {
    resultsSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    rawCopyText = '';
}

function setLoading(loading) {
    submitBtn.classList.toggle('loading', loading);
    submitBtn.disabled = loading;
}