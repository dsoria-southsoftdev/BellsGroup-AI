/* BellsGroup — Inicialización de tema compartido.
   Lee la preferencia guardada en localStorage y aplica .dark-theme al body.
   El toggle de tema vive en Configuración (setTheme); este script solo aplica
   la persistencia al cargar cualquier página del sistema. */
(function () {
  var saved = localStorage.getItem('bells-theme') || 'light';
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
  }
})();
