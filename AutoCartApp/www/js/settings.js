// Elementos do DOM
const colorCards = document.querySelectorAll('.color-card');
const darkModeToggle = document.getElementById('darkModeToggle');
const notifyToggle = document.getElementById('notifyToggle');
const soundToggle = document.getElementById('soundToggle');
const languageSelect = document.getElementById('languageSelect');
const autoSave = document.getElementById('autoSave');
const resetSettings = document.getElementById('resetSettings');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Configurações padrão
const defaultSettings = {
  primaryColor: '#ff6b35',
  primaryLight: '#ff8c42',
  primaryDark: '#ff5722',
  colorName: 'Laranja',
  darkMode: false,
  notifications: true,
  sound: true,
  language: 'pt-BR',
  autoSave: true
};

// Carregar configurações ao iniciar
window.addEventListener('load', loadSettings);

// Função para carregar configurações
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;

  // Aplicar cor primária
  applyColors(settings.primaryColor, settings.primaryLight, settings.primaryDark);

  // Marcar cor ativa
  colorCards.forEach(card => {
    if (card.dataset.color === settings.primaryColor) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Aplicar modo escuro (DESATIVADO por padrão)
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  } else {
    document.body.classList.remove('dark-mode');
    darkModeToggle.checked = false;
  }

  // Aplicar outras configurações
  notifyToggle.checked = settings.notifications;
  soundToggle.checked = settings.sound;
  languageSelect.value = settings.language;
  autoSave.checked = settings.autoSave;
}

// Função para aplicar cores
function applyColors(color, lightColor, darkColor) {
  // Atualiza o header
  const header = document.querySelector('.header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${lightColor} 0%, ${color} 100%)`;
  }

  // Atualiza ícones dos section headers
  const sectionIcons = document.querySelectorAll('.section-header svg');
  sectionIcons.forEach(icon => {
    icon.style.stroke = color;
  });

  // Atualiza borda dos cards ativos
  document.documentElement.style.setProperty('--primary-color', color);
  
  // Atualiza meta tag theme-color
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = color;

  // Atualiza CSS dinâmico
  updateDynamicCSS(color);
}

// Função para atualizar CSS dinâmico
function updateDynamicCSS(color) {
  let styleElement = document.getElementById('dynamic-theme');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'dynamic-theme';
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = `
    .color-card.active {
      border-color: ${color} !important;
      box-shadow: 0 4px 12px ${hexToRgba(color, 0.2)} !important;
    }
    .color-check {
      background: ${color} !important;
    }
    .toggle-switch input:checked + .toggle-slider {
      background-color: ${color} !important;
    }
    .select-dropdown:focus {
      border-color: ${color} !important;
      box-shadow: 0 0 0 3px ${hexToRgba(color, 0.1)} !important;
    }
    body.dark-mode .color-card.active {
      border-color: ${color} !important;
    }
  `;
}

// Converter HEX para RGBA
function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Função para salvar configurações
function saveSettings() {
  const currentSettings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
  
  const settings = {
    primaryColor: currentSettings.primaryColor,
    primaryLight: currentSettings.primaryLight,
    primaryDark: currentSettings.primaryDark,
    colorName: currentSettings.colorName,
    darkMode: darkModeToggle.checked,
    notifications: notifyToggle.checked,
    sound: soundToggle.checked,
    language: languageSelect.value,
    autoSave: autoSave.checked
  };
  
  localStorage.setItem('appSettings', JSON.stringify(settings));
  
  if (autoSave.checked) {
    showToast('Configurações salvas!');
  }
}

// Função para mostrar toast
function showToast(message, duration = 2000) {
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Event listeners para paleta de cores
colorCards.forEach(card => {
  card.addEventListener('click', function() {
    // Remove active de todas
    colorCards.forEach(c => c.classList.remove('active'));
    
    // Adiciona active na clicada
    this.classList.add('active');
    
    // Pega as cores
    const color = this.dataset.color;
    const lightColor = this.dataset.light;
    const darkColor = this.dataset.dark;
    const colorName = this.querySelector('.color-label').textContent;
    
    // Aplica as cores
    applyColors(color, lightColor, darkColor);
    
    // Salva
    const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
    settings.primaryColor = color;
    settings.primaryLight = lightColor;
    settings.primaryDark = darkColor;
    settings.colorName = colorName;
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    showToast(`Tema ${colorName} aplicado!`);
  });
});

// Event listener para modo escuro
darkModeToggle.addEventListener('change', function() {
  document.body.classList.toggle('dark-mode', this.checked);
  saveSettings();
  showToast(this.checked ? 'Modo escuro ativado' : 'Modo claro ativado');
});

// Event listeners para outros toggles
notifyToggle.addEventListener('change', () => {
  saveSettings();
  showToast(notifyToggle.checked ? 'Notificações ativadas' : 'Notificações desativadas');
});

soundToggle.addEventListener('change', () => {
  saveSettings();
  showToast(soundToggle.checked ? 'Som ativado' : 'Som desativado');
});

// Event listener para select
languageSelect.addEventListener('change', () => {
  saveSettings();
  showToast('Idioma alterado');
});

autoSave.addEventListener('change', () => {
  saveSettings();
  showToast(autoSave.checked ? 'Salvamento automático ativado' : 'Salvamento automático desativado');
});

// Event listener para resetar configurações
resetSettings.addEventListener('click', function() {
  if (confirm('Tem certeza que deseja redefinir TODAS as configurações? Esta ação não pode ser desfeita.')) {
    localStorage.removeItem('appSettings');
    showToast('Configurações redefinidas!', 1500);
    
    setTimeout(() => {
      location.reload();
    }, 1500);
  }
});