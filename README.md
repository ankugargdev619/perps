# Perps (Local Setup)

## Backend (FastAPI)

```bash
cd backend # navigate to backend folder
npm install # install all thee packages
npx prisma migrate deploy # deploy all the migrations
npx prisma generate # generate the client
npm run build # build the project 
npm run start # start the server
```

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
