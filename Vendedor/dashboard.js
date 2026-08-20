/* ==========================================================================
   BellsGroup CRM - Dashboard Comercial Logic (Refactored for MPA)
   ========================================================================== */

// --- Variables de Estado Global ---
let activeChartTab = 'projections';
let chartInstance = null;

// --- Mocks Iniciales ---
let mockActivities = [
  { id: 1, avatar: 'CA', user: 'Carlos (Tú)', time: 'Hace 2 horas', type: 'cobrado', text: 'Pasó a <span class="dot cobrado"></span><strong>Cobrado</strong> el prospecto <strong>Marta Gómez</strong> tras confirmación de transferencia.' },
  { id: 2, avatar: 'CA', user: 'Carlos (Tú)', time: 'Hace 3 días', type: 'prospecto', text: 'Creó cotización de Seguro de Vida para <strong>Lucía Fernández</strong>.' },
  { id: 3, avatar: 'CA', user: 'Carlos (Tú)', time: 'Hace 1 semana', type: 'emitido', text: 'Sincronizó póliza de <strong>Pedro Almodóvar</strong> desde Zurich: Estado cambiado a <span class="dot emitido"></span><strong>Emitido</strong>.' },
  { id: 4, avatar: 'CA', user: 'Carlos (Tú)', time: 'Hace 2 semanas', type: 'prospecto', text: 'Registró nuevo prospecto de Seguro de Retiro para <strong>Tomás Restrepo</strong>.' },
  { id: 5, avatar: 'CA', user: 'Carlos (Tú)', time: 'Hace 3 semanas', type: 'cobrado', text: 'Cobró la primera cuota del Seguro de Retiro de <strong>Julio Martínez</strong>.' }
];

let mockPendings = [
  { id: 1, type: 'call', title: 'Llamar a Lucía Fernández', subtitle: '14:30 - Seguimiento seguro automotor', actionText: 'Llamar', actionUrl: 'tel:+5491134456677', completed: false },
  { id: 2, type: 'doc', title: 'Solicitar DNI/CUIT: María Gómez', subtitle: '16:00 - Póliza de Vida en emisión', actionText: 'WhatsApp', actionUrl: 'https://wa.me/5491134456677', completed: false },
  { id: 3, type: 'entrevista', title: 'Entrevista: Claudio Sola', subtitle: '10:00 - Presentar propuesta Retiro Gold', actionText: 'Reunión', actionUrl: '#', completed: false },
  { id: 4, type: 'call', title: 'Seguimiento a Julio Martínez', subtitle: 'Confirmar recepción de póliza', actionText: 'Llamar', actionUrl: 'tel:+5491134456677', completed: false }
];

// --- Configuración Inicial ---
document.addEventListener("DOMContentLoaded", () => {
  initUserSession();
  renderActivities();
  renderPendings();
  renderCampaigns();

  // Inicializar el valor del simulador con la prima promedio histórico configurada
  const calculatedAvg = getHistoricalAveragePremium();
  const sliderPremium = document.getElementById('slider-premium-avg');
  if (sliderPremium) {
    sliderPremium.value = calculatedAvg;
  }

  // Inicializar el valor del simulador con la tasa de conversión histórica configurada
  const calculatedConv = getHistoricalConversionRate();
  const sliderConversion = document.getElementById('slider-conversion');
  if (sliderConversion) {
    sliderConversion.value = calculatedConv;
  }

  calculateProjections();
  initCalendar();
  updateIncomeKpis();
  fetchUsdToArsRate();

  // HTML Dialog Light Dismiss fallback
  const dialogElement = document.getElementById('new-prospect-dialog');
  if (dialogElement && !('closedBy' in HTMLDialogElement.prototype)) {
    dialogElement.addEventListener('click', (event) => {
      if (event.target !== dialogElement) return;
      const rect = dialogElement.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (isDialogContent) return;
      dialogElement.close();
    });
  }

  // Handle action parameter or hash to open modals on load
  const hash = window.location.hash;
  if (hash === '#prospect') {
    openProspectModal();
  } else if (hash === '#simulations') {
    openSimulationsModal();
  } else if (hash === '#report') {
    openReportModal();
  } else if (hash === '#history') {
    openHistoryModal();
  }
});


/**
 * Inicializa y valida la sesión del usuario del localStorage, aplicando lógica de roles en UI.
 */
function initUserSession() {
  const storedRole = localStorage.getItem('bells_user_role') || 'Asesor';
  const storedName = localStorage.getItem('bells_user_name') || 'Carlos';

  // Mostrar perfil en el Navbar
  const displayNameEl = document.getElementById('user-display-name');
  const displayRoleEl = document.getElementById('user-display-role');
  const avatarEl = document.getElementById('user-avatar');

  if (displayNameEl) displayNameEl.textContent = storedName;
  if (displayRoleEl) displayRoleEl.textContent = storedRole === 'Team Leader' ? 'Team Leader / PASS' : 'Asesor Comercial';
  if (avatarEl) avatarEl.textContent = storedName.charAt(0).toUpperCase();

  // Bienvenida principal
  const welcomeUserName = document.getElementById('welcome-user-name');
  if (welcomeUserName) welcomeUserName.textContent = storedName;
  
  const welcomeDateEl = document.getElementById('welcome-date');
  if (welcomeDateEl) {
    const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    welcomeDateEl.textContent = today.charAt(0).toUpperCase() + today.slice(1);
  }
  
  // Resumen del día
  const welcomeSummaryEl = document.getElementById('welcome-summary');
  if (welcomeSummaryEl) {
    welcomeSummaryEl.innerHTML = '';
  }

}

// ==========================================================================
// Módulo: Warmups y Agenda de Pendientes
// ==========================================================================

function warmupDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function warmupRegistrationDate(client) {
  if (!client.history || client.history.length === 0) return null;
  const oldest = client.history[client.history.length - 1];
  return oldest && oldest.date ? oldest.date : null;
}

function buildWarmupMessage(type, client) {
  const firstName = client && client.name ? client.name.split(' ')[0] : 'Cliente';
  if (type === 'birthday') {
    return `¡Hola ${firstName}! 🎂 ¡Feliz cumpleaños! Espero que tengas un día increíble rodeado de los tuyos. Un abrazo enorme!`;
  }
  return `¡Hola ${firstName}! ❤️ ¡Feliz aniversario de nuestro vínculo! Gracias por la confianza de siempre.`;
}

function getTodayWarmups() {
  const prospects = getProspects();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dismissed = JSON.parse(localStorage.getItem('bells-warmup-dismissed') || '{}');
  const warmups = [];

  prospects.forEach(client => {
    if (!client || client.status === 'descartado') return;

    if (client.birthDate) {
      const bd = new Date(client.birthDate + 'T00:00:00');
      if (!isNaN(bd.getTime()) && bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth()) {
        const key = `${client.id}-birthday-${warmupDateKey(today)}`;
        if (!dismissed[key]) {
          warmups.push({
            key,
            clientId: client.id,
            name: client.name,
            type: 'birthday',
            title: `¡Llamar a ${client.name} hoy!`,
            subtitle: 'Le deseas un feliz cumpleaños',
            message: buildWarmupMessage('birthday', client),
            actionUrl: `https://wa.me/${(client.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildWarmupMessage('birthday', client))}`
          });
        }
      }
    }

    const regDateStr = warmupRegistrationDate(client);
    if (regDateStr) {
      const rd = new Date(regDateStr + 'T00:00:00');
      if (!isNaN(rd.getTime()) && rd.getDate() === today.getDate() && rd.getMonth() === today.getMonth()) {
        const key = `${client.id}-anniversary-${warmupDateKey(today)}`;
        if (!dismissed[key]) {
          warmups.push({
            key,
            clientId: client.id,
            name: client.name,
            type: 'anniversary',
            title: `¡Llamar a ${client.name} hoy!`,
            subtitle: 'Le deseas feliz aniversario de vínculo',
            message: buildWarmupMessage('anniversary', client),
            actionUrl: `https://wa.me/${(client.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildWarmupMessage('anniversary', client))}`
          });
        }
      }
    }
  });

  return warmups;
}

function toggleWarmup(key) {
  const dismissed = JSON.parse(localStorage.getItem('bells-warmup-dismissed') || '{}');
  dismissed[key] = true;
  localStorage.setItem('bells-warmup-dismissed', JSON.stringify(dismissed));
  showNotification('warmup-done', '¡Warmup completado!', 'success');
  renderPendings();
}

function renderPendings() {
  const container = document.getElementById('pending-list');
  const countBadge = document.getElementById('pending-count');
  if (!container) return;

  const todayWarmups = getTodayWarmups();
  const allItems = [];

  // 1. Agregar Warmups (Cumpleaños/Aniversario) al inicio
  todayWarmups.forEach(w => {
    allItems.push({
      id: w.key,
      isWarmup: true,
      type: 'warmup',
      title: w.title,
      subtitle: w.subtitle,
      actionText: w.type === 'birthday' ? 'Saludar 🎂' : 'Saludar ❤️',
      actionUrl: w.actionUrl,
      completed: false
    });
  });

  // 2. Agregar tareas y pendientes normales
  mockPendings.forEach(p => allItems.push({ ...p, isWarmup: false }));

  if (countBadge) {
    countBadge.textContent = allItems.filter(item => !item.completed).length;
  }

  if (allItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 13px;">
        <i class="fa-solid fa-square-check" style="font-size: 20px; opacity: 0.5; margin-bottom: 8px; display: block;"></i>
        ¡Todo al día por hoy!
      </div>
    `;
    return;
  }

  container.innerHTML = allItems.map(item => {
    let iconClass = 'fa-phone';
    if (item.type === 'doc') iconClass = 'fa-file-invoice';
    if (item.type === 'warn') iconClass = 'fa-triangle-exclamation';
    if (item.type === 'warmup') iconClass = 'fa-wand-magic-sparkles';

    const checkboxHtml = item.isWarmup 
      ? `<input type="checkbox" class="pending-checkbox" onclick="toggleWarmup('${item.id}')">`
      : `<input type="checkbox" class="pending-checkbox" ${item.completed ? 'checked' : ''} onclick="togglePending(${item.id})">`;

    const actionHtml = item.actionUrl && item.actionUrl !== '#'
      ? `<a href="${item.actionUrl}" target="_blank" class="pending-action-btn" onclick="executePendingAction(event, '${item.id}')">
           <span>${item.actionText || 'Ver'}</span>
           <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 9px;"></i>
         </a>`
      : `<button class="pending-action-btn" onclick="executePendingAction(event, '${item.id}')">
           <span>${item.actionText || 'Completar'}</span>
         </button>`;

    return `
      <div class="pending-item ${item.completed ? 'completed' : ''}">
        <div class="pending-checkbox-container">
          ${checkboxHtml}
        </div>
        <div class="pending-icon-wrapper ${item.type}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="pending-content">
          <span class="pending-title">${item.title}</span>
          <span class="pending-subtitle">${item.subtitle}</span>
          <div class="pending-actions">
            ${actionHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function togglePending(id) {
  const item = mockPendings.find(p => p.id === id);
  if (item) {
    item.completed = !item.completed;
    showNotification('pending-toggle', item.completed ? 'Tarea completada' : 'Tarea reabierta', 'info');
    renderPendings();
  }
}

function executePendingAction(e, id) {
  if (id.toString().includes('warmup')) {
    // Si es warmup, no prevenimos el redirect de whatsapp, pero marcamos como dismiss
    const dismissed = JSON.parse(localStorage.getItem('bells-warmup-dismissed') || '{}');
    dismissed[id] = true;
    localStorage.setItem('bells-warmup-dismissed', JSON.stringify(dismissed));
    setTimeout(() => {
      renderPendings();
    }, 500);
  }
}

// ==========================================================================
// Módulo: Buscador IA e Historial de Actividad
// ==========================================================================

function handleSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('quick-search-input').value.trim();
    if (query) {
      window.location.href = `Clientes.html?search=${encodeURIComponent(query)}`;
    }
  }
}

function applyAiSuggestion(suggestionText) {
  const input = document.getElementById('ai-search-input');
  if (input) {
    input.value = suggestionText;
    toggleAiSearchClear();
    executeAiSearch();
  }
}

function toggleAiSearchClear() {
  const input = document.getElementById('ai-search-input');
  const clearBtn = document.getElementById('ai-search-clear');
  if (!input || !clearBtn) return;
  clearBtn.style.display = input.value.trim() ? 'inline-flex' : 'none';
}

function clearAiSearch() {
  const input = document.getElementById('ai-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const clearBtn = document.getElementById('ai-search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
  closeAiResults();
}

function handleAiSearchKeyPress(event) {
  if (event.key === 'Enter') {
    executeAiSearch();
  }
}

function executeAiSearch() {
  const query = document.getElementById('ai-search-input').value.trim().toLowerCase();
  if (!query) return;
  toggleAiSearchClear();

  const loader = document.getElementById('ai-search-loader');
  const resultsCard = document.getElementById('ai-results-card');

  if (loader) loader.style.display = 'flex';
  if (resultsCard) resultsCard.style.display = 'none';

  setTimeout(() => {
    if (loader) loader.style.display = 'none';

    const prospects = getProspects();
    let filtered = [];

    if (query.includes('200') && query.includes('6')) {
      // Seguro > 200 USD/mes y sin contacto hace 6 meses
      const date6MonthsAgo = new Date();
      date6MonthsAgo.setMonth(date6MonthsAgo.getMonth() - 6);

      filtered = prospects.filter(p => {
        // En BellsGroup, premium se guarda mensual
        const hasPremium = p.premium && p.premium > 200;
        if (!hasPremium) return false;
        if (!p.history || p.history.length === 0) return true;
        const lastDate = new Date(p.history[0].date + 'T00:00:00');
        return lastDate < date6MonthsAgo && p.status !== 'descartado';
      });
    } else if (query.includes('referido') && query.includes('propuesta')) {
      // Referidos en propuesta y sin contacto hace 3 meses
      const date3MonthsAgo = new Date();
      date3MonthsAgo.setMonth(date3MonthsAgo.getMonth() - 3);

      filtered = prospects.filter(p => {
        const isRef = p.isReferred === true || p.referredBy;
        const isProp = ['primera_entrevista', 'propuesta_generada', 'entrevista_cierre', 'reuniones_intermedias', 'propuesta_firmada'].includes(p.status);
        if (!isRef || !isProp) return false;
        if (!p.history || p.history.length === 0) return true;
        const lastDate = new Date(p.history[0].date + 'T00:00:00');
        return lastDate < date3MonthsAgo && p.status !== 'descartado';
      });
    } else if (query.includes('largo plazo') || query.includes('contacto')) {
      // Clientes sin contacto hace 2 meses
      const date2MonthsAgo = new Date();
      date2MonthsAgo.setMonth(date2MonthsAgo.getMonth() - 2);

      filtered = prospects.filter(p => {
        if (!p.history || p.history.length === 0) return true;
        const lastDate = new Date(p.history[0].date + 'T00:00:00');
        return lastDate < date2MonthsAgo && p.status !== 'descartado';
      });
    } else if (query.includes('un seguro') || query.includes('3000')) {
      // Clientes con prima anual > 3000
      filtered = prospects.filter(p => p.premium && (p.premium * 12) > 3000 && p.status !== 'descartado');
    } else {
      // Búsqueda general fallback
      filtered = prospects.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.segment && p.segment.toLowerCase().includes(query))
      );
    }

    renderAiResults(filtered);
  }, 1200);
}

// Renderizado de resultados de búsqueda IA
function renderAiResults(results) {
  const resultsCard = document.getElementById('ai-results-card');
  const countEl = document.getElementById('ai-results-count');
  const listEl = document.getElementById('ai-results-list');

  if (!resultsCard || !listEl) return;

  countEl.textContent = results.length;
  resultsCard.style.display = 'block';

  if (results.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
        No se encontraron coincidencias en la cartera para tu búsqueda coloquial.
      </div>
    `;
    return;
  }

  listEl.innerHTML = results.map(p => `
    <div class="ai-result-item" style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 700; font-size: 13px;">${p.name}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${p.segment || 'Nicho no especificado'}</div>
      </div>
      <a href="Clientes.html?id=${p.id}" class="btn" style="padding: 4px 10px; font-size: 11px; background: var(--primary-light); color: var(--primary); border: 1px solid rgba(124,58,237,0.2);">
        Ver Ficha
      </a>
    </div>
  `).join('');
}

function closeAiResults() {
  const card = document.getElementById('ai-results-card');
  if (card) card.style.display = 'none';
}

function renderActivities() {
  const container = document.getElementById('recent-activities');
  if (!container) return;

  container.innerHTML = mockActivities.map(act => `
    <div class="activity-item">
      <div class="activity-avatar">${act.avatar}</div>
      <div class="activity-details">
        <div class="activity-header">
          <span class="activity-user">${act.user}</span>
          <span class="activity-time">${act.time}</span>
        </div>
        <div class="activity-text">${act.text}</div>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// Módulo: Notificaciones, Mocks de Datos y LocalStorage
// ==========================================================================

function showNotification(id, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.cssText = `
    background: var(--bg-card-solid);
    border-left: 4px solid ${type === 'success' ? 'var(--color-green)' : type === 'error' ? 'var(--color-red)' : 'var(--primary)'};
    padding: 12px 18px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    animation: toastEnter 0.3s ease;
  `;

  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';

  toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${type === 'success' ? 'var(--color-green)' : type === 'error' ? 'var(--color-red)' : 'var(--primary)'}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastLeave 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getProspects() {
  const defaultProspects = [
    { id: '1', name: 'Tomás Restrepo', phone: '+54 9 11 5566-7788', segment: 'Médico Cardiólogo', status: 'prospecto', premium: 100, history: [{ date: '2026-07-20', text: 'Primer contacto telefónico', type: 'sys' }] },
    { id: '2', name: 'María Gómez', phone: '+54 9 341 667-8899', segment: 'Abogada Corporativa', status: 'propuesta_generada', premium: 250, history: [{ date: '2026-07-22', text: 'Entrevista de diagnóstico realizada', type: 'sys' }] },
    { id: '3', name: 'Claudio Sola', phone: '+54 9 261 445-5566', segment: 'Dueño de Empresa', status: 'emitido', premium: 400, history: [{ date: '2026-07-25', text: 'Póliza emitida en Zurich', type: 'sys' }] },
    { id: '4', name: 'Marta Gómez', phone: '+54 9 11 9988-7766', segment: 'Arquitecta Independiente', status: 'cobrado', premium: 150, history: [{ date: '2026-07-26', text: 'Primer cuota cobrada correctamente', type: 'sys' }] }
  ];

  const stored = localStorage.getItem('bells_prospects');
  if (!stored) {
    localStorage.setItem('bells_prospects', JSON.stringify(defaultProspects));
    return defaultProspects;
  }
  return JSON.parse(stored);
}

function saveProspects(prospects) {
  localStorage.setItem('bells_prospects', JSON.stringify(prospects));

  if (typeof updateIncomeKpis === 'function') updateIncomeKpis();
  
  // Guardar también en el macro de Clientes.html
  const storedSellerName = localStorage.getItem('bells_user_name') || 'Carlos';
  let macroList = localStorage.getItem('bells-macro-prospects');
  if (macroList) {
    let parsedMacro = JSON.parse(macroList);
    parsedMacro = parsedMacro.filter(p => p.advisor !== storedSellerName);
    prospects.forEach(p => p.advisor = storedSellerName);
    const newMacro = [...parsedMacro, ...prospects];
    localStorage.setItem('bells-macro-prospects', JSON.stringify(newMacro));
  }
}

// ==========================================================================
// Módulo: Zurich Sync e Historial Modals
// ==========================================================================

function triggerManualSync() {
  const container = document.getElementById('sync-container');
  const textEl = document.getElementById('sync-time-text');
  if (!container || !textEl) return;

  container.style.opacity = '0.6';
  container.style.pointerEvents = 'none';
  textEl.textContent = 'Zurich Sync: Conectando...';

  setTimeout(() => {
    textEl.textContent = 'Zurich Sync: Sincronizando datos...';
    // Efecto visual
    const syncDot = container.querySelector('.sync-dot');
    if (syncDot) syncDot.style.backgroundColor = 'var(--color-yellow)';
  }, 1000);

  setTimeout(() => {
    const syncDot = container.querySelector('.sync-dot');
    if (syncDot) syncDot.style.backgroundColor = 'var(--color-green)';
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
    textEl.textContent = 'Zurich Sync: OK (Justo ahora)';
    showNotification('sync-ok', 'Base de datos sincronizada con Zurich', 'success');
  }, 2500);
}

function openHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.style.display = 'flex';
    renderFullHistory();
  }
}

function closeHistoryModal() {
  const modal = document.getElementById('history-modal');
  if (modal) modal.style.display = 'none';
}

function closeHistoryModalOnBackdrop(e) {
  if (e.target.id === 'history-modal') closeHistoryModal();
}

function renderFullHistory() {
  const container = document.getElementById('full-history-timeline');
  if (!container) return;

  container.innerHTML = mockActivities.map(act => `
    <div class="activity-item" style="margin-bottom: 14px;">
      <div class="activity-avatar">${act.avatar}</div>
      <div class="activity-details">
        <div class="activity-header">
          <span class="activity-user">${act.user}</span>
          <span class="activity-time">${act.time}</span>
        </div>
        <div class="activity-text">${act.text}</div>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// Módulo: Registro de Prospectos y Reportes
// ==========================================================================

function openProspectModal() {
  const dialog = document.getElementById('new-prospect-dialog');
  if (dialog) dialog.showModal();
}

function closeProspectModal() {
  const dialog = document.getElementById('new-prospect-dialog');
  if (dialog) dialog.close();
}

function toggleChildrenField(value, inputId) {
  const wrapper = document.getElementById(inputId + '-wrapper');
  const input = document.getElementById(inputId);
  if (wrapper && input) {
    if (value === 'si') {
      wrapper.style.display = 'block';
      input.setAttribute('required', 'required');
    } else {
      wrapper.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    }
  }
}

function toggleReferredField(value, inputId) {
  const wrapper = document.getElementById(inputId + '-wrapper');
  const input = document.getElementById(inputId);
  if (wrapper && input) {
    if (value === 'si') {
      wrapper.style.display = 'block';
      input.setAttribute('required', 'required');
    } else {
      wrapper.style.display = 'none';
      input.removeAttribute('required');
      input.value = '';
    }
  }
}

function addProspect() {
  const firstName = document.getElementById('new-first-name').value.trim();
  const lastName = document.getElementById('new-last-name').value.trim();
  const docType = document.getElementById('new-doc-type').value;
  const docNumber = document.getElementById('new-doc-number').value.trim();
  const cuit = document.getElementById('new-cuit').value.trim();
  const phone = document.getElementById('new-phone').value.trim();
  const address = document.getElementById('new-address').value.trim();
  const segment = document.getElementById('new-segment').value;
  
  const gender = document.getElementById('new-gender').value;
  const birthDate = document.getElementById('new-birthdate').value;
  const hasChildren = document.getElementById('new-has-children').value === 'si';
  const childrenCount = hasChildren ? parseInt(document.getElementById('new-children-count').value) || 0 : 0;
  const isReferred = document.getElementById('new-is-referred').value === 'si';
  const referredBy = isReferred ? document.getElementById('new-referred-by').value.trim() : '';

  const submitBtn = document.getElementById('btn-dialog-submit');
  if (!submitBtn) return;
  const btnTxt = submitBtn.querySelector('.btn-text') || submitBtn;
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';
  const originalText = btnTxt.innerHTML;
  btnTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  setTimeout(() => {
    btnTxt.innerHTML = '<i class="fa-solid fa-check"></i> Prospecto Registrado';

    const prospects = getProspects();
    const newId = String(prospects.length + 1);
    const today = new Date().toISOString().split('T')[0];
    const storedSellerName = localStorage.getItem('bells_user_name') || 'Carlos';

    const newProspect = {
      id: newId,
      name: `${firstName} ${lastName}`,
      phone,
      segment,
      premium: 0,
      status: "prospecto",
      cuit,
      docType,
      docNumber,
      address,
      advisor: storedSellerName,
      gender,
      birthDate,
      hasChildren,
      childrenCount,
      isReferred,
      referredBy,
      history: [
        { date: today, text: `Prospecto registrado por ${storedSellerName} con CUIT ${cuit}. Datos adicionales obligatorios registrados.`, type: "sys" }
      ],
      documents: [],
      nextStep: null
    };

    prospects.push(newProspect);
    saveProspects(prospects);

    // Agregar al historial de actividades del dashboard
    mockActivities.unshift({
      id: Date.now(),
      avatar: storedSellerName.substring(0, 2).toUpperCase(),
      user: `${storedSellerName} (Tú)`,
      time: 'Hace un momento',
      type: 'prospecto',
      text: `Registró nuevo prospecto <strong>${firstName} ${lastName}</strong> (${segment}).`
    });

    renderActivities();
    calculateProjections();
    
    setTimeout(() => {
      document.getElementById('new-prospect-dialog').close();
      
      // Reset form fields
      document.getElementById('new-first-name').value = '';
      document.getElementById('new-last-name').value = '';
      document.getElementById('new-doc-type').value = '';
      document.getElementById('new-doc-number').value = '';
      document.getElementById('new-cuit').value = '';
      document.getElementById('new-phone').value = '';
      document.getElementById('new-address').value = '';
      document.getElementById('new-segment').value = '';
      document.getElementById('new-gender').value = '';
      document.getElementById('new-birthdate').value = '';
      document.getElementById('new-has-children').value = '';
      document.getElementById('new-children-count').value = '';
      document.getElementById('new-children-count-wrapper').style.display = 'none';
      document.getElementById('new-is-referred').value = '';
      document.getElementById('new-referred-by').value = '';
      document.getElementById('new-referred-by-wrapper').style.display = 'none';

      btnTxt.innerHTML = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';

      showNotification('prospect-ok', 'Lead registrado correctamente en el CRM', 'success');
    }, 600);
  }, 800);
}

function openReportModal() {
  const modal = document.getElementById('report-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('report-start-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('report-end-date').value = new Date().toISOString().split('T')[0];
  }
}

function closeReportModal() {
  const modal = document.getElementById('report-modal');
  if (modal) modal.style.display = 'none';
}

function closeReportModalOnBackdrop(e) {
  if (e.target.id === 'report-modal') closeReportModal();
}

function submitDownloadReport() {
  const start = document.getElementById('report-start-date').value;
  const end = document.getElementById('report-end-date').value;
  closeReportModal();
  showNotification('report-ok', `Generando PDF consolidado desde ${start} hasta ${end}...`, 'success');
}

function logout() {
  localStorage.removeItem('bells_user_role');
  localStorage.removeItem('bells_user_name');
  window.location.href = "../General/login.html";
}

// ==========================================================================
// Módulo: Campañas e Incentivos
// ==========================================================================

function getCampaigns() {
  const defaultCampaigns = [
    { id: 'incentivo-q3', name: 'Campaña Zurich Viaje Q3', goal: 20, current: 12, reward: 'Viaje a Miami (All Inclusive)', type: 'zurich', end: '2026-09-30', icon: 'fa-plane' },
    { id: 'meta-tri', name: 'Mi Meta Trimestral (Primas Anuales)', goal: 15000, current: 8000, reward: 'Auto-promesa: Cena en Don Julio', type: 'personal', end: '2026-09-30', icon: 'fa-gift' }
  ];

  const stored = localStorage.getItem('bells-campaigns');
  if (!stored) {
    localStorage.setItem('bells-campaigns', JSON.stringify(defaultCampaigns));
    return defaultCampaigns;
  }
  return JSON.parse(stored);
}

function renderCampaigns() {
  const container = document.getElementById('campaign-list-container');
  if (!container) return;

  const campaigns = getCampaigns();

  container.innerHTML = campaigns.map(cam => {
    let progressPercent = Math.min(Math.round((cam.current / cam.goal) * 100), 100);
    const isCompleted = progressPercent >= 100;
    
    let subLabel = `${cam.current} de ${cam.goal} pólizas`;
    if (cam.id === 'meta-tri') {
      subLabel = `$${cam.current.toLocaleString('es-AR')} de $${cam.goal.toLocaleString('es-AR')} USD`;
    }

    return `
      <div class="campaign-item" onclick="openCampaignDetailsModal('${cam.id}')" style="cursor:pointer; padding: 12px; border:1px solid var(--border-color); border-radius: var(--radius-md); background:var(--bg-card-solid); transition: all 0.2s;">
        <div class="campaign-header">
          <span class="campaign-name" style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${cam.icon || 'fa-award'}" style="color:var(--primary);"></i>
            <span>${cam.name}</span>
          </span>
          <span class="campaign-numbers">${subLabel} (${progressPercent}%)</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar ${isCompleted ? 'green' : ''}" style="width: ${progressPercent}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function openCampaignDetailsModal(id) {
  const modal = document.getElementById('campaign-details-modal');
  const bodyEl = document.getElementById('campaign-details-body');
  const footerEl = document.getElementById('campaign-details-footer');

  if (!modal || !bodyEl) return;

  const campaigns = getCampaigns();
  const cam = campaigns.find(item => item.id === id);

  if (!cam) return;

  modal.style.display = 'flex';
  
  let progressPercent = Math.min(Math.round((cam.current / cam.goal) * 100), 100);
  let goalLabel = `${cam.goal} Ventas`;
  let currentLabel = `${cam.current} Ventas`;

  if (id === 'meta-tri') {
    goalLabel = `$${cam.goal.toLocaleString('es-AR')} USD en Prima Anual`;
    currentLabel = `$${cam.current.toLocaleString('es-AR')} USD Alcanzado`;
  }

  bodyEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; font-size:13.5px;">
      <div>
        <strong>Tipo de Campaña:</strong> 
        <span style="text-transform: capitalize; font-weight:700; color:var(--primary);">${cam.type === 'zurich' ? 'Zurich Seguros' : cam.type === 'internal' ? 'Interna BellsGroup' : 'Incentivo Personal'}</span>
      </div>
      <div><strong>Recompensa/Premio:</strong> ${cam.reward || 'No especificado'}</div>
      <div><strong>Fecha límite:</strong> ${cam.end || 'Sin fecha límite'}</div>
      <div style="border-top:1px solid var(--border-color); padding-top:12px; margin-top:4px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:700;">
          <span>Progreso General</span>
          <span>${progressPercent}%</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:8px;">
          <span>${currentLabel}</span>
          <span>Meta: ${goalLabel}</span>
        </div>
        <div class="progress-bar-container" style="height:10px;">
          <div class="progress-bar ${progressPercent >= 100 ? 'green' : ''}" style="width: ${progressPercent}%;"></div>
        </div>
      </div>
    </div>
  `;

  // Renderizar footer actions
  let actionButtons = `<button type="button" class="btn btn-secondary" onclick="closeCampaignDetailsModal()">Cerrar</button>`;
  
  if (cam.type === 'personal') {
    actionButtons = `
      <button type="button" class="btn btn-secondary" style="color:var(--color-red-text);" onclick="deletePersonalCampaign('${cam.id}')">
        <i class="fa-solid fa-trash"></i> Eliminar
      </button>
      <button type="button" class="btn btn-secondary" onclick="closeCampaignDetailsModal()">Cerrar</button>
    `;
  } else if (cam.type !== 'zurich') {
    actionButtons = `
      <button type="button" class="btn btn-primary" onclick="incrementCampaignProgress('${cam.id}')">
        <i class="fa-solid fa-plus"></i> Sumar Venta
      </button>
      <button type="button" class="btn btn-secondary" onclick="closeCampaignDetailsModal()">Cerrar</button>
    `;
  }
  footerEl.innerHTML = actionButtons;
}

function closeCampaignDetailsModal() {
  const modal = document.getElementById('campaign-details-modal');
  if (modal) modal.style.display = 'none';
}

function closeCampaignDetailsModalOnBackdrop(e) {
  if (e.target.id === 'campaign-details-modal') closeCampaignDetailsModal();
}

function incrementCampaignProgress(id) {
  const campaigns = getCampaigns();
  const cam = campaigns.find(item => item.id === id);
  if (cam) {
    cam.current = Math.min(cam.current + 1, cam.goal);
    localStorage.setItem('bells-campaigns', JSON.stringify(campaigns));
    renderCampaigns();
    openCampaignDetailsModal(id);
    showNotification('cam-plus', 'Progreso de campaña actualizado', 'success');
  }
}

function deletePersonalCampaign(id) {
  let campaigns = getCampaigns();
  campaigns = campaigns.filter(item => item.id !== id);
  localStorage.setItem('bells-campaigns', JSON.stringify(campaigns));
  renderCampaigns();
  closeCampaignDetailsModal();
  showNotification('cam-del', 'Campaña personal eliminada', 'info');
}

function openCreateCampaignModal() {
  const modal = document.getElementById('create-campaign-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('new-campaign-start').value = new Date().toISOString().split('T')[0];
    document.getElementById('new-campaign-end').value = new Date().toISOString().split('T')[0];
  }
}

function closeCreateCampaignModal() {
  const modal = document.getElementById('create-campaign-modal');
  if (modal) modal.style.display = 'none';
}

function closeCreateCampaignModalOnBackdrop(e) {
  if (e.target.id === 'create-campaign-modal') closeCreateCampaignModal();
}

function handleCampaignTypeChange() {
  const type = document.getElementById('new-campaign-type').value;
  const label = document.getElementById('campaign-reward-label');
  if (type === 'personal') {
    label.textContent = 'Premio / Incentivo Personal (Auto-promesa)';
  } else {
    label.textContent = 'Incentivo / Recompensa BellsGroup';
  }
}

function submitPersonalCampaign() {
  const name = document.getElementById('new-campaign-name').value.trim();
  const reward = document.getElementById('new-campaign-reward').value.trim();
  const goal = parseInt(document.getElementById('new-campaign-goal').value) || 0;
  const icon = document.getElementById('new-campaign-icon').value;
  const end = document.getElementById('new-campaign-end').value;
  const type = document.getElementById('new-campaign-type').value;

  if (!name || !reward || goal <= 0) {
    showNotification('new-cam-err', 'Completa todos los campos requeridos', 'error');
    return;
  }

  const campaigns = getCampaigns();
  const newId = `personal-${Date.now()}`;
  const newCam = {
    id: newId,
    name,
    goal,
    current: 0,
    reward,
    type,
    end,
    icon
  };

  campaigns.push(newCam);
  localStorage.setItem('bells-campaigns', JSON.stringify(campaigns));

  renderCampaigns();
  closeCreateCampaignModal();
  showNotification('new-cam-ok', 'Campaña de objetivos creada con éxito', 'success');

  // Reset inputs
  document.getElementById('new-campaign-name').value = '';
  document.getElementById('new-campaign-reward').value = '';
  document.getElementById('new-campaign-goal').value = '10';
}

// ==========================================================================
// Módulo: Simulador de Objetivos y Comisiones
// ==========================================================================

function openSimulationsModal() {
  const modal = document.getElementById('simulations-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Forzar redibujo de Chart.js tras visualización de modal
    setTimeout(() => {
      calculateProjections();
    }, 200);
  }
}

function closeSimulationsModal() {
  const modal = document.getElementById('simulations-modal');
  if (modal) modal.style.display = 'none';
}

function closeSimulationsModalOnBackdrop(e) {
  if (e.target.id === 'simulations-modal') closeSimulationsModal();
}

function getHistoricalAveragePremium() {
  const period = localStorage.getItem('bells-kpi-period') || 'all';
  const statusFilter = localStorage.getItem('bells-kpi-status-filter') || 'closed';
  const excludeDiscarded = localStorage.getItem('bells-kpi-exclude-discarded') !== 'false';

  const prospects = getProspects();
  
  // Cutoff date for period
  let cutoffDate = null;
  if (period !== 'all') {
    const months = parseInt(period, 10);
    if (!isNaN(months)) {
      cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
    }
  }

  // Filter prospects
  const filtered = prospects.filter(p => {
    // 1. Exclude discarded if toggled
    if (excludeDiscarded && p.status === 'descartado') {
      return false;
    }

    // 2. Status filter
    if (statusFilter === 'closed') {
      if (p.status !== 'emitido' && p.status !== 'cobrado') {
        return false;
      }
    }

    // 3. Period filter (using oldest history date as registration date)
    if (cutoffDate) {
      const regDateStr = warmupRegistrationDate(p);
      if (regDateStr) {
        const regDate = new Date(regDateStr + 'T00:00:00');
        if (!isNaN(regDate.getTime()) && regDate < cutoffDate) {
          return false;
        }
      }
    }

    // Ensure we have a valid premium value
    return typeof p.premium === 'number' && !isNaN(p.premium);
  });

  if (filtered.length === 0) {
    return 1200; // fallback default
  }

  const sum = filtered.reduce((acc, p) => acc + p.premium, 0);
  // Monthly average converted to annual (x12) to match dashboard expected KPI values
  return Math.round((sum / filtered.length) * 12);
}

function getHistoricalConversionRate() {
  const period = localStorage.getItem('bells-kpi-conversion-period') || 'all';
  const excludeDiscarded = localStorage.getItem('bells-kpi-exclude-discarded') !== 'false';

  const prospects = getProspects();

  // Cutoff date for period
  let cutoffDate = null;
  if (period !== 'all') {
    const months = parseInt(period, 10);
    if (!isNaN(months)) {
      cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
    }
  }

  // Filter prospects
  const filtered = prospects.filter(p => {
    // 1. Exclude discarded if toggled
    if (excludeDiscarded && p.status === 'descartado') {
      return false;
    }

    // 2. Period filter (using oldest history date as registration date)
    if (cutoffDate) {
      const regDateStr = warmupRegistrationDate(p);
      if (regDateStr) {
        const regDate = new Date(regDateStr + 'T00:00:00');
        if (!isNaN(regDate.getTime()) && regDate < cutoffDate) {
          return false;
        }
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    return 15; // default fallback percentage
  }

  const convertedCount = filtered.filter(p => p.status === 'emitido' || p.status === 'cobrado').length;
  return Math.round((convertedCount / filtered.length) * 100);
}

// --- KPIs de Ingresos (Total y Mensual, USD/ARS) ---
const USD_TO_ARS_DEFAULT = 1300;

function getUsdToArsRate() {
  const stored = parseFloat(localStorage.getItem('bells-usd-ars-rate'));
  return !isNaN(stored) && stored > 0 ? stored : USD_TO_ARS_DEFAULT;
}

function fetchUsdToArsRate() {
  // Cotización del día (Dólar Blue, dolarapi.com — sin API key)
  if (typeof fetch !== 'function') return;
  fetch('https://dolarapi.com/v1/dolares/blue')
    .then(r => r.json())
    .then(data => {
      if (data && data.venta) {
        localStorage.setItem('bells-usd-ars-rate', String(data.venta));
        updateIncomeKpis();
      }
    })
    .catch(() => { /* modo offline: se usa la cotización guardada o el default */ });
}

function updateIncomeKpis() {
  // Valores simulados del prototipo (portafolio cerrado de referencia)
  const SIM_MONTHLY_USD = 7200;  // primas mensuales emitidas + cobradas
  const SIM_ANNUAL_USD = 86400;  // anualizado (x12)
  const rate = getUsdToArsRate();

  const totalEl = document.getElementById('kpi-total-income');
  const totalArsEl = document.getElementById('kpi-total-income-ars');
  if (totalEl) totalEl.textContent = `$${SIM_ANNUAL_USD.toLocaleString('es-AR')} USD`;
  if (totalArsEl) totalArsEl.textContent = `$${Math.round(SIM_ANNUAL_USD * rate).toLocaleString('es-AR')} ARS`;

  const usdEl = document.getElementById('kpi-monthly-income-usd');
  const arsEl = document.getElementById('kpi-monthly-income-ars');
  const rateEl = document.getElementById('kpi-rate-today');
  if (usdEl) usdEl.textContent = `$${SIM_MONTHLY_USD.toLocaleString('es-AR')} USD`;
  if (arsEl) arsEl.textContent = `$${Math.round(SIM_MONTHLY_USD * rate).toLocaleString('es-AR')} ARS`;
  if (rateEl) rateEl.textContent = `Cotización del día: 1 USD = $${rate.toLocaleString('es-AR')} ARS`;
}

function calculateProjections() {
  const targetMonthlyIncome = parseFloat(document.getElementById('target-monthly-income').value) || 0;
  const contactsPerWeek = parseInt(document.getElementById('slider-contacts').value);
  const conversionRatePercent = parseInt(document.getElementById('slider-conversion').value);
  const avgPremium = parseFloat(document.getElementById('slider-premium-avg').value);
  const commissionPercent = parseInt(document.getElementById('slider-commission').value);

  // Actualizar leyendas numéricas del HTML
  document.getElementById('val-contacts').textContent = contactsPerWeek;
  document.getElementById('val-conversion').textContent = `${conversionRatePercent}%`;
  document.getElementById('val-premium-avg').textContent = `$${avgPremium.toLocaleString('es-AR')}`;
  document.getElementById('val-commission').textContent = `${commissionPercent}%`;

  // Fórmulas
  const annualClosures = (contactsPerWeek * 52) * (conversionRatePercent / 100);
  const annualPremium = annualClosures * avgPremium;
  const annualCommission = annualPremium * (commissionPercent / 100);
  const monthlyIncome = annualCommission / 12;
  const monthlyClosures = annualClosures / 12;

  // Actualizar UI del desglose
  document.getElementById('res-annual-premium').textContent = `$${Math.round(annualPremium).toLocaleString('es-AR')}`;
  document.getElementById('res-monthly-income').textContent = `$${Math.round(monthlyIncome).toLocaleString('es-AR')}`;
  document.getElementById('res-sales-needed').textContent = monthlyClosures.toFixed(1);

  // Actualizar KPIs de Scorecard principales
  const apiEl = document.getElementById('kpi-api');
  const commEl = document.getElementById('kpi-commission');
  const commMonthlyEl = document.getElementById('kpi-commission-monthly');
  const convEl = document.getElementById('kpi-conversion');

  if (apiEl) apiEl.textContent = `$${Math.round(avgPremium).toLocaleString('es-AR')}`;

  const apiDescEl = document.getElementById('kpi-api-period-desc');
  if (apiDescEl) {
    const period = localStorage.getItem('bells-kpi-period') || 'all';
    const labels = {
      'all': 'Todo el historial',
      '1': 'Último mes',
      '3': 'Últimos 3 meses',
      '6': 'Últimos 6 meses',
      '12': 'Últimos 12 meses'
    };
    const periodLabel = labels[period] || 'Todo el historial';
    apiDescEl.textContent = `Monto medio (${periodLabel})`;
  }
  if (commEl) commEl.textContent = `$${Math.round(annualCommission).toLocaleString('es-AR')}`;
  if (commMonthlyEl) commMonthlyEl.textContent = `$${Math.round(monthlyIncome).toLocaleString('es-AR')}`;
  if (convEl) convEl.textContent = `${conversionRatePercent.toFixed(1)}%`;

  const convDescEl = document.getElementById('kpi-conversion-period-desc');
  if (convDescEl) {
    const period = localStorage.getItem('bells-kpi-conversion-period') || 'all';
    const labels = {
      'all': 'Todo el historial',
      '1': 'Último mes',
      '3': 'Últimos 3 meses',
      '6': 'Últimos 6 meses',
      '12': 'Últimos 12 meses'
    };
    const periodLabel = labels[period] || 'Todo el historial';
    convDescEl.textContent = `Esfuerzo pipeline (${periodLabel})`;
  }

  // Actualizar campaña Trimestral vinculada
  const campaigns = getCampaigns();
  const metaTri = campaigns.find(item => item.id === 'meta-tri');
  if (metaTri) {
    metaTri.current = Math.round(annualPremium);
    localStorage.setItem('bells-campaigns', JSON.stringify(campaigns));
    renderCampaigns();
  }

  // Actualizar medidor (gauge)
  const targetPercent = targetMonthlyIncome > 0 ? Math.min(Math.round((monthlyIncome / targetMonthlyIncome) * 100), 100) : 0;
  const labelGauge = document.getElementById('gauge-percent');
  const labelGaugeCenter = document.getElementById('gauge-percent-center');
  const progressPath = document.getElementById('gauge-progress');

  if (labelGauge) labelGauge.textContent = `${targetPercent}%`;
  if (labelGaugeCenter) labelGaugeCenter.textContent = `${targetPercent}%`;

  if (progressPath) {
    const strokeOffset = 377 - (377 * targetPercent / 100);
    progressPath.style.strokeDashoffset = strokeOffset;
  }

  // Estado del objetivo
  const statusBox = document.getElementById('goal-status-box');
  if (statusBox) {
    if (monthlyIncome >= targetMonthlyIncome) {
      statusBox.textContent = "¡Meta de ingresos mensual superada! 🚀";
      statusBox.style.background = "var(--color-green-bg)";
      statusBox.style.color = "var(--color-green-text)";
      statusBox.style.border = "1px solid rgba(16, 185, 129, 0.2)";
    } else {
      const diff = targetMonthlyIncome - monthlyIncome;
      statusBox.textContent = `Faltan $${Math.round(diff).toLocaleString('es-AR')} para alcanzar tu objetivo`;
      statusBox.style.background = "var(--color-yellow-bg)";
      statusBox.style.color = "var(--color-yellow-text)";
      statusBox.style.border = "1px solid rgba(245, 158, 11, 0.2)";
    }
  }

  updateChart(annualCommission);
}

function updateChart(annualCommissionValue) {
  const canvas = document.getElementById('mainDashboardChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul Proy.'];
  const historicalData = [
    annualCommissionValue * 0.4, 
    annualCommissionValue * 0.52, 
    annualCommissionValue * 0.65, 
    annualCommissionValue * 0.73, 
    annualCommissionValue * 0.82, 
    annualCommissionValue * 0.90, 
    annualCommissionValue
  ];

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Comisión Tentativa Proyectada ($ USD)',
        data: historicalData,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#7c3aed',
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: {
            color: '#94a3b8',
            callback: (val) => `$${val.toLocaleString('es-AR')}`
          }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

// ==========================================================================
// Módulo: Calendario de Planificación Comercial
// ==========================================================================

let calendarCurrentDate = new Date();
let calendarSelectedDate = new Date();

// Fecha local YYYY-MM-DD sin desvío UTC (evita corrimiento de día con toISOString)
function toLocalDateStr(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function getEventsForDate(dateStr) {
  const prospects = getProspects();
  const customEvents = loadCustomEvents();
  const events = [];

  // 1. Extraer próximos pasos de la base del embudo
  prospects.forEach(p => {
    if (p.nextStep && p.nextStep.date === dateStr) {
      let friendlyType = 'other';
      if (p.segment && p.segment.toLowerCase().includes('retiro')) friendlyType = 'entrevista';
      else if (p.segment && p.segment.toLowerCase().includes('vida')) friendlyType = 'doc';
      else friendlyType = 'call';

      events.push({
        type: friendlyType,
        title: `${p.name}: ${p.nextStep.action}`,
        notes: `Nicho: ${p.segment}. Teléfono: ${p.phone || 'No registrado'}`
      });
    }
  });

  // 2. Cargar eventos manuales
  if (customEvents[dateStr]) {
    customEvents[dateStr].forEach(ev => events.push(ev));
  }

  return events;
}

function loadCustomEvents() {
  const stored = localStorage.getItem('bells-custom-calendar-events');
  // Si ya tiene los nuevos datos (por ejemplo, el evento del 6 de agosto), los usamos
  if (stored && stored !== '{}' && JSON.parse(stored)['2026-08-06']) {
    return JSON.parse(stored);
  }

  // Pre-populamos dinámicamente si está vacío o desactualizado
  const defaults = {};

  const getISOForOffset = (offsetDays) => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offsetDays);
    return toLocalDateStr(targetDate);
  };

  // 1. Eventos para HOY (offset 0)
  defaults[getISOForOffset(0)] = [
    { type: 'entrevista', title: 'Entrevista de Cierre: Claudio Sola', notes: 'Presentar propuesta final de Seguro de Retiro Zurich Gold.', time: '10:00' },
    { type: 'call', title: 'Llamar a Lucía Fernández', notes: 'Seguimiento por cotización de Seguro Automotor.', time: '14:30' },
    { type: 'doc', title: 'Solicitar DNI / CUIT de María Gómez', notes: 'Póliza de Vida Colectiva en emisión.', time: '16:00' }
  ];

  // 2. Eventos para la semana que viene (offsets +6 y +8)
  defaults[getISOForOffset(6)] = [
    { type: 'entrevista', title: 'Reunión con Tomás Restrepo', notes: 'Explicación del plan de ahorro Zurich Vida Integral.', time: '11:30' },
    { type: 'call_6m', title: 'Llamada recordatorio a Pedro A.', notes: 'Re-evaluación semestral de su cartera comercial.', time: '15:00' }
  ];

  defaults[getISOForOffset(8)] = [
    { type: 'doc', title: 'Entregar póliza física a Marta Gómez', notes: 'Coordinar entrega en oficinas o envío a domicilio.', time: '10:00' },
    { type: 'other', title: 'Revisión trimestral con Team Leader', notes: 'Speech de ventas, comisiones y KPIs.', time: '15:30' }
  ];

  // 3. Eventos específicos para los días hábiles de Agosto 2026 (Mínimo 8 eventos)
  // Agosto 6, 2026 (Jueves)
  defaults['2026-08-06'] = [
    { type: 'call', title: 'Llamada Fidelización: Juan Herrera', notes: 'Consultar sobre renovación de póliza Hogar Zurich.', time: '11:00' }
  ];
  // Agosto 7, 2026 (Viernes)
  defaults['2026-08-07'] = [
    { type: 'entrevista', title: 'Reunión de Cierre: Sofía Castro', notes: 'Firma de Seguro de Vida Individual Zurich.', time: '15:30' }
  ];
  // Agosto 11, 2026 (Martes)
  defaults['2026-08-11'] = [
    { type: 'doc', title: 'Solicitar constancia CUIT: PyME Metalúrgica', notes: 'Seguro Colectivo en proceso de emisión.', time: '09:00' }
  ];
  // Agosto 13, 2026 (Jueves)
  defaults['2026-08-13'] = [
    { type: 'call_6m', title: 'Seguimiento semestral: Andrés Silva', notes: 'Llamar para re-cotizar Seguro de Retiro.', time: '10:30' }
  ];
  // Agosto 17, 2026 (Lunes)
  defaults['2026-08-17'] = [
    { type: 'entrevista', title: 'Presentación de propuesta: Dra. Elena Ruiz', notes: 'Plan de Retiro Premium para profesionales de la salud.', time: '16:00' }
  ];
  // Agosto 19, 2026 (Miércoles)
  defaults['2026-08-19'] = [
    { type: 'call', title: 'Seguimiento de Cotización: Roberto Gómez', notes: 'Consultar dudas sobre propuesta enviada.', time: '15:00' }
  ];
  // Agosto 24, 2026 (Lunes)
  defaults['2026-08-24'] = [
    { type: 'doc', title: 'Recepción de firmas: Contrato Roberto Gómez', notes: 'Seguro de Vida Colectivo Bells.', time: '12:00' }
  ];
  // Agosto 26, 2026 (Miércoles)
  defaults['2026-08-26'] = [
    { type: 'other', title: 'Revisión de Funnel con Team Leader', notes: 'Ajuste de comisiones y speech de ventas.', time: '11:00' }
  ];
  // Agosto 28, 2026 (Viernes)
  defaults['2026-08-28'] = [
    { type: 'entrevista', title: 'Entrevista de Captación: Ing. Marcos Díaz', notes: 'Recomendado por Claudio Sola.', time: '14:00' }
  ];
  // Agosto 31, 2026 (Lunes)
  defaults['2026-08-31'] = [
    { type: 'other', title: 'Cierre de Facturación Zurich', notes: 'Presentación final de pólizas cobradas del mes.', time: '17:00' }
  ];

  localStorage.setItem('bells-custom-calendar-events', JSON.stringify(defaults));
  return defaults;
}

function saveCustomEvents(events) {
  localStorage.setItem('bells-custom-calendar-events', JSON.stringify(events));
}

function initCalendar() {
  renderCalendar();
  selectCalendarDate(new Date());
}

function changeCalendarMonth(offset) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + offset);
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-days-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');

  if (!grid || !monthYearLabel) return;

  grid.innerHTML = '';
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  monthYearLabel.textContent = `${monthNames[calendarCurrentDate.getMonth()]} ${calendarCurrentDate.getFullYear()}`;

  const firstDayOfMonth = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth(), 1);
  const startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday

  const lastDayOfMonth = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  const prevMonthLast = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth(), 0).getDate();

  const totalGridCells = 42; // 6 semanas fijas
  const today = new Date();

  for (let i = 0; i < totalGridCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';

    let dayNumber = 0;
    let cellDate = null;

    if (i < startDayIndex) {
      // Días del mes anterior
      dayNumber = prevMonthLast - startDayIndex + i + 1;
      cell.classList.add('other-month');
      cellDate = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() - 1, dayNumber);
    } else if (i >= startDayIndex + totalDays) {
      // Días del mes siguiente
      dayNumber = i - startDayIndex - totalDays + 1;
      cell.classList.add('other-month');
      cellDate = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth() + 1, dayNumber);
    } else {
      // Días del mes activo
      dayNumber = i - startDayIndex + 1;
      cellDate = new Date(calendarCurrentDate.getFullYear(), calendarCurrentDate.getMonth(), dayNumber);
      
      if (cellDate.getDate() === today.getDate() && cellDate.getMonth() === today.getMonth() && cellDate.getFullYear() === today.getFullYear()) {
        cell.classList.add('today');
      }
    }

    // Guardar fecha serializada
    const dateStr = toLocalDateStr(cellDate);
    cell.dataset.date = dateStr;

    // Número del día
    const numSpan = document.createElement('span');
    numSpan.className = 'calendar-day-number';
    numSpan.textContent = dayNumber;
    cell.appendChild(numSpan);

    // Eventos e indicadores
    const events = getEventsForDate(dateStr);
    if (events.length > 0) {
      const container = document.createElement('div');
      container.className = 'calendar-column-events';
      container.style.cssText = 'display:flex; flex-direction:column; gap:4px; width:100%; margin-top:4px;';
      events.slice(0, 3).forEach(ev => {
        const pill = document.createElement('div');
        pill.className = `calendar-event-item ${ev.type || 'other'}`;
        pill.style.cssText = 'padding:2px 6px; font-size:10px; border-radius:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
        
        pill.innerHTML = `<strong>${ev.time ? `${ev.time} ` : ''}</strong>${ev.title}`;
        container.appendChild(pill);
      });
      if (events.length > 3) {
        const moreLabel = document.createElement('div');
        moreLabel.style.cssText = 'font-size:9px; color:var(--text-muted); margin-top:2px; text-align:center; font-weight:700;';
        moreLabel.textContent = `+${events.length - 3} más`;
        container.appendChild(moreLabel);
      }
      cell.appendChild(container);
    }

    // Selección
    if (calendarSelectedDate && dateStr === toLocalDateStr(calendarSelectedDate)) {
      cell.classList.add('selected');
    }

    cell.onclick = () => {
      // Quitar seleccion previa
      const activeSel = grid.querySelector('.calendar-day-cell.selected');
      if (activeSel) activeSel.classList.remove('selected');
      
      cell.classList.add('selected');
      calendarSelectedDate = cellDate;
      selectCalendarDate(cellDate);
      
      if (typeof openSelectedDayModal === 'function') {
        openSelectedDayModal();
      }
    };

    grid.appendChild(cell);
  }
}

function loadCompletedEvents() {
  return JSON.parse(localStorage.getItem('bells-completed-calendar-events') || '[]');
}

function saveCompletedEvents(completedList) {
  localStorage.setItem('bells-completed-calendar-events', JSON.stringify(completedList));
}

function toggleEventCompleted(dateStr, eventTitle) {
  const completedList = loadCompletedEvents();
  const key = `${dateStr}-${eventTitle}`;
  const index = completedList.indexOf(key);
  if (index === -1) {
    completedList.push(key);
  } else {
    completedList.splice(index, 1);
  }
  saveCompletedEvents(completedList);
  
  // Refrescar el calendario y la vista de tareas del día
  renderCalendar();
  selectCalendarDate(calendarSelectedDate);
}

function showInlineDatePicker(event, dateStr, eventTitle) {
  event.stopPropagation();
  const btn = event.currentTarget;
  const picker = btn.nextElementSibling;
  if (picker) {
    picker.style.display = 'inline-block';
    btn.style.display = 'none';
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else {
      picker.focus();
    }
  }
}

function changeEventDate(oldDateStr, eventTitle, newDateStr) {
  if (!newDateStr || oldDateStr === newDateStr) {
    selectCalendarDate(calendarSelectedDate);
    return;
  }

  // 1. Mover en eventos manuales (customEvents)
  const customEvents = loadCustomEvents();
  let found = false;

  if (customEvents[oldDateStr]) {
    const eventIndex = customEvents[oldDateStr].findIndex(ev => ev.title === eventTitle);
    if (eventIndex !== -1) {
      const [movedEvent] = customEvents[oldDateStr].splice(eventIndex, 1);
      if (customEvents[oldDateStr].length === 0) {
        delete customEvents[oldDateStr];
      }
      if (!customEvents[newDateStr]) {
        customEvents[newDateStr] = [];
      }
      customEvents[newDateStr].push(movedEvent);
      saveCustomEvents(customEvents);
      found = true;
    }
  }

  // 2. Mover en prospectos (nextStep)
  const prospects = getProspects();
  const targetProspect = prospects.find(p => p.nextStep && p.nextStep.date === oldDateStr && `${p.name}: ${p.nextStep.action}` === eventTitle);
  if (targetProspect) {
    targetProspect.nextStep.date = newDateStr;
    if (!targetProspect.history) targetProspect.history = [];
    targetProspect.history.unshift({
      date: newDateStr,
      text: `Actividad re-programada para el ${newDateStr.split('-').reverse().join('/')}: "${targetProspect.nextStep.action}"`,
      type: 'sys'
    });
    saveProspects(prospects);
    found = true;
  }

  if (found) {
    // Migrar clave de completado si el evento estaba Listo
    const completedList = loadCompletedEvents();
    const oldCompletedKey = `${oldDateStr}-${eventTitle}`;
    const completedIndex = completedList.indexOf(oldCompletedKey);
    if (completedIndex !== -1) {
      completedList.splice(completedIndex, 1);
      completedList.push(`${newDateStr}-${eventTitle}`);
      saveCompletedEvents(completedList);
    }
    showNotification('event-moved', `Actividad re-programada con éxito`, 'success');
  }

  renderCalendar();
  // Refrescar al mismo día seleccionado originalmente
  selectCalendarDate(calendarSelectedDate);
}

function selectCalendarDate(date) {
  const label = document.getElementById('selected-day-label');
  const container = document.getElementById('selected-day-events');
  if (!label || !container) return;

  const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dateStr = toLocalDateStr(date);
  
  label.textContent = `Tareas para el ${weekdayNames[date.getDay()]} ${date.getDate()}/${date.getMonth()+1}`;

  const events = getEventsForDate(dateStr);
  const completedList = loadCompletedEvents();

  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 12px; font-style: italic;">
        No hay actividades agendadas para esta fecha.
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(ev => {
    let iconClass = 'fa-phone';
    if (ev.type === 'entrevista') iconClass = 'fa-handshake';
    if (ev.type === 'doc') iconClass = 'fa-file-signature';
    if (ev.type === 'call_6m') iconClass = 'fa-clock';

    const isCompleted = completedList.includes(`${dateStr}-${ev.title}`);
    const completedClass = isCompleted ? 'completed-task' : '';
    const buttonText = isCompleted ? '<i class="fa-solid fa-rotate-left"></i>' : '<i class="fa-solid fa-check"></i> Listo';
    const buttonClass = isCompleted ? 'btn-event-status undo' : 'btn-event-status done';

    // Generar escapar las comillas simples
    const escapedTitle = ev.title.replace(/'/g, "\\'");

    return `
      <div class="calendar-event-item ${ev.type || 'other'} ${completedClass}" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width: 0;">
          <i class="fa-solid ${iconClass} event-item-icon" style="flex-shrink: 0;"></i>
          <div style="display:flex; flex-direction:column; gap:2px; min-width: 0; overflow: hidden; text-overflow: ellipsis;">
            <span class="event-item-title" style="font-weight:700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ev.title}</span>
            ${ev.notes ? `<span style="font-size:11px; color:var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ev.notes}</span>` : ''}
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <!-- Botón de Modificar Fecha -->
          <button class="btn-event-edit" onclick="showInlineDatePicker(event, '${dateStr}', '${escapedTitle}')" title="Modificar fecha">
            <i class="fa-solid fa-calendar-day"></i>
          </button>
          <input type="date" class="inline-date-picker" style="display: none;" value="${dateStr}" onblur="setTimeout(() => selectCalendarDate(calendarSelectedDate), 200)" onchange="changeEventDate('${dateStr}', '${escapedTitle}', this.value)">

          <!-- Botón de Completado -->
          <button class="${buttonClass}" onclick="toggleEventCompleted('${dateStr}', '${escapedTitle}')">
            ${buttonText}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function openAddEventModal() {
  const modal = document.getElementById('calendar-event-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('event-date').value = toLocalDateStr(calendarSelectedDate);
    
    // Rellenar prospectos dropdown
    const dropdown = document.getElementById('event-prospect');
    if (dropdown) {
      const prospects = getProspects();
      dropdown.innerHTML = '<option value="">-- Seleccionar del Embudo (Opcional) --</option>' + 
        prospects.map(p => `<option value="${p.id}">${p.name} (${p.segment || 'Nicho'})</option>`).join('');
    }
  }
}

function closeCalendarEventModal() {
  const modal = document.getElementById('calendar-event-modal');
  if (modal) modal.style.display = 'none';
}

function closeCalendarEventModalOnBackdrop(e) {
  if (e.target.id === 'calendar-event-modal') closeCalendarEventModal();
}

function onEventProspectChange() {
  const dropdown = document.getElementById('event-prospect');
  const titleInput = document.getElementById('event-title');
  if (!dropdown || !titleInput) return;

  const selectedOption = dropdown.options[dropdown.selectedIndex];
  if (selectedOption.value) {
    titleInput.value = `Seguimiento de Embudo: ${selectedOption.text.split(' (')[0]}`;
  }
}

function submitCalendarEvent(event) {
  event.preventDefault();

  const dateStr = document.getElementById('event-date').value;
  const title = document.getElementById('event-title').value.trim();
  const type = document.getElementById('event-type').value;
  const notes = document.getElementById('event-notes').value.trim();
  const prospectId = document.getElementById('event-prospect').value;

  if (!dateStr || !title) return;

  const newEvent = {
    type,
    title,
    notes: notes || (prospectId ? 'Vinculado a proceso de embudo comercial' : '')
  };

  // 1. Guardar localmente
  const customEvents = loadCustomEvents();
  if (!customEvents[dateStr]) customEvents[dateStr] = [];
  customEvents[dateStr].push(newEvent);
  saveCustomEvents(customEvents);

  // 2. Si hay prospecto vinculado, agregar al historial de ese prospecto
  if (prospectId) {
    const prospects = getProspects();
    const client = prospects.find(p => p.id === prospectId);
    if (client) {
      if (!client.history) client.history = [];
      client.history.unshift({
        date: dateStr,
        text: `Actividad programada: "${title}" (${type})`,
        type: 'sys'
      });
      // Guardar el nextStep
      client.nextStep = { action: title, date: dateStr };
      saveProspects(prospects);
    }
  }

  // Refrescar vistas
  renderCalendar();
  selectCalendarDate(calendarSelectedDate);
  closeCalendarEventModal();
  showNotification('event-ok', 'Actividad agendada en tu hoja de planificación', 'success');

  // Reset inputs
  document.getElementById('event-title').value = '';
  document.getElementById('event-notes').value = '';
}
