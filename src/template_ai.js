// AI Template - Exports empty JSON with documentation for AI
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const TEMPLATE_JSON = {
  "_documentation": {
    "format": "3LO Project Export v1.0",
    "description": "JSON structure for 3LO Kanban board import",
    "fields": {
      "version": "Format version (string, e.g. '1.0')",
      "project": {
        "id": "Unique project ID (string, no spaces)",
        "name": "Display name (string)",
        "created": "Creation timestamp (number, epoch ms)"
      },
      "board": "Array of columns: {id, title, cards: [{id, text}]}",
      "cards": "Card metadata object: {cardId: {created, modified, note}}",
      "exportedAt": "ISO 8601 export timestamp"
    },
    "rules": [
      "board is array: [{id, title, cards: [...]}]",
      "cards inside board have {id, text} only",
      "cards (root) is metadata: {cardId: {created, modified, note}}",
      "project ID must be unique, no spaces",
      "text supports emoji and unicode"
    ],
    "column_examples": [
      "🔴 High Priority",
      "🟡 Medium Priority", 
      "🟢 Low Priority",
      "✅ Done",
      "🤖 AI Tasks",
      "🎨 Design",
      "⚙️ Development"
    ]
  },
  "version": "1.0",
  "project": {
    "id": "example-ai-project",
    "name": "Example AI Project",
    "created": Date.now()
  },
  "board": [
    {
      "id": "col-example-1",
      "title": "📋 Example Column",
      "cards": [
        {"id": "card-1", "text": "📝 This is a sample card"},
        {"id": "card-2", "text": "✅ Use emoji for clarity"}
      ]
    }
  ],
  "cards": {
    "card-1": {
      "created": Date.now(),
      "modified": Date.now(),
      "note": "Private notes for this card"
    }
  },
  "exportedAt": new Date().toISOString()
};

function initTemplateAI() {
  const templateBtn = document.getElementById("template-ai-btn");
  if (!templateBtn || templateBtn.hasAttribute("data-listener")) return;
  templateBtn.setAttribute("data-listener", "true");
  
  templateBtn.addEventListener("click", async () => {
    try {
      const jsonStr = JSON.stringify(TEMPLATE_JSON, null, 2);
      const filePath = await save({ 
        title: "Download AI Template", 
        defaultPath: "3LO_AI_template.json", 
        filters: [{name: "JSON", extensions: ["json"]}] 
      });
      if (!filePath) return;
      await writeTextFile(filePath, jsonStr);
      alert("✅ Template saved!\n\nUse this file as reference to create 3LO projects with AI.");
    } catch (err) { 
      console.error("Error:", err); 
      alert("Error: " + err.message); 
    }
  });
  console.log("AI Template ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTemplateAI);
} else {
  initTemplateAI();
}
