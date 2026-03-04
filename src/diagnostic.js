window.onerror = function(msg, url, line, col, error) {
  document.body.innerHTML = '<h2 style="color:red; font-family:sans-serif; padding:20px;">ERRORE JAVASCRIPT</h2>' +
    '<pre style="background:#f0f0f0; padding:20px;">' +
    'Messaggio: ' + msg + '<br>' +
    'File: ' + url + '<br>' +
    'Riga: ' + line + '<br>' +
    'Errore: ' + (error && error.stack ? error.stack : 'N/A') +
    '</pre>';
  return false;
};

console.log('=== DIAGNOSTIC: Pagina caricata ===');
console.log('Home dir:', localStorage.getItem('3lo_projects'));
