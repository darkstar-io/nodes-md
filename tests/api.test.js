'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const request = require('supertest');

let tmpDir;
let app;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-api-test-'));
  process.env.DATA_DIR = tmpDir;
  // Require app after DATA_DIR is set
  jest.resetModules();
  app = require('../src/index');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
  fs.readdirSync(tmpDir)
    .filter((f) => f.endsWith('.md'))
    .forEach((f) => fs.unlinkSync(path.join(tmpDir, f)));
});

describe('GET /health', () => {
  test('returns 200 with {status: ok}', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/notes', () => {
  test('creates a note and returns 201', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test Note', content: 'Hello world' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Test Note');
    expect(res.body.content).toBe('Hello world');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  test('creates a note with empty content when content omitted', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'No Content' });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe('');
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/notes').send({ content: 'No title here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when title is empty string', async () => {
    const res = await request(app).post('/api/notes').send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/notes/:id', () => {
  test('returns the note for an existing id', async () => {
    const created = await request(app)
      .post('/api/notes')
      .send({ title: 'Fetch Me', content: 'content here' });

    const res = await request(app).get(`/api/notes/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('Fetch Me');
    expect(res.body.content).toBe('content here');
  });

  test('returns 404 for a non-existent id', async () => {
    const res = await request(app).get('/api/notes/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/notes', () => {
  test('returns an array of note summaries', async () => {
    await request(app).post('/api/notes').send({ title: 'Alpha', content: 'a' });
    await request(app).post('/api/notes').send({ title: 'Beta', content: 'b' });

    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    // summaries should NOT include content
    expect(res.body[0]).not.toHaveProperty('content');
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('createdAt');
    expect(res.body[0]).toHaveProperty('updatedAt');
  });

  test('filters by ?search= query param', async () => {
    await request(app).post('/api/notes').send({ title: 'Shopping', content: 'milk eggs' });
    await request(app).post('/api/notes').send({ title: 'Meeting', content: 'agenda' });

    const res = await request(app).get('/api/notes?search=shopping');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Shopping');
  });
});

describe('PUT /api/notes/:id', () => {
  test('updates a note and returns the updated object', async () => {
    const created = await request(app)
      .post('/api/notes')
      .send({ title: 'Original', content: 'old content' });

    const res = await request(app)
      .put(`/api/notes/${created.body.id}`)
      .send({ title: 'Updated', content: 'new content' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.content).toBe('new content');
    expect(res.body.createdAt).toBe(created.body.createdAt);
  });

  test('returns 404 for a non-existent id', async () => {
    const res = await request(app).put('/api/notes/nope').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/notes/:id', () => {
  test('deletes a note and returns 204', async () => {
    const created = await request(app).post('/api/notes').send({ title: 'Delete Me' });

    const res = await request(app).delete(`/api/notes/${created.body.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/api/notes/${created.body.id}`);
    expect(check.status).toBe(404);
  });

  test('returns 404 for a non-existent id', async () => {
    const res = await request(app).delete('/api/notes/ghost-id');
    expect(res.status).toBe(404);
  });
});
