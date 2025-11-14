/*
|--------------------------------------------------------------------------
| Lógica do Carrinho (index.js)
|--------------------------------------------------------------------------
|
| Este arquivo conecta ao backend (AutoCart_Server) via Socket.io
| e sincroniza o carrinho em tempo real.
|
*/

// Importa o Socket.IO
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// Importa funções de autenticação
import { onAuthReady, getUserToken } from './authchek.js';

// --- Estado Global ---
let socket;
let currentCartId = null;
let currentCart = null; // A fonte da verdade virá do servidor
const API_URL = "http://localhost:3000"; // URL do autocart_server.js

// --- Elementos DOM ---
var barcodeInput = document.getElementById('barcodeInput');
var btnAdd = document.getElementById('btnAdd');
var message = document.getElementById('message');
var totalValue = document.getElementById('totalValue');
var itemCount = document.getElementById('itemCount');
var emptyCart = document.getElementById('emptyCart');
var cartItems = document.getElementById('cartItems');
var checkoutSection = document.getElementById('checkoutSection');
var checkoutTotal = document.getElementById('checkoutTotal');
var btnCheckout = document.getElementById('btnCheckout');

// ============================
// Inicialização
// ============================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Espera a autenticação estar pronta
    await onAuthReady();
    const token = await getUserToken();

    if (!token) {
        console.error("Não foi possível autenticar. Saindo...");
        return;
    }

    // 2. Descobrir qual carrinho conectar
    //    (ASSUMINDO que o QR Code te mandou para cá com URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const cartId = urlParams.get('cartId');
    const marketId = urlParams.get('marketId');

    if (!cartId || !marketId) {
        // Se não tiver os parâmetros, o app não sabe a qual carrinho conectar
        showMessage('Erro: Carrinho ou Mercado não identificado.', 'error');
        // Aqui terá um botão "Escanear QR do Carrinho"
        barcodeInput.disabled = true;
        btnAdd.disabled = true;
        return;
    }

    currentCartId = cartId;

    // 3. Conectar ao backend (HTTP POST)
    try {
        const response = await fetch(`${API_URL}/cart/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                marketId: marketId,
                cartPhysicalId: cartId
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Falha ao conectar ao carrinho');
        }

        const data = await response.json();
        console.log('Conectado ao carrinho com sucesso!', data);

        // 4. Conectar ao Socket.io
        connectToSocket(token, cartId);

    } catch (error) {
        console.error("Erro na conexão inicial:", error.message);
        showMessage(`Erro: ${error.message}`, 'error');
    }
});

// ============================
// Conexão Socket.io
// ============================

function connectToSocket(token, cartId) {
    socket = io(API_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('Socket.io conectado!', socket.id);
        // Entra na "sala" do carrinho
        socket.emit('join_cart_room', cartId);
    });

    // --- OUVINTES DE EVENTOS DO SERVIDOR ---

    // Este é o evento MAIS IMPORTANTE. Atualiza o app com os dados do servidor.
    socket.on('cart_update', (cartData) => {
        console.log('Recebido cart_update:', cartData);
        currentCart = cartData; // Atualiza nosso estado local
        updateCartDisplay();
    });

    socket.on('awaiting_weight', (product) => {
        showMessage(`Aguardando peso: Coloque ${product.name} no carrinho.`, 'info');
    });

    socket.on('scan_error', (errorMessage) => {
        showMessage(errorMessage, 'error');
    });

    socket.on('weight_error', (data) => {
        showMessage(`Peso incompatível para ${data.productName}! (Esperado: ${data.expected}g, Lido: ${data.received}g)`, 'error');
    });

    socket.on('checkout_complete', (cartData) => {
        showMessage('Compra finalizada com sucesso!', 'success');
        barcodeInput.disabled = true;
        btnAdd.disabled = true;
        btnCheckout.disabled = true;
        btnCheckout.textContent = "Pagamento Concluído";
    });

    socket.on('error', (error) => {
        console.error('Socket Error:', error);
        showMessage(error, 'error');
    });
}

// ============================
// Funções do Carrinho (MODIFICADAS)
// ============================

// Adicionar produto (agora emite um evento)
function addProductByBarcode(code) {
    if (!code.trim() || !socket) return;

    console.log(`Emitindo 'scan_barcode' para ${code}`);
    socket.emit('scan_barcode', {
        cartId: currentCartId,
        barcode: code
    });
    
    // Limpa o input
    barcodeInput.value = '';
    // Mensagem de "aguardando" será dada pelo servidor
    showMessage('Processando...', 'info');
}

// Finalizar compra (agora emite um evento)
function handleCheckout() {
    if (!socket || !currentCartId) return;
    
    // Aqui você abriria o modal de pagamento (payment.html)
    // Por enquanto, vamos só emitir o evento
    console.log("Iniciando checkout...");
    socket.emit('start_checkout', { cartId: currentCartId });
}

// Atualizar exibicao do carrinho
function updateCartDisplay() {
    // Se o estado do servidor for nulo, não faz nada
    if (!currentCart) {
        emptyCart.style.display = 'block';
        cartItems.innerHTML = '';
        checkoutSection.style.display = 'none';
        return;
    }

    const { items, totalValue: total } = currentCart;
    let totalItems = 0;
    items.forEach(item => totalItems += (item.quantity || 1)); // Assumindo que o backend não tenha quantity, usamos 1

    totalValue.textContent = formatPrice(total);
    checkoutTotal.textContent = formatPrice(total);
    itemCount.textContent = totalItems;

    if (items.length === 0) {
        emptyCart.style.display = 'block';
        cartItems.innerHTML = '';
        checkoutSection.style.display = 'none';
    } else {
        emptyCart.style.display = 'none';
        checkoutSection.style.display = 'block';
        renderCartItems(items);
    }
}

// Renderizar itens do carrinho
function renderCartItems(items) {
    let html = '';
    
    // O backend atual não agrupa itens, então vamos agrupar aqui
    const groupedItems = {};
    items.forEach(item => {
        if (groupedItems[item.barcode]) {
            groupedItems[item.barcode].quantity++;
        } else {
            groupedItems[item.barcode] = { ...item, quantity: 1 };
        }
    });

    for (const barcode in groupedItems) {
        const item = groupedItems[barcode];
        const subtotal = item.price * item.quantity;
        html += `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-code">Codigo: ${item.barcode}</div>
                    <div class="item-price">
                        ${formatPrice(item.price)} x ${item.quantity} = <strong>${formatPrice(subtotal)}</strong>
                    </div>
                </div>
                
                <!-- 
                NOTA IMPORTANTE: 
                Os botões de +/- e remover foram desativados.
                Nosso backend atual SÓ adiciona produtos via verificação de peso.
                Para reativá-los, precisaríamos criar novos eventos de socket 
                (ex: 'remove_item', 'update_quantity') e lógica no autocart_server.js
                -->
                <div class="item-controls" style="opacity: 0.5; pointer-events: none;">
                    <button class="qty-btn" disabled>-</button>
                    <div class="qty-display">${item.quantity}</div>
                    <button class="qty-btn" disabled>+</button>
                    <button class="btn-remove" disabled>X</button>
                </div>
            </div>`;
    }
    cartItems.innerHTML = html;
}

// ============================
// Funções Auxiliares
// ============================

function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message';
    if (type) {
        message.classList.add(type);
    }
    // Mensagens de info não somem sozinhas
    if (type !== 'info') {
        setTimeout(() => {
            if (message.textContent === text) {
                message.textContent = '';
                message.className = 'message';
            }
        }, 4000);
    }
}

function formatPrice(price) {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// =IA
function handleKeyPress(e) {
    var keycode = e.keyCode || e.which;
    if (keycode === 13) {
        addProductByBarcode(barcodeInput.value);
    }
}
function handleAddClick() {
    addProductByBarcode(barcodeInput.value);
}

// Event listeners
btnAdd.onclick = handleAddClick;
barcodeInput.onkeypress = handleKeyPress;
btnCheckout.onclick = handleCheckout;