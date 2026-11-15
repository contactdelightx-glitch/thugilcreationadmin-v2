# thugilcreationadmin-v2

Admin dashboard for Thugil Creation, built with React and Vite. Black-and-white design, Google Sans, Hugeicons.

Pages: designs (list, add, edit), images, clients, payments, course payments, users, students, courses
(list, details, create), certificates.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

The app talks to the backend API ([thugilcreationbackend-server](https://github.com/contactdelightx-glitch/thugilcreationbackend-server)).
In development, Vite forwards every `/api` request to `http://localhost:3001` (see `vite.config.js`),
so start the backend first.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Serve the production build locally |

## Layout

```
src/pages/        one file per page
src/components/   shared pieces (trend cards, image library, scroll footer, ...)
src/api.js        every call to the backend
src/navItems.js   the sidebar
src/App.jsx       page switching
```

## Notes

- Long lists load more rows as you scroll (`src/useInfiniteList.js`).
- There is no login yet. Add authentication before putting this anywhere public.
