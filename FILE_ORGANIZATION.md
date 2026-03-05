# 📁 Organizzazione File 3LO

## Struttura Progetto

```
3lo/
├── src/                          # Codice sorgente frontend
│   ├── index.html                # Home: gestione progetti
│   ├── home.js                   # Logica home (lista progetti)
│   ├── home.html                 # (opzionale) Template home
│   ├── board.html                # Board Kanban
│   ├── board.js                  # Logica board (colonne e schede)
│   ├── style.css                 # Stili globali
│   ├── db_sqlite.js              # Database SQLite (Tauri plugin)
│   ├── db.js                     # Database vecchio (localStorage)
│   ├── import_handler.js         # Gestione import progetti
│   ├── diagnostic.js             # Tool diagnostici
│   ├── icons/                    # Icone e logo
│   │   ├── logo.svg              # Logo 3LO vettoriale
│   │   └── ...
│   └── public/                   # Asset statici
├── src-tauri/                    # Backend Rust + Tauri
│   ├── src/
│   │   └── main.rs               # Entry point Rust
│   ├── Cargo.toml                # Dipendenze Rust
│   ├── tauri.conf.json           # Configurazione Tauri
│   └── capabilities/
│       └── default.json          # Permessi app
├── scalette/                     # Export progetti JSON
│   └── *.json                    # File scalette salvate
├── node_modules/                 # Dipendenze npm (non committare)
├── package.json                  # Config npm
└── README.md                     # Questo file
```

## Convenzioni Nomi File

| Tipo | Pattern | Esempio |
|------|---------|---------|
| JavaScript moduli | `nome_modulo.js` | `db_sqlite.js` |
| HTML pagine | `nome.html` | `board.html` |
| CSS | `style.css` (singolo) | `style.css` |
| Backup | `*.backup_YYYYMMDD` | `home.js.backup_20260304` |
| Scalette JSON | `scala_YYYY-MM-DD_valido.json` | `scala_2025-03-05_valido.json` |

## Formato JSON Export (v1.0)

Ogni file `.json` esportato include documentazione inline nel campo `_documentation`.

### Schema minimo richiesto:

```json
{
  "version": "1.0",
  "project": {
    "id": "id-progetto-unico",
    "name": "Nome Progetto",
    "created": 1741184040000
  },
  "board": [
    {
      "id": "col-1",
      "title": "Titolo Colonna",
      "cards": [
        {"id": "card-1", "text": "Testo scheda"}
      ]
    }
  ],
  "cards": {},
  "exportedAt": "2025-03-05T14:30:00.000Z"
}
```

### Regole Importanti:

1. **`board`** è un **array** di colonne
2. Ogni colonna ha: `id`, `title`, `cards` (array)
3. Le card hanno solo: `id`, `text` (il contenuto visibile)
4. **`cards`** (alla root) è un **oggetto** vuoto `{}` o con metadata
5. **non** duplicare i dati tra `board` e `cards`

## Flusso Dati

```
User → Frontend (JS) → Tauri Command → SQLite DB
                         ↓
                    File System (export/import)
```

## Git Workflow

```bash
# Modifiche quotidiane
git add src/
git commit -m "feat: descrizione cambiamento"
git push origin main

# Backup completo
tar czf 3lo_backup_$(date +%Y%m%d).tar.gz ~/progetti/3lo --exclude='node_modules' --exclude='src-tauri/target'
```

## Percorsi Importanti

- **Database SQLite**: `~/progetti/3lo/src-tauri/3lo.db` (in prod)
- **Log diari**: `~/.openclaw/Terra/memory/`
- **Export progetti**: `~/progetti/3lo/scalette/`

---

*Ultimo aggiornamento: 2025-03-05*
