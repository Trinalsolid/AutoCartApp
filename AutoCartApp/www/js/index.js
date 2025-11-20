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

    // --- LÓGICA DE RETORNO DO MERCADO PAGO ---
    const urlParams = new URLSearchParams(window.location.search);
    const statusPagamento = urlParams.get('status'); 
    const paymentId = urlParams.get('payment_id');

    if (statusPagamento === 'approved') {
        // A. Tela de Bloqueio (Feedback Visual Imediato)
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#f7fafc;font-family:sans-serif;">
                <div style="font-size:4rem;">✅</div>
                <h2 style="color:#2d3748;margin-top:20px;">Pagamento Confirmado!</h2>
                <p style="color:#718096;">Finalizando pedido e gerando comprovante...</p>
            </div>
        `;

        // B. Recupera ID do carrinho
        const savedCartId = localStorage.getItem('savedCartId');
        
        if (savedCartId && token) {
            // C. Reconecta socket especificamente para finalizar
            socket = io(API_URL, { auth: { token } });
            
            socket.on('connect', () => {
                console.log('Reconectado para finalizar checkout...');
                
                // D. Envia comando de confirmação
                socket.emit('payment_confirmed', { 
                    cartId: savedCartId, 
                    paymentId: paymentId 
                });
            });

            // E. Espera o servidor dizer que SALVOU NO BANCO
            socket.on('checkout_complete', () => {
                console.log("Banco atualizado. Redirecionando...");
                localStorage.removeItem('savedCartId'); // Limpa lixo
                
                // F. Redireciona para o histórico
                // Adicionamos um timestamp para garantir que não use cache
                setTimeout(() => {
                    window.location.href = 'historico.html?new_order=true&t=' + Date.now();
                }, 1000); 
            });
            
            return; // Para a execução do resto do script
        }
    }
    // -------------------------------------------------------

    // 2. Descobrir qual carrinho conectar
    //    (ASSUMINDO que o QR Code te mandou para cá com URL params)
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

    // --- NOVO CÓDIGO TEMPORÁRIO PARA TESTES ---
    socket.on('awaiting_weight', (product) => {
        // Isso é o que você vê na tela:
        showMessage(`Aguardando peso: Coloque ${product.name} no carrinho.`, 'info'); 
        
        console.warn("--- SIMULANDO PESO EM 2 SEGUNDOS! ---");
        
        // Simula a leitura da balança após 2 segundos: 1.000g (1kg)
        setTimeout(() => {
            socket.emit('weight_received', {
                cartId: currentCartId,
                barcode: product.barcode, // Envia o código de barras de volta
                weight: 1000 // Peso em gramas (Ex: 1000g = 1kg)
            });
            showMessage(`Peso de 1.000g (1kg) enviado para ${product.name}.`, 'info');
        }, 2000);
    });
    // --- FIM DO CÓDIGO TEMPORÁRIO ---

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

// ============================
// Checkout com Mercado Pago
// ============================

async function handleCheckout() {
    if (!currentCartId || !currentCart || !currentCart.items.length) {
        showMessage('O carrinho está vazio ou não conectado.', 'error');
        return;
    }
    
    // Desabilita o botão para evitar clique duplo
    btnCheckout.disabled = true;
    btnCheckout.textContent = "Gerando pagamento...";

    try {
        // 1. Pega o token de autenticação (já importado no seu código)
        const token = await getUserToken(); 

        // 2. Prepara os dados para enviar ao Backend
        // O backend espera: { items: [...], payerEmail: ... }
        const payload = {
            items: currentCart.items,
            payerEmail: document.getElementById('userEmail')?.textContent || 'email@teste.com'
        };

        // 3. Chama a API que criamos no Server
        const response = await fetch(`${API_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Importante para passar no checkAuth
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Falha ao criar pagamento');
        }

        const data = await response.json();

        // 4. REDIRECIONA o usuário para o Mercado Pago
        if (data.link_pagamento) {
            // [NOVO] Salva o ID do carrinho para não perder na volta
            localStorage.setItem('savedCartId', currentCartId);
            localStorage.setItem('savedMarketId', new URLSearchParams(window.location.search).get('marketId'));

            console.log("Redirecionando...", data.link_pagamento);
            window.location.href = data.link_pagamento;
        } else {
            throw new Error('Link de pagamento não recebido');
        }

    } catch (error) {
        console.error("Erro no checkout:", error);
        showMessage('Erro ao iniciar pagamento: ' + error.message, 'error');
        btnCheckout.disabled = false;
        btnCheckout.textContent = `Finalizar Compra - ${formatPrice(currentCart.totalValue)}`;
    }
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

    // --- CORREÇÃO DE ROBUSTEZ ---
    // Garante que 'items' é um array e 'total' é 0, se vierem como null/undefined do servidor.
    const items = currentCart.items || [];
    const total = currentCart.totalValue || 0; // <--- CORREÇÃO CRÍTICA DO TypeError
    // --- FIM DA CORREÇÃO ---
    
    let totalItems = 0;
    // O forEach agora é seguro, pois 'items' é garantido como array
    items.forEach(item => totalItems += (item.quantity || 1)); 

    // O formatPrice agora recebe 0 no pior caso, evitando o TypeError
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
        // Use parseFloat para garantir que o preço seja um número. 
        // Se item.price for undefined/null, resultará em NaN, então usamos 0 para evitar quebra.
        const itemPrice = parseFloat(item.price) || 0; 
        
        // NOVO CÁLCULO
        const subtotal = itemPrice * item.quantity; 
        
        html += `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-code">Codigo: ${item.barcode}</div>
                    <div class="item-price">
                        ${formatPrice(itemPrice)} x ${item.quantity} = <strong>${formatPrice(subtotal)}</strong>
                    </div>
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
    // Garante que o valor é um número (ou 0 se for null/undefined)
    const numericPrice = parseFloat(price) || 0; 
    
    // O erro estava aqui: se price for null, ele tenta .toLocaleString
    return numericPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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