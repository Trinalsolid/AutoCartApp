// Elementos do DOM
const btnAddPayment = document.getElementById('btnAddPayment');
const emptyState = document.getElementById('emptyState');
const paymentMethodsList = document.getElementById('paymentMethodsList');
const cardModal = document.getElementById('cardModal');
const pixModal = document.getElementById('pixModal');
const otherModal = document.getElementById('otherModal');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Formulários
const cardForm = document.getElementById('cardForm');
const pixForm = document.getElementById('pixForm');
const otherForm = document.getElementById('otherForm');

// Inputs do cartão
const cardNumber = document.getElementById('cardNumber');
const cardHolder = document.getElementById('cardHolder');
const cardExpiry = document.getElementById('cardExpiry');
const cardCVV = document.getElementById('cardCVV');
const cardDefault = document.getElementById('cardDefault');

// Preview do cartão
const previewNumber = document.getElementById('previewNumber');
const previewHolder = document.getElementById('previewHolder');
const previewExpiry = document.getElementById('previewExpiry');
const cardBrand = document.getElementById('cardBrand');

// Variável global para tipo de método sendo adicionado
let currentMethodType = '';
let editingMethodId = null;

// Carregar métodos salvos
window.addEventListener('load', loadPaymentMethods);

// Event listeners
btnAddPayment.addEventListener('click', () => {
    showMethodSelection();
});

// Métodos disponíveis
document.querySelectorAll('.method-option').forEach(option => {
    option.addEventListener('click', function() {
        const type = this.dataset.type;
        currentMethodType = type;
        
        if (type === 'credit' || type === 'debit') {
            openCardModal(type);
        } else if (type === 'pix') {
            openPixModal();
        } else {
            openOtherModal(type);
        }
    });
});

// Preview em tempo real do cartão
cardNumber.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\s/g, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
    
    previewNumber.textContent = formattedValue || '•••• •••• •••• ••••';
    
    // Detectar bandeira
    detectCardBrand(value);
});

cardHolder.addEventListener('input', function(e) {
    previewHolder.textContent = e.target.value.toUpperCase() || 'NOME DO TITULAR';
});

cardExpiry.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
    previewExpiry.textContent = value || 'MM/AA';
});

cardCVV.addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Detectar bandeira do cartão
function detectCardBrand(number) {
    const firstDigit = number.charAt(0);
    const firstTwoDigits = number.slice(0, 2);
    
    if (firstDigit === '4') {
        cardBrand.textContent = '💳 Visa';
    } else if (firstTwoDigits >= '51' && firstTwoDigits <= '55') {
        cardBrand.textContent = '💳 Mastercard';
    } else if (firstTwoDigits === '50' || firstTwoDigits === '60' || firstTwoDigits === '65') {
        cardBrand.textContent = '💳 Elo';
    } else if (firstTwoDigits === '36' || firstTwoDigits === '38') {
        cardBrand.textContent = '💳 Diners';
    } else if (firstTwoDigits === '34' || firstTwoDigits === '37') {
        cardBrand.textContent = '💳 Amex';
    } else {
        cardBrand.textContent = '';
    }
}

// Máscara para tipo de chave PIX
document.getElementById('pixType').addEventListener('change', function() {
    const pixKey = document.getElementById('pixKey');
    const type = this.value;
    
    pixKey.value = '';
    
    switch(type) {
        case 'cpf':
            pixKey.placeholder = '000.000.000-00';
            pixKey.maxLength = 14;
            break;
        case 'phone':
            pixKey.placeholder = '(00) 00000-0000';
            pixKey.maxLength = 15;
            break;
        case 'email':
            pixKey.placeholder = 'seuemail@exemplo.com';
            pixKey.maxLength = 100;
            break;
        case 'random':
            pixKey.placeholder = 'Chave aleatória';
            pixKey.maxLength = 50;
            break;
        default:
            pixKey.placeholder = 'Digite sua chave';
    }
});

// Aplicar máscaras no PIX
document.getElementById('pixKey').addEventListener('input', function(e) {
    const type = document.getElementById('pixType').value;
    let value = e.target.value;
    
    if (type === 'cpf') {
        value = value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    } else if (type === 'phone') {
        value = value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    }
});

// Submit formulário de cartão
cardForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!validateCardForm()) {
        return;
    }
    
    const method = {
        id: editingMethodId || Date.now().toString(),
        type: currentMethodType,
        name: currentMethodType === 'credit' ? 'Cartão de Crédito' : 'Cartão de Débito',
        details: {
            number: cardNumber.value,
            holder: cardHolder.value,
            expiry: cardExpiry.value,
            brand: cardBrand.textContent || '💳'
        },
        isDefault: cardDefault.checked
    };
    
    savePaymentMethod(method);
    closeCardModal();
    showToast('Cartão salvo com sucesso!');
});

// Submit formulário PIX
pixForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const pixType = document.getElementById('pixType').value;
    const pixKey = document.getElementById('pixKey').value;
    const pixName = document.getElementById('pixName').value;
    const pixDefault = document.getElementById('pixDefault').checked;
    
    if (!pixType || !pixKey || !pixName) {
        showToast('Preencha todos os campos!');
        return;
    }
    
    const method = {
        id: editingMethodId || Date.now().toString(),
        type: 'pix',
        name: pixName,
        details: {
            type: pixType,
            key: pixKey
        },
        isDefault: pixDefault
    };
    
    savePaymentMethod(method);
    closePixModal();
    showToast('PIX salvo com sucesso!');
});

// Submit formulário outros
otherForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const otherName = document.getElementById('otherName').value;
    const otherDefault = document.getElementById('otherDefault').checked;
    
    if (!otherName) {
        showToast('Digite um nome para o método!');
        return;
    }
    
    const method = {
        id: editingMethodId || Date.now().toString(),
        type: currentMethodType,
        name: otherName,
        details: {},
        isDefault: otherDefault
    };
    
    savePaymentMethod(method);
    closeOtherModal();
    showToast('Método salvo com sucesso!');
});

// Validar formulário de cartão
function validateCardForm() {
    if (cardNumber.value.replace(/\s/g, '').length < 13) {
        showToast('Número do cartão inválido!');
        return false;
    }
    
    if (!cardHolder.value) {
        showToast('Digite o nome do titular!');
        return false;
    }
    
    if (cardExpiry.value.length < 5) {
        showToast('Data de validade inválida!');
        return false;
    }
    
    if (cardCVV.value.length < 3) {
        showToast('CVV inválido!');
        return false;
    }
    
    return true;
}

// Salvar método de pagamento
function savePaymentMethod(method) {
    let methods = JSON.parse(localStorage.getItem('paymentMethods') || '[]');
    
    // Se for padrão, remove o padrão dos outros
    if (method.isDefault) {
        methods = methods.map(m => ({ ...m, isDefault: false }));
    }
    
    // Verifica se está editando ou adicionando
    const existingIndex = methods.findIndex(m => m.id === method.id);
    if (existingIndex >= 0) {
        methods[existingIndex] = method;
    } else {
        methods.push(method);
    }
    
    localStorage.setItem('paymentMethods', JSON.stringify(methods));
    loadPaymentMethods();
    editingMethodId = null;
}

// Carregar métodos de pagamento
function loadPaymentMethods() {
    const methods = JSON.parse(localStorage.getItem('paymentMethods') || '[]');
    
    if (methods.length === 0) {
        emptyState.style.display = 'block';
        paymentMethodsList.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    paymentMethodsList.style.display = 'flex';
    
    paymentMethodsList.innerHTML = methods.map(method => createPaymentItemHTML(method)).join('');
    
    // Adicionar event listeners
    document.querySelectorAll('.payment-item').forEach(item => {
        const id = item.dataset.id;
        
        item.querySelector('.btn-icon-action.delete')?.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePaymentMethod(id);
        });
        
        item.querySelector('.btn-icon-action.edit')?.addEventListener('click', (e) => {
            e.stopPropagation();
            editPaymentMethod(id);
        });
    });
}

// Criar HTML do item
function createPaymentItemHTML(method) {
    const icon = getMethodIcon(method.type);
    const details = getMethodDetails(method);
    
    return `
        <div class="payment-item ${method.isDefault ? 'default' : ''}" data-id="${method.id}">
            <div class="payment-icon">${icon}</div>
            <div class="payment-details">
                <span class="payment-name">${method.name}</span>
                <span class="payment-info">${details}</span>
            </div>
            <div class="payment-actions">
                <button class="btn-icon-action edit" title="Editar">✏️</button>
                <button class="btn-icon-action delete" title="Excluir">🗑️</button>
            </div>
        </div>
    `;
}

// Obter ícone do método
function getMethodIcon(type) {
    const icons = {
        credit: '💳',
        debit: '🏦',
        pix: '📱',
        money: '💵',
        voucher: '🎫'
    };
    return icons[type] || '💰';
}

// Obter detalhes do método
function getMethodDetails(method) {
    if (method.type === 'credit' || method.type === 'debit') {
        const lastFour = method.details.number.slice(-4);
        return `•••• ${lastFour} | ${method.details.brand}`;
    } else if (method.type === 'pix') {
        return `${method.details.type.toUpperCase()} | ${maskPixKey(method.details.key, method.details.type)}`;
    }
    return 'Método de pagamento';
}

// Mascarar chave PIX
function maskPixKey(key, type) {
    if (type === 'cpf') {
        return key.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.**$2');
    } else if (type === 'phone') {
        return key.replace(/\((\d{2})\) \d{5}-(\d{4})/, '($1) *****-$2');
    } else if (type === 'email') {
        return key.replace(/(.{3}).*@/, '$1***@');
    }
    return key.slice(0, 8) + '***';
}

// Excluir método
function deletePaymentMethod(id) {
    if (!confirm('Deseja excluir este método de pagamento?')) {
        return;
    }
    
    let methods = JSON.parse(localStorage.getItem('paymentMethods') || '[]');
    methods = methods.filter(m => m.id !== id);
    localStorage.setItem('paymentMethods', JSON.stringify(methods));
    
    loadPaymentMethods();
    showToast('Método excluído!');
}

// Editar método
function editPaymentMethod(id) {
    const methods = JSON.parse(localStorage.getItem('paymentMethods') || '[]');
    const method = methods.find(m => m.id === id);
    
    if (!method) return;
    
    editingMethodId = id;
    currentMethodType = method.type;
    
    if (method.type === 'credit' || method.type === 'debit') {
        cardNumber.value = method.details.number;
        cardHolder.value = method.details.holder;
        cardExpiry.value = method.details.expiry;
        cardDefault.checked = method.isDefault;
        
        previewNumber.textContent = method.details.number;
        previewHolder.textContent = method.details.holder.toUpperCase();
        previewExpiry.textContent = method.details.expiry;
        cardBrand.textContent = method.details.brand;
        
        document.getElementById('modalTitle').textContent = 'Editar Cartão';
        openCardModal(method.type);
    } else if (method.type === 'pix') {
        document.getElementById('pixType').value = method.details.type;
        document.getElementById('pixKey').value = method.details.key;
        document.getElementById('pixName').value = method.name;
        document.getElementById('pixDefault').checked = method.isDefault;
        
        openPixModal();
    } else {
        document.getElementById('otherName').value = method.name;
        document.getElementById('otherDefault').checked = method.isDefault;
        document.getElementById('otherModalTitle').textContent = 'Editar Método';
        
        openOtherModal(method.type);
    }
}

// Mostrar seleção de métodos
function showMethodSelection() {
    // Scroll suave até a seção de métodos disponíveis
    document.querySelector('.available-methods').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
}

// Abrir modal de cartão
function openCardModal(type) {
    document.getElementById('modalTitle').textContent = 
        type === 'credit' ? 'Adicionar Cartão de Crédito' : 'Adicionar Cartão de Débito';
    cardModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Fechar modal de cartão
function closeCardModal() {
    cardModal.classList.remove('show');
    document.body.style.overflow = '';
    cardForm.reset();
    resetCardPreview();
    editingMethodId = null;
}

// Resetar preview do cartão
function resetCardPreview() {
    previewNumber.textContent = '•••• •••• •••• ••••';
    previewHolder.textContent = 'NOME DO TITULAR';
    previewExpiry.textContent = 'MM/AA';
    cardBrand.textContent = '';
}

// Abrir modal PIX
function openPixModal() {
    pixModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Fechar modal PIX
function closePixModal() {
    pixModal.classList.remove('show');
    document.body.style.overflow = '';
    pixForm.reset();
    editingMethodId = null;
}

// Abrir modal outros
function openOtherModal(type) {
    const titles = {
        money: 'Adicionar Dinheiro',
        voucher: 'Adicionar Vale Alimentação'
    };
    document.getElementById('otherModalTitle').textContent = titles[type] || 'Adicionar Método';
    otherModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Fechar modal outros
function closeOtherModal() {
    otherModal.classList.remove('show');
    document.body.style.overflow = '';
    otherForm.reset();
    editingMethodId = null;
}

// Event listeners para fechar modais
document.getElementById('btnCloseModal').addEventListener('click', closeCardModal);
document.getElementById('btnCancel').addEventListener('click', closeCardModal);

// Fechar modal clicando fora
[cardModal, pixModal, otherModal].forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('show');
            document.body.style.overflow = '';
            editingMethodId = null;
        }
    });
});

// Toast
function showToast(message, duration = 2000) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}