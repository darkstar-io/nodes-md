'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const matter = require('gray-matter');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureDataDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function notePath(dir, id) {
  return path.join(dir, `${id}.md`);
}

function parseNote(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    content: parsed.content.trim(),
    createdAt: parsed.data.createdAt,
    updatedAt: parsed.data.updatedAt,
  };
}

function listNotes(searchTerm, dir = DATA_DIR) {
  ensureDataDir(dir);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const notes = files.map((f) => parseNote(path.join(dir, f)));

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(term)) ||
        (n.content && n.content.toLowerCase().includes(term))
    );
  }

  return notes;
}

function getNote(id, dir = DATA_DIR) {
  if (!UUID_RE.test(id)) {
    return null;
  }
  ensureDataDir(dir);
  const fp = notePath(dir, id);
  if (!fs.existsSync(fp)) {
    return null;
  }
  return parseNote(fp);
}

function createNote({ title, content = '' }, dir = DATA_DIR) {
  ensureDataDir(dir);
  const id = uuidv4();
  const now = new Date().toISOString();
  const fileContent = matter.stringify(content, {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  });
  fs.writeFileSync(notePath(dir, id), fileContent, 'utf8');
  return { id, title, content, createdAt: now, updatedAt: now };
}

function updateNote(id, { title, content }, dir = DATA_DIR) {
  if (!UUID_RE.test(id)) {
    return null;
  }
  ensureDataDir(dir);
  const fp = notePath(dir, id);
  if (!fs.existsSync(fp)) {
    return null;
  }
  const existing = parseNote(fp);
  const updatedTitle = title !== undefined ? title : existing.title;
  const updatedContent = content !== undefined ? content : existing.content;
  const now = new Date().toISOString();
  const fileContent = matter.stringify(updatedContent, {
    id: existing.id,
    title: updatedTitle,
    createdAt: existing.createdAt,
    updatedAt: now,
  });
  fs.writeFileSync(fp, fileContent, 'utf8');
  return {
    id: existing.id,
    title: updatedTitle,
    content: updatedContent,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

function deleteNote(id, dir = DATA_DIR) {
  if (!UUID_RE.test(id)) {
    return false;
  }
  const fp = notePath(dir, id);
  if (!fs.existsSync(fp)) {
    return false;
  }
  fs.unlinkSync(fp);
  return true;
}

module.exports = { listNotes, getNote, createNote, updateNote, deleteNote };
