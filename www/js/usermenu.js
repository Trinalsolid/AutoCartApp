// ============================
// JS do Menu do Usuário
// ============================

// Elementos DOM
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
const userMenuOverlay = document.getElementById('userMenuOverlay');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuLogout = document.getElementById('menuLogout');

// ============================
// Funções do Menu
// ============================

function openUserMenu() {
    userMenu.classList.add('active');
    userMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserMenu() {
    userMenu.classList.remove('active');
    userMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================
// Event Listeners
// ============================

// Abrir menu
userMenuBtn.addEventListener('click', openUserMenu);

// Fechar menu
closeMenuBtn.addEventListener('click', closeUserMenu);
userMenuOverlay.addEventListener('click', closeUserMenu);

// Logout
menuLogout.addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Deseja realmente sair da sua conta?')) {
        // Limpar dados do usuário
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Limpar carrinho do mercado atual
        const urlParams = new URLSearchParams(window.location.search);
        const selectedMarket = urlParams.get('market') || 'default';
        localStorage.removeItem('cart_' + selectedMarket);
        
        // Redirecionar para login
        window.location.href = 'login.html';
    }
});

// ============================
// Carregar informações do usuário
// ============================

function loadUserInfo() {
    // Buscar dados do usuário do localStorage ou API
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (user.name) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        
        // Gerar iniciais
        const initials = user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        document.getElementById('userInitials').textContent = initials;
        document.getElementById('userInitialsLarge').textContent = initials;
    }
}

// ============================
// Verificar autenticação
// ============================

function checkAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        // Redirecionar para login se não estiver logado
        window.location.href = 'login.html';
        return false;
    }
    
    loadUserInfo();
    return true;
}

// ============================
// Inicialização
// ============================

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});