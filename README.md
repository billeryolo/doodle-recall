# Doodle Recall

Doodle each word in 2 seconds, then name your own scribbles from memory.

```bash
npm install
npm run dev      # local dev server
npm test         # matching / seeding / share-link tests
npm run build    # static site in dist/
```

`dist/` is fully static (relative asset paths), so it deploys as-is to GitHub Pages or Netlify.

**Note:** seeded games index into `src/words.ts`. Append new words at the end, or old challenge links will deal different words.
