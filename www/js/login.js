/*
|--------------------------------------------------------------------------
| Lógica de Login/Cadastro (firebase-login.js)
|--------------------------------------------------------------------------
|
| Substitui 'login.js'.
| Usa o Firebase Authentication para login e registro reais.
|
*/

import { 
    auth, db, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    doc, setDoc
} from './firebase-config.js';

// Elementos DOM (iguais aos seus)
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const btnShowRegister = document.getElementById('btnShowRegister');
const btnShowLogin = document.getElementById('btnShowLogin');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginMessage = document.getElementById('loginMessage');

const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPhone = document.getElementById('registerPhone');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const acceptTerms = document.getElementById('acceptTerms');
const registerMessage = document.getElementById('registerMessage');

// --- Funções de UI (idênticas às suas) ---
function showMessage(element, text, type) {
    element.textContent = text;
    element.className = 'message';
    if (type) {
        element.classList.add(type);
    }
    
    setTimeout(() => {
        element.textContent = '';
        element.className = 'message';
    }, 4000);
}
function toggleForms() {
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
}
// --- Validações (idênticas às suas) ---
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
function validatePhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
}
function validatePassword(password) {
    return password.length >= 6;
}
// --- Máscara (idêntica à sua) ---
registerPhone.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    e.target.value = value;
});


// ============================
// Funções de Login (MODIFICADAS)
// ============================

async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password || !validateEmail(email)) {
        showMessage(loginMessage, 'E-mail ou senha inválidos', 'error');
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    try {
        // --- CHAMADA REAL DO FIREBASE ---
        await signInWithEmailAndPassword(auth, email, password);
        
        // Sucesso!
        showMessage(loginMessage, 'Login realizado com sucesso!', 'success');
        
        // O 'firebase-auth.js' vai cuidar do redirecionamento
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        
        setTimeout(() => {
            window.location.href = redirectUrl || 'index.html';
        }, 1000);

    } catch (error) {
        console.error('Erro no login:', error.code);
        let msg = 'Erro ao fazer login. Tente novamente.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            msg = 'E-mail ou senha incorretos.';
        }
        showMessage(loginMessage, msg, 'error');
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar";
    }
}

// ============================
// Funções de Cadastro (MODIFICADAS)
// ============================

async function handleRegister() {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const phone = registerPhone.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    // Validações (idênticas)
    if (!name || !email || !phone || !password || !confirmPassword) {
        showMessage(registerMessage, 'Preencha todos os campos', 'error'); return;
    }
    if (!validateEmail(email)) {
        showMessage(registerMessage, 'E-mail inválido', 'error'); return;
    }
    if (!validatePhone(phone)) {
        showMessage(registerMessage, 'Telefone inválido', 'error'); return;
    }
    if (!validatePassword(password)) {
        showMessage(registerMessage, 'A senha deve ter no mínimo 6 caracteres', 'error'); return;
    }
    if (password !== confirmPassword) {
        showMessage(registerMessage, 'As senhas não coincidem', 'error'); return;
    }
    if (!acceptTerms.checked) {
        showMessage(registerMessage, 'Você precisa aceitar os termos de uso', 'error'); return;
    }

    btnRegister.disabled = true;
    btnRegister.textContent = "Criando...";

    try {
        // --- CHAMADA REAL DO FIREBASE ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 1. Atualiza o perfil do Firebase Auth (adiciona o nome)
        await updateProfile(user, {
            displayName: name
        });

        // 2. Salva informações extras (como telefone) no Firestore
        // Isso cria um documento 'users/<userId>'
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            phone: phone,
            createdAt: new Date()
        });

        showMessage(registerMessage, 'Conta criada com sucesso!', 'success');
        
        setTimeout(() => {
            toggleForms();
            loginEmail.value = email; // Facilita o login
            loginPassword.focus();
        }, 1500);

    } catch (error) {
        console.error('Erro no cadastro:', error.code);
        let msg = 'Erro ao criar conta. Tente novamente.';
        if (error.code === 'auth/email-already-in-use') {
            msg = 'Este e-mail já está em uso.';
        }
        showMessage(registerMessage, msg, 'error');
    } finally {
        btnRegister.disabled = false;
        btnRegister.textContent = "Criar conta";
    }
}

// ============================
// Event Listeners (quase idênticos)
// ============================
btnShowRegister.addEventListener('click', (e) => { e.preventDefault(); toggleForms(); });
btnShowLogin.addEventListener('click', (e) => { e.preventDefault(); toggleForms(); });
btnLogin.addEventListener('click', handleLogin);
btnRegister.addEventListener('click', handleRegister);
loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
registerConfirmPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleRegister(); });

// ============================
// Inicialização
// ============================
document.addEventListener('DOMContentLoaded', () => {
    // A verificação de "já logado" agora é feita pelo 'firebase-auth.js'
    loginEmail.focus();
});