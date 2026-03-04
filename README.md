# 3LO - Offline Kanban Board 🌙

Your tasks, your data, your control.

3LO is a free, open-source, offline-first Kanban board — a Trello alternative that respects your privacy. No subscriptions, no cloud lock-in, no data mining. Just you and your projects.

## ✅ Current Status (March 2026)

**3LO is functional and ready to use!**

- ✅ **Tauri v2** - Native app with Rust backend
- ✅ **SQLite Database** - Persistent storage (replaced localStorage)
- ✅ **Export Projects** - Save as JSON with native Save dialog
- ✅ **Import Projects** - Load JSON backups
- ✅ **Drag & Drop** - SortableJS for cards and columns
- ✅ **Cross-platform** - Linux (Windows/macOS coming)

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Install Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 3. Install Tauri CLI v2
cargo install tauri-cli --version "^2"

# 4. Install system dependencies (Ubuntu/Debian)
sudo apt install -y libwebkit2gtk-4.1-dev build-essential libssl-dev libgtk-3-dev
```

### Clone and Run

```bash
git clone https://github.com/ACarloGitHub/3LO.git
cd 3LO
npm install
cd src-tauri
cargo tauri dev
```

## ✨ Features

| Feature | Status |
|---------|--------|
| Project Management | ✅ Working |
| Kanban Boards | ✅ Working |
| Drag & Drop | ✅ Working |
| Export to JSON | ✅ Working (native Save dialog) |
| Import from JSON | ✅ Working |
| SQLite Database | ✅ Working |
| Dark Theme | 🚧 Default (Light coming) |
| AI Integration | 📅 Planned |
| File Attachments | 📅 Planned |
| Collaborative | 📅 Future |

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Rust + Tauri v2
- **Database:** SQLite (via `tauri-plugin-sql`)
- **UI:** Custom Kanban with SortableJS
- **Storage:** Local SQLite file (portable)

## 💾 Data Storage

Projects are stored in:
```
Linux: ~/.config/3LO/3lo.db
Windows: %APPDATA%\3LO\3lo.db
macOS: ~/Library/Application Support/3LO/3lo.db
```

**Backup:** Use the Export button to save JSON backups that can be imported anywhere.

## 🗺️ Roadmap 2026

See [ROADMAP.md](ROADMAP.md) for detailed feature planning.

## 🤝 Contributing

Made with ❤️ by Carlo and Aura.

## 📄 License

MIT
