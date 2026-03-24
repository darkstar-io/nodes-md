'use strict';

const { Router } = require('express');
const noteService = require('../services/noteService');

const router = Router();

// GET /api/notes — list all notes, supports ?search=
router.get('/', (req, res, next) => {
  try {
    const notes = noteService.listNotes(req.query.search || '');
    const summaries = notes.map(({ id, title, createdAt, updatedAt }) => ({
      id,
      title,
      createdAt,
      updatedAt,
    }));
    res.json(summaries);
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:id — get a single note
router.get('/:id', (req, res, next) => {
  try {
    const note = noteService.getNote(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// POST /api/notes — create a note
router.post('/', (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    const note = noteService.createNote({ title: title.trim(), content: content || '' });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:id — update a note
router.put('/:id', (req, res, next) => {
  try {
    const note = noteService.updateNote(req.params.id, req.body);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id — delete a note
router.delete('/:id', (req, res, next) => {
  try {
    const deleted = noteService.deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
