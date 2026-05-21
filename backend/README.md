# Backend (Python + FastAPI)

This backend is built with FastAPI and can be run locally using Uvicorn.

## Setup

1. Create a virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

> Recommended Python version: `python3.14` or `python3.13`

3. Configure PostgreSQL:

```bash
createdb perps
```

The local database connection is configured in `.env`:

```bash
DATABASE_URL=postgresql+psycopg://ankitsinghvedic@localhost:5432/perps
```

4. Start the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

5. Open the API docs:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/redoc

## Health Checks

- `GET /health` checks the API process.
- `GET /health/db` checks PostgreSQL connectivity.
