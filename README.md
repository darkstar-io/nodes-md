# nodes-md

A lightweight RESTful API for creating and managing markdown notes. Notes are stored as plain `.md` files on the local filesystem with YAML front-matter for metadata.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

## Environment Variables

| Variable   | Default  | Description                           |
|------------|----------|---------------------------------------|
| `PORT`     | `3000`   | Port the Express server listens on    |
| `DATA_DIR` | `./data` | Directory where `.md` note files live |

## API Endpoints

### Health check

```
GET /health
```

Response `200`:
```json
{ "status": "ok" }
```

---

### List all notes

```
GET /api/notes
GET /api/notes?search=<term>
```

Optional `search` query param filters notes whose **title or content** contains the term (case-insensitive).

Response `200`:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Shopping list",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
]
```

---

### Get a single note

```
GET /api/notes/:id
```

Response `200`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Shopping list",
  "content": "- milk\n- eggs\n- bread",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

Response `404` — note not found.

---

### Create a note

```
POST /api/notes
Content-Type: application/json

{ "title": "Shopping list", "content": "- milk\n- eggs" }
```

`title` is required. `content` defaults to an empty string.

Response `201`:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Shopping list",
  "content": "- milk\n- eggs",
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

Response `400` — title missing or empty.

---

### Update a note

```
PUT /api/notes/:id
Content-Type: application/json

{ "title": "Updated title", "content": "Updated body" }
```

Both `title` and `content` are optional; only supplied fields are changed. `updatedAt` is always refreshed.

Response `200` — updated note object.
Response `404` — note not found.

---

### Delete a note

```
DELETE /api/notes/:id
```

Response `204` — no content.
Response `404` — note not found.

---

## Running Tests

```bash
npm test
```

Tests use Jest + Supertest with a temporary directory so no real note files are created or left behind.
