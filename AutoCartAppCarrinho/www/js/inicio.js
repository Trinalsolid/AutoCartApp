/*
|--------------------------------------------------------------------------
| AutoCart - Splash Screen Logic
|--------------------------------------------------------------------------
|
| Gerencia a tela de splash inicial e a tela de boas-vindas,
| com transições suaves e redirecionamento para index.html
|
*/

// ============================
// Elementos DOM
// ============================
const splashScreen = document.getElementById('splashScreen');
const welcomeScreen = document.getElementById('welcomeScreen');
const btnConnectApp = document.getElementById('btnConnectApp');
const btnContinueWithout = document.getElementById('btnContinueWithout');

// ============================
// Funções de Transição
// ============================

/**
 * Faz transição suave entre duas telas
 * @param {HTMLElement} currentScreen - Tela atual
 * @param {HTMLElement} nextScreen - Próxima tela
 */
function transitionToScreen(currentScreen, nextScreen) {
    currentScreen.classList.add('fade-out');
    
    setTimeout(() => {
        currentScreen.classList.remove('active', 'fade-out');
        nextScreen.classList.add('active');
    }, 600); // Tempo da animação CSS
}

/**
 * Redireciona para a página index.html com fade out
 */
function redirectToIndex() {
    splashScreen.classList.add('fade-out');
    welcomeScreen.classList.add('fade-out');
    
    setTimeout(() => {
        window.location.href = 'carrinho.html';
    }, 600);
}

// ============================
// Inicialização
// ============================

/**
 * Transição automática: Splash → Welcome após 2 segundos
 */
setTimeout(() => {
    transitionToScreen(splashScreen, welcomeScreen);
}, 2000);

// ============================
// Event Listeners
// ============================

/**
 * Botão: Conectar com o app
 * (Funcionalidade para implementação futura - login/conexão)
 */
btnConnectApp.addEventListener('click', () => {
    // Aqui você pode implementar a lógica de conexão com o app
    alert('Conectando com o app...\n\nEssa funcionalidade será implementada em breve!');
    
    // Exemplo de redirecionamento para página de login:
    // window.location.href = 'login.html';
    
    // Ou implementar autenticação aqui mesmo
});

/**
 * Botão: Prosseguir sem o app
 * Redireciona para a página principal (index.html)
 */
btnContinueWithout.addEventListener('click', () => {
    redirectToIndex();
});

// ============================
// Atalhos de Teclado (Dev)
// ============================

/**
 * Atalho: Pressionar Enter na splash screen pula para welcome
 * (Útil durante desenvolvimento)
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && splashScreen.classList.contains('active')) {
        transitionToScreen(splashScreen, welcomeScreen);
    }
});

// ============================
// Prevenção de Comportamentos Indesejados
// ============================

/**
 * Previne o comportamento padrão de pull-to-refresh em dispositivos móveis
 */
document.body.addEventListener('touchmove', (e) => {
    // Permite scroll normal, mas previne overscroll
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

/**
 * Previne zoom com double-tap em dispositivos iOS
 */
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// ============================
// Console Info (Desenvolvimento)
// ============================
console.log('🛒 AutoCart Splash Screen inicializado');
console.log('📱 Otimizado para dispositivos móveis');
console.log('⌨️  Atalho: Pressione Enter para pular splash');