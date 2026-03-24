'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to control DATA_DIR per test — override it via env before requiring the service
let tmpDir;
let noteService;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'));
  process.env.DATA_DIR = tmpDir;
  // require after env is set so DATA_DIR is picked up
  noteService = require('../src/services/noteService');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
  // clean notes between tests
  fs.readdirSync(tmpDir)
    .filter((f) => f.endsWith('.md'))
    .forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));
});

describe('noteService.createNote', () => {
  test('creates a .md file with correct front-matter', () => {
    const note = noteService.createNote({ title: 'Hello', content: 'World' }, tmpDir);

    expect(note.id).toBeDefined();
    expect(note.title).toBe('Hello');
    expect(note.content).toBe('World');
    expect(note.createdAt).toBeDefined();
    expect(note.updatedAt).toBeDefined();

    const fp = path.join(tmpDir, `${note.id}.md`);
    expect(fs.existsSync(fp)).toBe(true);

    const raw = fs.readFileSync(fp, 'utf8');
    expect(raw).toContain('title: Hello');
    expect(raw).toContain('World');
  });

  test('defaults content to empty string when not provided', () => {
    const note = noteService.createNote({ title: 'Empty' }, tmpDir);
    expect(note.content).toBe('');
  });
});

describe('noteService.getNote', () => {
  test('returns the note object for an existing id', () => {
    const created = noteService.createNote({ title: 'Read Me', content: 'Some text' }, tmpDir);
    const fetched = noteService.getNote(created.id, tmpDir);

    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe('Read Me');
    expect(fetched.content).toBe('Some text');
  });

  test('returns null for a non-existent id', () => {
    expect(noteService.getNote('does-not-exist', tmpDir)).toBeNull();
  });
});

describe('noteService.listNotes', () => {
  test('returns all notes', () => {
    noteService.createNote({ title: 'Note A', content: 'alpha' }, tmpDir);
    noteService.createNote({ title: 'Note B', content: 'beta' }, tmpDir);
    const list = noteService.listNotes('', tmpDir);
    expect(list).toHaveLength(2);
  });

  test('filters by search term in title (case-insensitive)', () => {
    noteService.createNote({ title: 'Shopping list', content: 'milk eggs' }, tmpDir);
    noteService.createNote({ title: 'Meeting notes', content: 'agenda items' }, tmpDir);
    const results = noteService.listNotes('shopping', tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Shopping list');
  });

  test('filters by search term in content (case-insensitive)', () => {
    noteService.createNote({ title: 'Random', content: 'Important information here' }, tmpDir);
    noteService.createNote({ title: 'Other', content: 'nothing special' }, tmpDir);
    const results = noteService.listNotes('IMPORTANT', tmpDir);
    expect(results).toHaveLength(1);
  });
});

describe('noteService.updateNote', () => {
  test('updates title and content, refreshes updatedAt', async () => {
    const created = noteService.createNote({ title: 'Old Title', content: 'old body' }, tmpDir);
    // wait at least 1 ms so Date.now() advances before the update
    await new Promise((r) => setTimeout(r, 2));
    const updated = noteService.updateNote(
      created.id,
      { title: 'New Title', content: 'new body' },
      tmpDir
    );

    expect(updated.title).toBe('New Title');
    expect(updated.content).toBe('new body');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.id).toBe(created.id);
    expect(updated.updatedAt).toBeDefined();
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(created.updatedAt).getTime()
    );
    // verify the persisted value matches what was returned
    const fetched = noteService.getNote(created.id, tmpDir);
    expect(fetched.updatedAt).toBe(updated.updatedAt);
  });

  test('updates only content when title not provided', () => {
    const created = noteService.createNote({ title: 'Keep Title', content: 'old' }, tmpDir);
    const updated = noteService.updateNote(created.id, { content: 'new' }, tmpDir);
    expect(updated.title).toBe('Keep Title');
    expect(updated.content).toBe('new');
  });

  test('returns null for a non-existent id', () => {
    expect(noteService.updateNote('no-such-id', { title: 'x' }, tmpDir)).toBeNull();
  });
});

describe('noteService.deleteNote', () => {
  test('removes the .md file and returns true', () => {
    const note = noteService.createNote({ title: 'Delete Me' }, tmpDir);
    const fp = path.join(tmpDir, `${note.id}.md`);
    expect(fs.existsSync(fp)).toBe(true);

    const result = noteService.deleteNote(note.id, tmpDir);
    expect(result).toBe(true);
    expect(fs.existsSync(fp)).toBe(false);
  });

  test('returns false for a non-existent id', () => {
    expect(noteService.deleteNote('ghost', tmpDir)).toBe(false);
  });
});
