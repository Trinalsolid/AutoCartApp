// ============================
// JS do Sistema de Login/Cadastro
// ============================

// Elementos DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const btnShowRegister = document.getElementById('btnShowRegister');
const btnShowLogin = document.getElementById('btnShowLogin');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');

// Inputs de Login
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const rememberMe = document.getElementById('rememberMe');
const loginMessage = document.getElementById('loginMessage');

// Inputs de Cadastro
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPhone = document.getElementById('registerPhone');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const acceptTerms = document.getElementById('acceptTerms');
const registerMessage = document.getElementById('registerMessage');

// ============================
// Funções de UI
// ============================

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

// ============================
// Validações
// ============================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
}

function validatePassword(password) {
    return password.length >= 6;
}

// ============================
// Funções de Login
// ============================

async function handleLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Validações
    if (!email || !password) {
        showMessage(loginMessage, 'Preencha todos os campos', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage(loginMessage, 'E-mail inválido', 'error');
        return;
    }

    try {
        // Simular chamada à API
        // const response = await fetch('http://localhost:3333/auth/login', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email, password })
        // });

        // Simulação de login (remover em produção)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simular resposta da API
        const user = {
            id: '123',
            name: 'João Silva',
            email: email,
            phone: '(11) 98765-4321'
        };

        const token = 'fake-jwt-token-123456';

        // Salvar no localStorage
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);

        if (rememberMe.checked) {
            localStorage.setItem('rememberMe', 'true');
        }

        showMessage(loginMessage, 'Login realizado com sucesso!', 'success');

        // Verificar se há URL de redirecionamento salva
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');

        // Redirecionar para a página apropriada
        setTimeout(() => {
            window.location.href = redirectUrl || 'index.html';
        }, 1000);

    } catch (error) {
        console.error('Erro no login:', error);
        showMessage(loginMessage, 'Erro ao fazer login. Tente novamente.', 'error');
    }
}

// ============================
// Funções de Cadastro
// ============================

async function handleRegister() {
    const name = registerName.value.trim();
    const email = registerEmail.value.trim();
    const phone = registerPhone.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    // Validações
    if (!name || !email || !phone || !password || !confirmPassword) {
        showMessage(registerMessage, 'Preencha todos os campos', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage(registerMessage, 'E-mail inválido', 'error');
        return;
    }

    if (!validatePhone(phone)) {
        showMessage(registerMessage, 'Telefone inválido', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage(registerMessage, 'A senha deve ter no mínimo 6 caracteres', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registerMessage, 'As senhas não coincidem', 'error');
        return;
    }

    if (!acceptTerms.checked) {
        showMessage(registerMessage, 'Você precisa aceitar os termos de uso', 'error');
        return;
    }

    try {
        // Simular chamada à API
        // const response = await fetch('http://localhost:3333/auth/register', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ name, email, phone, password })
        // });

        // Simulação de cadastro (remover em produção)
        await new Promise(resolve => setTimeout(resolve, 1000));

        showMessage(registerMessage, 'Conta criada com sucesso!', 'success');

        // Limpar formulário
        registerName.value = '';
        registerEmail.value = '';
        registerPhone.value = '';
        registerPassword.value = '';
        registerConfirmPassword.value = '';
        acceptTerms.checked = false;

        // Voltar para tela de login após 1.5s
        setTimeout(() => {
            toggleForms();
        }, 1500);

    } catch (error) {
        console.error('Erro no cadastro:', error);
        showMessage(registerMessage, 'Erro ao criar conta. Tente novamente.', 'error');
    }
}

// ============================
// Event Listeners
// ============================

// Alternar entre Login e Cadastro
btnShowRegister.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
});

btnShowLogin.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms();
});

// Botão de Login
btnLogin.addEventListener('click', handleLogin);

// Botão de Cadastro
btnRegister.addEventListener('click', handleRegister);

// Enter para fazer login
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// Enter para cadastrar
registerConfirmPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleRegister();
    }
});

// Máscara para telefone
registerPhone.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    
    e.target.value = value;
});

// ============================
// Verificar se já está logado
// ============================

function checkIfLoggedIn() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (user && token) {
        // Já está logado, redirecionar para index
        window.location.href = 'index.html';
    }
}

// ============================
// Inicialização
// ============================

document.addEventListener('DOMContentLoaded', () => {
    checkIfLoggedIn();
    
    // Focar no campo de e-mail ao carregar
    loginEmail.focus();
});