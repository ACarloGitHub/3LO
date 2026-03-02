# 3LO - Offline Kanban Board

Your tasks, your data, your control.

3LO is a free, open-source, offline-first Kanban board — a Trello alternative that respects your privacy. No subscriptions, no cloud lock-in, no data mining. Just you and your projects.

## Current Status

This project is in active development.

We are building 3LO step by step. It works and you can try it today, but you will need to build from source (see Prerequisites below).

Our Goal: Make 3LO a one-click installable, portable, cross-platform application. Each project stays in its own folder, wherever you want. No cloud, no accounts, no dependencies after installation.

## Features

- Project Management - Create, organize, and manage multiple boards
- Kanban Boards - Columns, cards, drag and drop (powered by SortableJS)
- 100% Offline - All data stored locally in your folders
- Lightning Fast - Built with Tauri, under 10MB bundle
- Dark Theme - Easy on the eyes, with light theme coming
- AI Ready - Planned integration with local Ollama models
- Attachments - Link files, URLs, documents to cards
- Nested Boards - Sub-columns for complex workflows

## Prerequisites (Current)

To run 3LO today, you will need:

- Rust (https://rustup.rs/)
- Node.js (https://nodejs.org/)
- Tauri CLI (https://tauri.app/)

## Build and Run (Development)

    git clone https://github.com/ACarloGitHub/3LO.git
    cd 3LO
    cargo tauri dev

## Future Distribution

The goal of Aura and Carlo is to make 3LO:

- One-click installable - Download, double-click, done
- Portable - Run from USB, no system installation
- Cross-platform - Linux, macOS, Windows
- Self-contained - Each project lives in its own folder, fully portable

Coming soon: .deb (Ubuntu/Debian), .AppImage (portable Linux), .exe (Windows), .dmg (macOS)

## Tech Stack

- Frontend: Vanilla JavaScript, HTML5, CSS3
- Backend: Rust + Tauri
- Storage: localStorage (MVP) to SQLite (v1.0)
- UI: Custom Kanban with SortableJS
- Build: Tauri (cross-platform native apps)

## Roadmap

- [x] MVP with drag and drop
- [x] Project management
- [x] Export to JSON
- [ ] SQLite database
- [ ] Light/Dark theme toggle
- [ ] AI integration (Ollama)
- [ ] Nested columns
- [ ] File attachments
- [ ] Self-hosting mode
- [ ] Windows and macOS builds
- [ ] One-click installers

## Why 3LO?

We were tired of subscriptions, cloud dependencies, and not owning our own tools.
This is for people who want control over their productivity software.
Local-first, extensible, yours forever.

## Contributing

This is a personal project born from vibe coding with my AI assistant Aura.
Contributions welcome! Open an issue or PR.

## License

MIT - Use it, modify it, make it yours.

---

Made with love by Carlo and Aura
