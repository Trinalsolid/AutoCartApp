/*
|--------------------------------------------------------------------------
| JS do Menu do Usuário (usermenu.js)
|--------------------------------------------------------------------------
|
| para carregar dados do usuário e para o logout.
|
*/

// Importar as novas funções de autenticação
import { globalLogout, getCurrentUser, onAuthReady } from './authchek.js';

// Elementos DOM
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenu = document.getElementById('userMenu');
const userMenuOverlay = document.getElementById('userMenuOverlay');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuLogout = document.getElementById('menuLogout');

// ============================
// Funções do Menu (Abertura/Fechamento)
// ============================

function openUserMenu() {
    if (userMenu) userMenu.classList.add('active');
    if (userMenuOverlay) userMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserMenu() {
    if (userMenu) userMenu.classList.remove('active');
    if (userMenuOverlay) userMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================
// Event Listeners
// ============================

// Adiciona "if" para garantir que os elementos existem
if (userMenuBtn) userMenuBtn.addEventListener('click', openUserMenu);
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeUserMenu);
if (userMenuOverlay) userMenuOverlay.addEventListener('click', closeUserMenu);

// Logout (AGORA FUNCIONA COM FIREBASE)
if (menuLogout) {
    menuLogout.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Deseja realmente sair da sua conta?')) {
            globalLogout(); // <-- Chama a nova função global
        }
    });
}

// ============================
// Carregar informações do usuário (AGORA FUNCIONA COM FIREBASE)
// ============================

function loadUserInfo() {
    // Busca o usuário logado do Firebase (via firebase-auth.js)
    const user = getCurrentUser(); 
    
    if (user && (user.displayName || user.email)) {
        const userName = user.displayName || "Usuário"; // Pega o nome ou "Usuário"
        const userEmail = user.email;

        // Atualiza o menu
        document.getElementById('userName').textContent = userName;
        document.getElementById('userEmail').textContent = userEmail;
        
        // Gerar iniciais
        const initials = userName
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
// Inicialização
// ============================

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // Espera a autenticação do firebase-auth.js ficar pronta
    await onAuthReady();
    
    // Só então carrega as informações do usuário no menu
    loadUserInfo();
});