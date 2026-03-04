# Requirements - 3LO

**Documento versione:** 2026-03-04

## Sistema Operativo

- **Linux:** Ubuntu 22.04+ / Debian 12+ (testato)
- **Windows:** 10/11 (supportato, non testato)
- **macOS:** 12+ (supportato, non testato)

## Dipendenze di Sistema (Ubuntu/Debian)

```bash
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    file \
    libxdo3
```

## Versioni Runtime Richieste

| Tool | Versione Minima | Versione Testata | Comando di verifica |
|------|-----------------|------------------|---------------------|
| Node.js | 20.x LTS | **v22.22.0** | `node --version` |
| npm | 10.x | **10.9.4** | `npm --version` |
| Rust | 1.70+ | **1.93.1** | `rustc --version` |
| Cargo | 1.70+ | **1.93.1** | `cargo --version` |
| Tauri CLI | 2.x | **2.10.1** | `cargo tauri --version` |

## Installazione Passo-Passo

### 1. Node.js + npm

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Rust + Cargo

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 3. Tauri CLI v2

⚠️ **IMPORTANTE:** Usa solo la versione 2, NON la 1!

```bash
# Se hai la vecchia versione v1, disinstallala prima:
cargo uninstall tauri-cli

# Installa v2:
cargo install tauri-cli --version "^2"
```

Verifica:
```bash
cargo tauri --version
# Output atteso: tauri-cli 2.x.x (es. 2.10.1)
```

## Dipendenze del Progetto

### Frontend (package.json)

| Pacchetto | Versione |
|-----------|----------|
| `@tauri-apps/plugin-dialog` | ^2.6.0 |
| `@tauri-apps/plugin-fs` | ^2.4.5 |
| `@tauri-apps/cli` | ^2 |
| `vite` | ^6.0.3 |

### Backend (Cargo.toml)

| Crate | Versione |
|-------|----------|
| `tauri` | 2.0 |
| `tauri-build` | 2.0 |
| `tauri-plugin-dialog` | 2 |
| `tauri-plugin-fs` | 2 |
| `tauri-plugin-sql` | 2 |
| `tauri-plugin-log` | 2 |
| `serde_json` | 1.0 |
| `serde` | 1.0 |
| `log` | 0.4 |

## Verifica Installazione

Dopo l'installazione, esegui:

```bash
node --version      # v22.22.0 (o simile)
npm --version       # 10.9.4 (o simile)
rustc --version     # 1.93.1 (o simile)
cargo --version     # 1.93.1 (o simile)
cargo tauri --version   # 2.10.1 (o simile v2.x)
```

## Build dal Sorgente

```bash
git clone https://github.com/ACarloGitHub/3LO.git
cd 3LO
npm install
cd src-tauri
cargo tauri dev
```

---

*Aggiornato il: 4 Marzo 2026*
