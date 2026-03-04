# 3LO Roadmap 2026

## ✅ Completato (Marzo 2026)

- [x] Setup completo ambiente di sviluppo
- [x] Migrazione a Tauri v2
- [x] Implementazione SQLite per persistenza
- [x] Export nativo con dialog "Save As"
- [x] Import da JSON
- [x] Drag & drop funzionante
- [x] Compilazione multi-piattaforma

---

## 📋 In Sviluppo / Prossimi

### Fase 1: UX/UI Miglioramenti (Q1 2026)

#### 1.1 Zoom e Visualizzazione
- [ ] **Zoom in/out** della board (Ctrl + scroll o bottoni +/-)
- [ ] **Vista adattiva** per vedere tutte le colonne/schede aperte
- [ ] **Full screen mode** (F11)

#### 1.2 Personalizzazione Colori e Tema
- [ ] Scelta colori header (menu a tendina con palette)
- [ ] Scelta sfondo board:
  - [ ] Colori fissi
  - [ ] Gradienti con luminosità regolabile
  - [ ] Immagini JPEG/PNG personalizzate come sfondo
- [ ] Modalità **Light/Dark** toggle

#### 1.3 Bottoni di Azione
- [ ] Sostituire testo con icone **ingranaggi** (⚙️)
- [ ] Posizionare vicino a ogni elemento (progetti, colonne, schede)
- [ ] Menu a comparsa per opzioni specifiche

---

### Fase 2: Funzionalità Avanzate (Q2 2026)

#### 2.1 Ricerca e Filtra
- [ ] Barra di ricerca globale nei progetti
- [ ] Ricerca dentro schede (testo, date, tag)
- [ ] Filtri per stato, data, colore tag

#### 2.2 Personalizzazione Visuale Granulare
- [ ] **Sfondi per progetti** (immagini personalizzate)
- [ ] **Sfondi per colonne** (colori/image)
- [ ] **Sfondi per singole schede** (highlight visivo)
- [ ] Colori personalizzati per categorie/tag

#### 2.3 Allegati e Multimedialità
- [ ] **Attachments** - inserire:
  - [ ] Immagini (JPEG, PNG, WebP)
  - [ ] Documenti (PDF, DOCX)
  - [ ] Video (MP4, WebM)
  - [ ] Link URL cliccabili
- [ ] Preview inline nelle schede
- [ ] **Storage**: file salvati in cartella dedicata del progetto (non nel DB ma riferimento in SQL)

---

### Fase 3: Intelligenza Artificiale (Q2-Q3 2026)

#### 3.1 Integrazione Ollama
- [ ] **Generazione automatica schede** da descrizione testuale
- [ ] **Suggerimenti AI** per completare task
- [ ] **Organizzazione intelligente**: AI propone riordino colonne/schede
- [ ] **Brainstorming**: conversazione con AI per creare struttura progetto

#### 3.2 Interfaccia AI
- [ ] Pulsante "🤖 Chiedi ad Aura" nelle schede
- [ ] Modalità chat sidebar per interazione continua

---

### Fase 4: Collaborazione e Condivisione (Q3 2026)

#### 4.1 Multiutente Locale
- [ ] Spazi di lavoro condivisi
- [ ] Gruppi di lavoro con permessi
- [ ] Versionamento conflitti

#### 4.2 Sync e Cloud (Opzionale)
- [ ] Sincronizzazione P2P (local network)
- [ ] Server self-hostable (per LAN/WAN)
- [ ] Esporta per condivisione via email/link

---

### Fase 5: Funzionalità Speciali (Q3-Q4 2026)

#### 5.1 Social Anxiety Mode 😅
- [ ] **Panic Button**: schermata finta (screensaver Windows XP-style)
- [ ] **Easter egg**: dopo 3 minuti appare vero screensaver XP con icone
- [ ] Colori tenui, contrasto basso per ridurre ansi
- [ ] **Focus mode**: nasconde tutto trattato la colonna attiva
- [ ] Suoni rilassanti opzionali

#### 5.2 Gamification e Easter Eggs
- [ ] Achievement per uso continuo
- [ ] Tema segreto sbloccabile
- [ ] "Carlo Mode" / "Aura Mode" temi speciali

---

### Fase 6: Packaging e Distribuzione (Q4 2026)

#### 6.1 Installer Nativi
- [ ] **Linux**: .deb (Ubuntu/Debian), .rpm (Fedora)
- [ ] **Linux**: AppImage (portable, nessuna installazione)
- [ ] **Windows**: .exe installer + .msi
- [ ] **macOS**: .dmg + .pkg (M1 + Intel)

#### 6.2 Portabilità
- [ ] **Portable mode**: esegui da USB senza installazione
- [ ] **Migrazione dati**: tool per trasferire DB + allegati tra PC
- [ ] **Backup automatico** su Dropbox/Google Drive (opzionale)

#### 6.3 Store
- [ ] Windows Store (Microsoft Store)
- [ ] macOS App Store
- [ ] Linux Flatpak + Snap

---

## 🎯 Priorità Attuale (To-Do Immediate)

1. **Zoom board** - ingrandire/ridurre vista
2. **Colori personalizzabili** - header e sfondi
3. **Ricerca** - trovare velocemente schede
4. **Bottoni ingranaggio** - UI più compatta
5. **Allegati immagini** - base per poi espandere

---

## 📝 Note Tecniche

### Database Schema (SQL)

```sql
-- Attuale
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created INTEGER,
  data TEXT -- JSON con board, cards
);

-- Futuro: allegati
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  card_id TEXT,
  filename TEXT,
  path TEXT, -- percorso file su disco
  type TEXT -- 'image', 'doc', 'video'
);

-- Futuro: utenti/collaborazione
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  avatar_path TEXT
);
```

### Stack Tecnologico Futuro

| Feature | Tecnologia |
|---------|------------|
| Zoom | CSS transform + wheel event |
| Colori | CSS custom properties + color picker |
| Immagini sfondo | CSS background-image + file picker |
| Allegati | tauri-plugin-fs + preview thumbnail |
| AI | Ollama API (localhost:11434) |
| Sync | WebSocket o peerJS (WebRTC) |

---

## 🤝 Team

- **Carlo** - Visione, UX testing, vibe coding partner
- **Aura** - AI assistant, implementation, debugging

**Progetto nato da:** vibe coding session step-by-step

---

*Ultimo aggiornamento: 4 Marzo 2026*
*Stato: Work in Progress - First Release Coming Soon*
