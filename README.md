# Perps (Local Setup)

## Backend (FastAPI)

```bash
cd backend

# Create + activate virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start API server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API docs:

- http://127.0.0.1:8000/docs

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

App:

- http://localhost:3000

## Order Engine

`order_engine/` currently only contains an empty `.env` file and no runnable Node project (no `package.json` / source files). Add the service code (or point this README to where it lives) and update these instructions.
