// Template AI - Esporta JSON vuoto con documentazione per AI
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const TEMPLATE_JSON = {
  "_documentation": {
    "format": "3LO Project Export v1.0",
    "description": "Struttura JSON per importazione in 3LO (Kanban board)",
    "fields": {
      "version": "Versione formato (stringa)",
      "project": { "id": "ID univoco", "name": "Nome", "created": "timestamp" },
      "board": "Array colonne con cards",
      "cards": "Oggetto metadata per card"
    },
    "regole": ["board è array", "cards ha id e text"]
  },
  "version": "1.0",
  "project": { "id": "esempio", "name": "Esempio", "created": Date.now() },
  "board": [ { "id": "col-1", "title": "Esempio", "cards": [] } ],
  "cards": {},
  "exportedAt": new Date().toISOString()
};

function initTemplateAI() {
  const templateBtn = document.getElementById("template-ai-btn");
  if (!templateBtn || templateBtn.hasAttribute("data-listener")) return;
  templateBtn.setAttribute("data-listener", "true");
  templateBtn.addEventListener("click", async () => {
    try {
      const jsonStr = JSON.stringify(TEMPLATE_JSON, null, 2);
      const filePath = await save({ title: "Template AI", defaultPath: "3LO_template.json", filters: [{name: "JSON", extensions: ["json"]}] });
      if (!filePath) return;
      await writeTextFile(filePath, jsonStr);
      alert("Template salvato!");
    } catch (err) { console.error(err); alert("Errore: " + err.message); }
  });
  console.log("Template AI pronto");
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTemplateAI);
else initTemplateAI();
