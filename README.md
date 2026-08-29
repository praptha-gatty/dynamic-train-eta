# Dynamic Train ETA

Railwise is now a React + Vite dashboard for train movement, delay context, station ETAs, and route mapping.

## Run locally

Install and start the API from `data-collector`:

```powershell
cd data-collector
npm install
npm start
```

In a second terminal, start the React app:

```powershell
cd data
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`. The React dev server proxies `/api` requests to the Node server on port 3000.

For a production bundle, run `npm run build` inside `data`. The API server serves the generated `data/dist` files automatically when they exist.

The `launch.json` file runs the app in chrome for better UI interaction
