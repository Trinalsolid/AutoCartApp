/*
|--------------------------------------------------------------------------
| Gerenciador de Autenticação Global (autchek.js)
|--------------------------------------------------------------------------
|
| Este arquivo deve ser incluído em TODAS as páginas.
| Ele gerencia o estado do usuário e protege as páginas.
|
*/

import { auth, onAuthStateChanged, signOut, getIdToken } from './firebase-config.js';

// --- Estado Global de Autenticação ---

let currentUser = null;
let currentToken = null;
let authStateReady = false;

// Observador do estado de autenticação
onAuthStateChanged(auth, async (user) => {
    authStateReady = true;
    if (user) {
        // Usuário está logado
        currentUser = user;
        try {
            // Obtém o token JWT para enviar ao nosso backend
            currentToken = await user.getIdToken();
            
            // Salva para acesso rápido (opcional, mas útil)
            localStorage.setItem('authToken', currentToken);
            localStorage.setItem('currentUser', JSON.stringify(user)); // Apenas para UI

        } catch (error) {
            console.error("Erro ao obter token:", error);
            await globalLogout(); // Força o logout se não conseguir token
        }
        
        // Dispara um evento global
        window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
        
        // Verifica se está na página de login e redireciona
        if (isPublicPage()) {
             window.location.href = 'index.html';
        }

    } else {
        // Usuário está deslogado
        currentUser = null;
        currentToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        // Dispara um evento global
        window.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));

        // Se não for página pública, redireciona para o login
        if (!isPublicPage()) {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = 'login.html';
        }
    }
});

// --- Funções Auxiliares ---

function isPublicPage() {
    const publicPages = ['login.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    return publicPages.some(page => currentPage.includes(page));
}

// --- Funções Exportadas ---

// Função de Logout Global
export async function globalLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    } finally {
        // A lógica de redirecionamento agora é tratada pelo onAuthStateChanged
        localStorage.clear(); // Limpa tudo
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

// Obtém o token do usuário logado
export async function getUserToken() {
    if (currentToken) {
        return currentToken;
    }
    if (auth.currentUser) {
        try {
            currentToken = await auth.currentUser.getIdToken(true); // Força a atualização
            return currentToken;
        } catch (error) {
            console.error("Não foi possível obter o token:", error);
            return null;
        }
    }
    return null;
}

// Obtém o usuário atual
export function getCurrentUser() {
    return currentUser || JSON.parse(localStorage.getItem('currentUser'));
}

// Permite que outros scripts esperem a autenticação estar pronta
export function onAuthReady() {
    return new Promise((resolve) => {
        if (authStateReady) {
            resolve(currentUser);
        } else {
            window.addEventListener('auth-ready', (e) => resolve(e.detail.user), { once: true });
        }
    });
}