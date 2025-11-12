// ============================
// Verificação Global de Autenticação
// ============================
// Este arquivo deve ser incluído em TODAS as páginas protegidas
// ANTES de qualquer outro script

(function() {
    'use strict';
    
    // Lista de páginas que NÃO requerem autenticação
    const publicPages = ['login.html', 'login'];
    
    // Verificar se a página atual é pública
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isPublicPage = publicPages.some(page => currentPage.includes(page));
    
    // Se não for página pública, verificar autenticação
    if (!isPublicPage) {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            // Salvar a URL atual para redirecionar após login
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            
            // Redirecionar para login
            window.location.href = 'login.html';
        }
    }
})();

// ============================
// Função auxiliar para logout global
// ============================

function globalLogout() {
    // Limpar todos os dados
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('settings');
    
    // Limpar carrinhos de todos os mercados
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('cart_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Redirecionar para login
    window.location.href = 'login.html';
}