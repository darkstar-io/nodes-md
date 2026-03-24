'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let notes = [];
let selectedId = null;
let editingId = null; // null means "new note", a string means "editing existing"

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const noResults = document.getElementById('no-results');
const searchInput = document.getElementById('search-input');
const btnNew = document.getElementById('btn-new');

const placeholder = document.getElementById('placeholder');
const noteView = document.getElementById('note-view');
const noteTitle = document.getElementById('note-title');
const noteMeta = document.getElementById('note-meta');
const noteBody = document.getElementById('note-body');
const btnEdit = document.getElementById('btn-edit');
const btnDelete = document.getElementById('btn-delete');

const noteForm = document.getElementById('note-form');
const formTitle = document.getElementById('form-title');
const formError = document.getElementById('form-error');
const inputTitle = document.getElementById('input-title');
const inputContent = document.getElementById('input-content');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    throw new Error('Network error — please check your connection and try again.');
  }
  if (res.status === 204) return null;
  return res.json().then((data) => ({ ok: res.ok, status: res.status, data }));
}

async function fetchNotes(search = '') {
  const url = search ? `/api/notes?search=${encodeURIComponent(search)}` : '/api/notes';
  const result = await apiFetch(url);
  return result.ok ? result.data : [];
}

async function fetchNote(id) {
  const result = await apiFetch(`/api/notes/${id}`);
  return result.ok ? result.data : null;
}

async function createNote(title, content) {
  return apiFetch('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
}

async function updateNote(id, title, content) {
  return apiFetch(`/api/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content }),
  });
}

async function deleteNote(id) {
  const result = await apiFetch(`/api/notes/${id}`, { method: 'DELETE' });
  return result === null; // apiFetch returns null for 204 No Content
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderList(data) {
  notesList.innerHTML = '';

  if (data.length === 0) {
    if (searchInput.value.trim()) {
      noResults.classList.remove('hidden');
      emptyState.classList.add('hidden');
    } else {
      emptyState.classList.remove('hidden');
      noResults.classList.add('hidden');
    }
    return;
  }

  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');

  data.forEach((note) => {
    const li = document.createElement('li');
    li.dataset.id = note.id;
    if (note.id === selectedId) li.classList.add('selected');

    const titleEl = document.createElement('div');
    titleEl.className = 'note-item-title';
    titleEl.textContent = note.title;

    const dateEl = document.createElement('div');
    dateEl.className = 'note-item-date';
    dateEl.textContent = formatDate(note.updatedAt);

    li.appendChild(titleEl);
    li.appendChild(dateEl);
    li.addEventListener('click', () => selectNote(note.id));
    notesList.appendChild(li);
  });
}

function showPlaceholder() {
  placeholder.classList.remove('hidden');
  noteView.classList.add('hidden');
  noteForm.classList.add('hidden');
}

function showNoteView(note) {
  placeholder.classList.add('hidden');
  noteForm.classList.add('hidden');
  noteView.classList.remove('hidden');

  noteTitle.textContent = note.title;
  noteMeta.textContent = `Updated ${formatDate(note.updatedAt)}`;
  noteBody.innerHTML = DOMPurify.sanitize(marked.parse(note.content || ''));
}

function showNoteForm(note = null) {
  placeholder.classList.add('hidden');
  noteView.classList.add('hidden');
  noteForm.classList.remove('hidden');

  formError.classList.add('hidden');
  formError.textContent = '';

  if (note) {
    formTitle.textContent = 'Edit Note';
    inputTitle.value = note.title;
    inputContent.value = note.content || '';
    editingId = note.id;
  } else {
    formTitle.textContent = 'New Note';
    inputTitle.value = '';
    inputContent.value = '';
    editingId = null;
  }

  inputTitle.focus();
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function loadNotes(search = '') {
  try {
    notes = await fetchNotes(search);
  } catch (err) {
    notes = [];
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  }
  renderList(notes);
}

async function selectNote(id) {
  selectedId = id;
  renderList(notes);

  const note = await fetchNote(id);
  if (note) {
    showNoteView(note);
  }
}

async function handleSave() {
  const title = inputTitle.value.trim();
  const content = inputContent.value;

  if (!title) {
    formError.textContent = 'Title is required.';
    formError.classList.remove('hidden');
    inputTitle.focus();
    return;
  }

  formError.classList.add('hidden');

  let result;
  try {
    if (editingId) {
      result = await updateNote(editingId, title, content);
    } else {
      result = await createNote(title, content);
    }
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
    return;
  }

  if (!result.ok) {
    formError.textContent = (result.data && result.data.error) || 'An error occurred.';
    formError.classList.remove('hidden');
    return;
  }

  const saved = result.data;
  selectedId = saved.id;

  await loadNotes(searchInput.value.trim());
  showNoteView(saved);
}

async function handleDelete() {
  if (!selectedId) return;

  const confirmed = window.confirm('Delete this note? This cannot be undone.');
  if (!confirmed) return;

  let ok;
  try {
    ok = await deleteNote(selectedId);
  } catch (err) {
    alert(err.message);
    return;
  }

  if (ok) {
    selectedId = null;
    await loadNotes(searchInput.value.trim());
    showPlaceholder();
  } else {
    alert('Failed to delete the note. It may have already been removed.');
    await loadNotes(searchInput.value.trim());
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
btnNew.addEventListener('click', () => {
  selectedId = null;
  renderList(notes);
  showNoteForm(null);
});

btnEdit.addEventListener('click', async () => {
  if (!selectedId) return;
  const note = await fetchNote(selectedId);
  if (note) showNoteForm(note);
});

btnDelete.addEventListener('click', handleDelete);

btnSave.addEventListener('click', handleSave);

btnCancel.addEventListener('click', () => {
  if (selectedId) {
    fetchNote(selectedId).then((note) => {
      if (note) showNoteView(note);
      else showPlaceholder();
    });
  } else {
    showPlaceholder();
  }
});

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadNotes(searchInput.value.trim());
  }, 300);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
loadNotes();
showPlaceholder();
