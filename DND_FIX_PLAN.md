# Piano Fix Drag & Drop - 3LO

## Problemi identificati:
1. Conflitto tra drag-to-scroll e SortableJS (entrambi catturano mouse events)
2. Zoom transform:scale() non compensato nelle coordinate del ghost Sortable
3. Ghost element posizionato male quando zoom != 1.0
4. Colonne non "fanno spazio" durante il drag (problema CSS ghost)

## Soluzione implementata:

### ✅ 1. Disabilitare drag-to-scroll durante il drag Sortable
- Aggiunto flag `isSortableDragging` in board.js
- Modificato `handleDragStart` per escludere `.column-drag-handle` e `.card-drag-handle`
- Aggiunti callback `onStart`/`onEnd` a entrambe le istanze Sortable

### ✅ 2. Compensare lo zoom nel posizionamento del ghost
- Aggiunta variabile CSS `--zoom-level` che si aggiorna con `applyZoom()`
- Modificati `.sortable-fallback-column` e `.sortable-fallback-card` con `transform: scale(calc(1.02 / var(--zoom-level, 1)))`

### ✅ 3. Fixare CSS ghost per far "fare spazio" alle colonne
- Aggiunte dimensioni minime a `.sortable-ghost-column`: `min/max-width: 280px`, `min-height: 150px`
- Aggiunta dimensione minima a `.sortable-ghost-card`: `min-height: 60px`

## File modificati:
- ✅ src/board.js (logica D&D + flag isSortableDragging)
- ✅ src/style.css (stili ghost + compensazione zoom)

## Testare:
1. [ ] Drag colonne con zoom 100% - dovrebbe funzionare senza conflitti
2. [ ] Drag colonne con zoom 150% - ghost dovrebbe seguire il cursore correttamente
3. [ ] Drag schede tra colonne - dovrebbe funzionare a tutti i livelli di zoom
4. [ ] Drag-to-scroll sullo sfondo - dovrebbe funzionare quando non si trascina elementi
5. [ ] Ghost colonne dovrebbe "fare spazio" visivamente durante il drag
