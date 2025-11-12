// Elementos do DOM
const darkModeToggle = document.getElementById('darkModeToggle');
const notifyToggle = document.getElementById('notifyToggle');
const soundToggle = document.getElementById('soundToggle');
const cartReminders = document.getElementById('cartReminders');
const languageSelect = document.getElementById('languageSelect');
const currencySelect = document.getElementById('currencySelect');
const autoSave = document.getElementById('autoSave');
const fontSize = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const resetSettings = document.getElementById('resetSettings');
const clearCache = document.getElementById('clearCache');
const exportData = document.getElementById('exportData');
const colorOptions = document.querySelectorAll('.color-option');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Configurações padrão
const defaultSettings = {
  primaryColor: '#667eea',
  colorName: 'Roxo',
  darkMode: false,
  fontSize: 16,
  notifications: true,
  sound: true,
  cartReminders: true,
  language: 'pt-BR',
  currency: 'BRL',
  autoSave: true
};

// Carregar configurações ao iniciar
window.addEventListener('load', loadSettings);

// Função para carregar configurações
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;

  // Aplicar cor primária
  applyPrimaryColor(settings.primaryColor);

  // Marcar cor ativa
  colorOptions.forEach(option => {
    if (option.dataset.color === settings.primaryColor) {
      option.classList.add('active');
    }
  });

  // Aplicar modo escuro
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Aplicar tamanho de fonte
  document.body.style.fontSize = settings.fontSize + 'px';
  fontSize.value = settings.fontSize;
  fontSizeValue.textContent = settings.fontSize + 'px';

  // Aplicar outras configurações
  notifyToggle.checked = settings.notifications;
  soundToggle.checked = settings.sound;
  cartReminders.checked = settings.cartReminders;
  languageSelect.value = settings.language;
  currencySelect.value = settings.currency;
  autoSave.checked = settings.autoSave;
}

// Função para aplicar cor primária
function applyPrimaryColor(color) {
  document.documentElement.style.setProperty('--primary-color', color);
  
  // Calcular cores derivadas
  const primaryDark = adjustColor(color, -20);
  const primaryLight = adjustColor(color, 20);
  
  document.documentElement.style.setProperty('--primary-dark', primaryDark);
  document.documentElement.style.setProperty('--primary-light', primaryLight);
  
  // Atualizar meta tag theme-color para mobile
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = color;
}

// Função auxiliar para ajustar cor
function adjustColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Função para salvar configurações
function saveSettings() {
  const currentSettings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
  
  const settings = {
    primaryColor: currentSettings.primaryColor,
    colorName: currentSettings.colorName,
    darkMode: darkModeToggle.checked,
    fontSize: parseInt(fontSize.value),
    notifications: notifyToggle.checked,
    sound: soundToggle.checked,
    cartReminders: cartReminders.checked,
    language: languageSelect.value,
    currency: currencySelect.value,
    autoSave: autoSave.checked
  };
  
  localStorage.setItem('appSettings', JSON.stringify(settings));
  
  // Mostrar toast de confirmação
  if (autoSave.checked) {
    showToast('Configurações salvas automaticamente!');
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
colorOptions.forEach(option => {
  option.addEventListener('click', function() {
    // Remove active de todas as opções
    colorOptions.forEach(opt => opt.classList.remove('active'));
    
    // Adiciona active na opção clicada
    this.classList.add('active');
    
    // Aplica a nova cor
    const newColor = this.dataset.color;
    const colorName = this.dataset.name;
    applyPrimaryColor(newColor);
    
    // Salva a configuração
    const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
    settings.primaryColor = newColor;
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

// Event listener para tamanho de fonte
fontSize.addEventListener('input', function() {
  document.body.style.fontSize = this.value + 'px';
  fontSizeValue.textContent = this.value + 'px';
  saveSettings();
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

cartReminders.addEventListener('change', () => {
  saveSettings();
  showToast(cartReminders.checked ? 'Lembretes ativados' : 'Lembretes desativados');
});

// Event listeners para selects
languageSelect.addEventListener('change', () => {
  saveSettings();
  showToast('Idioma alterado');
});

currencySelect.addEventListener('change', () => {
  saveSettings();
  showToast('Moeda alterada');
});

autoSave.addEventListener('change', () => {
  saveSettings();
  showToast(autoSave.checked ? 'Salvamento automático ativado' : 'Salvamento automático desativado');
});

// Event listener para limpar cache
clearCache.addEventListener('click', function() {
  if (confirm('Deseja limpar o cache do aplicativo? Isso pode melhorar o desempenho.')) {
    // Limpa dados temporários (mantém configurações)
    const settings = localStorage.getItem('appSettings');
    
    // Simula limpeza de cache
    sessionStorage.clear();
    
    showToast('Cache limpo com sucesso!');
  }
});

// Event listener para exportar dados
exportData.addEventListener('click', function() {
  const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
  
  // Cria objeto com todos os dados
  const exportObj = {
    settings: settings,
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Converte para JSON
  const dataStr = JSON.stringify(exportObj, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  // Cria link para download
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `autocart-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('Dados exportados com sucesso!');
});

// Event listener para resetar configurações
resetSettings.addEventListener('click', function() {
  if (confirm('Tem certeza que deseja redefinir TODAS as configurações? Esta ação não pode ser desfeita.')) {
    // Remove todas as configurações
    localStorage.removeItem('appSettings');
    
    // Mostra toast e recarrega página
    showToast('Configurações redefinidas!', 1500);
    
    setTimeout(() => {
      location.reload();
    }, 1500);
  }
});

// Função para aplicar configurações em todas as páginas do app
function applyGlobalSettings() {
  const settings = JSON.parse(localStorage.getItem('appSettings')) || defaultSettings;
  
  // Aplica cor primária globalmente
  applyPrimaryColor(settings.primaryColor);
  
  // Aplica modo escuro
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
  }
  
  // Aplica tamanho de fonte
  document.body.style.fontSize = settings.fontSize + 'px';
}

// Torna a função disponível globalmente
window.applyGlobalSettings = applyGlobalSettings;

// Detectar preferência de modo escuro do sistema
if (window.matchMedia && !localStorage.getItem('appSettings')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    darkModeToggle.checked = true;
    document.body.classList.add('dark-mode');
    saveSettings();
  }
}