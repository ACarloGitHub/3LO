// Template AI - Esporta JSON vuoto con documentazione per AI
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const TEMPLATE_JSON = {
  "_documentation": {
    "format": "3LO Project Export v1.0",
    "description": "Struttura JSON per importazione in 3LO (Kanban board)",
    "fields": {
      "version": "Versione formato (stringa, es: '1.0')",
      "project": {
        "id": "ID univoco progetto (stringa, no spazi)",
        "name": "Nome visualizzato (stringa)",
        "created": "Timestamp creazione (numero, epoch ms)"
      },
      "board": "Array colonne, ognuna con {id, title, cards: [{id, text}]}",
      "cards": "Oggetto metadata card: {cardId: {created, modified, note}}",
      "exportedAt": "ISO 8601 timestamp export"
    },
    "regole": [
      "board è array: [{id, title, cards: [...]}]",
      "cards dentro board ha solo {id, text}",
      "cards (root) è oggetto metadata: {cardId: {created, modified, note}}",
      "id progetto univoco, senza spazi",
      "text supporta emoji e unicode"
    ],
    "esempio_colonne": [
      "🔴 Priorità Alta",
      "🟡 Priorità Media", 
      "🟢 Priorità Bassa",
      "✅ Completato",
      "🤖 AI Tasks",
      "🎨 Design",
      "⚙️ Sviluppo"
    ]
  },
  "version": "1.0",
  "project": {
    "id": "esempio-progetto-ai",
    "name": "Esempio Progetto AI",
    "created": Date.now()
  },
  "board": [
    {
      "id": "col-esempio-1",
      "title": "📋 Colonna Esempio",
      "cards": [
        {"id": "card-1", "text": "📝 Questa è una scheda di esempio"},
        {"id": "card-2", "text": "✅ Usa emoji per rendere tutto più chiaro"}
      ]
    }
  ],
  "cards": {
    "card-1": {
      "created": Date.now(),
      "modified": Date.now(),
      "note": "Note private per questa scheda"
    }
  },
  "exportedAt": new Date().toISOString()
};

const templateBtn = document.getElementById('template-ai-btn');

if (templateBtn && !templateBtn.hasAttribute('data-listener')) {
  templateBtn.setAttribute('data-listener', 'true');
  
  templateBtn.addEventListener('click', async () => {
    try {
      const jsonStr = JSON.stringify(TEMPLATE_JSON, null, 2);
      const filename = '3LO_template_per_AI.json';
      
      const filePath = await save({
        title: 'Scarica Template AI',
        defaultPath: filename,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      
      if (!filePath) return;
      
      await writeTextFile(filePath, jsonStr);
      alert('✅ Template salvato!\\n\\nUsa questo file come riferimento per chiedere a un\'AI di creare progetti 3LO.');
      
    } catch (err) {
      console.error('Errore template:', err);
      alert('❌ Errore: ' + err.message);
    }
  });
}
