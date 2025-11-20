/*
|--------------------------------------------------------------------------
| AutoCart - Lógica do Carrinho Inteligente v2.0
|--------------------------------------------------------------------------
| 
| NOVIDADES:
| - Quantidade personalizável ANTES de adicionar produto
| - Remoção de itens com confirmação de peso
| - Sistema de simulação de balança (fácil migração para hardware real)
| - Mensagens persistentes e contextuais
| - Feedback visual aprimorado
|
*/

// ============================
// IMPORTS
// ============================
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
import { onAuthReady, getUserToken } from './authchek.js';

// ============================
// CONFIGURAÇÃO
// ============================
const CONFIG = {
    API_URL: "http://localhost:3000",
    RECONNECT_DELAY: 3000,
    CACHE_EXPIRATION: 5 * 60 * 1000,
    MESSAGE_TIMEOUT: 8000, // 8 segundos (era 4s)

    // SIMULAÇÃO DE BALANÇA
    // Para usar hardware real: set SIMULATE_WEIGHT = false
    SIMULATE_WEIGHT: true,
    WEIGHT_TOLERANCE: 50, // ±50g de tolerância
};

// ============================
// ESTADO GLOBAL
// ============================
let socket = null;
let currentCartId = null;
let currentCart = null;
let reconnectionTimer = null;

// Novo: Estado de quantidade selecionada
let selectedQuantity = 1;

// Novo: Controle de mensagens persistentes
let persistentMessageActive = false;

// ============================
// ELEMENTOS DOM
// ============================
const DOM = {
    barcodeInput: document.getElementById('barcodeInput'),
    btnAdd: document.getElementById('btnAdd'),
    message: document.getElementById('message'),
    totalValue: document.getElementById('totalValue'),
    itemCount: document.getElementById('itemCount'),
    emptyCart: document.getElementById('emptyCart'),
    cartItems: document.getElementById('cartItems'),
    checkoutSection: document.getElementById('checkoutSection'),
    checkoutTotal: document.getElementById('checkoutTotal'),
    btnCheckout: document.getElementById('btnCheckout'),

    // Novos elementos
    quantitySelector: null, // Será criado dinamicamente
};

// ============================
// INICIALIZAÇÃO
// ============================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cria seletor de quantidade
        createQuantitySelector();

        await onAuthReady();
        const token = await getUserToken();

        if (!token) {
            showMessage('⚠️ Faça login para usar o AutoCart', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        const isPaymentReturn = await handlePaymentReturn(token);
        if (isPaymentReturn) return;

        const { cartId, marketId } = getConnectionParams();

        if (!cartId || !marketId) {
            console.warn("❌ Parâmetros de conexão ausentes");
            showQRCodeScanner();
            return;
        }

        currentCartId = cartId;
        restoreCartState(cartId);
        await connectToBackend(token, cartId, marketId);
        connectToSocket(token, cartId);

    } catch (error) {
        console.error("💥 Erro na inicialização:", error);
        showMessage(`Erro fatal: ${error.message}`, 'error');
    }
});

// ============================
// NOVO: SELETOR DE QUANTIDADE
// ============================
/**
 * Cria interface para selecionar quantidade antes de adicionar
 */
function createQuantitySelector() {
    const scannerSection = document.querySelector('.scanner-section');

    const qtyDiv = document.createElement('div');
    qtyDiv.className = 'quantity-selector';
    qtyDiv.innerHTML = `
        <label for="quantityInput">Quantidade:</label
        <div class="qty-controls">
            <button id="qtyMinus" class="qty-btn">−</button>
            <input type="number" id="quantityInput" value="1" min="1" max="50">
            <button id="qtyPlus" class="qty-btn">+</button>
        </div>
        <small class="qty-hint">💡 Defina a quantidade antes de escanear</small>
    `;

    // Insere antes do input de código de barras
    scannerSection.insertBefore(qtyDiv, scannerSection.firstChild);

    DOM.quantitySelector = document.getElementById('quantityInput');

    // Event Listeners
    document.getElementById('qtyMinus').onclick = () => {
        if (selectedQuantity > 1) {
            selectedQuantity--;
            DOM.quantitySelector.value = selectedQuantity;
        }
    };

    document.getElementById('qtyPlus').onclick = () => {
        if (selectedQuantity < 50) {
            selectedQuantity++;
            DOM.quantitySelector.value = selectedQuantity;
        }
    };

    DOM.quantitySelector.addEventListener('change', (e) => {
        let value = parseInt(e.target.value) || 1;
        value = Math.max(1, Math.min(50, value));
        selectedQuantity = value;
        e.target.value = value;
    });
}

// ============================
// CONEXÃO COM BACKEND
// ============================
async function connectToBackend(token, cartId, marketId) {
    try {
        showPersistentMessage('🔄 Conectando ao carrinho...', 'info');

        const response = await fetch(`${CONFIG.API_URL}/cart/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                marketId,
                cartPhysicalId: cartId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha na conexão');
        }

        const data = await response.json();
        console.log('✅ Conectado ao carrinho:', data);

    } catch (error) {
        console.error("❌ Erro ao conectar:", error);
        showMessage(`Erro: ${error.message}`, 'error', true);

        setTimeout(() => {
            if (confirm('Falha na conexão. Tentar novamente?')) {
                location.reload();
            }
        }, 3000);

        throw error;
    }
}

// ============================
// CONEXÃO WEBSOCKET
// ============================
function connectToSocket(token, cartId) {
    socket = io(CONFIG.API_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000
    });

    // --- EVENTOS DE CONEXÃO ---

    socket.on('connect', () => {
        console.log('🔌 Socket conectado:', socket.id);
        socket.emit('join_cart_room', cartId);
        showPersistentMessage('✅ Carrinho conectado! Pronto para escanear.', 'success');

        // Remove mensagem de sucesso após 5 segundos
        setTimeout(() => {
            if (!persistentMessageActive) clearMessage();
        }, 5000);

        if (reconnectionTimer) {
            clearTimeout(reconnectionTimer);
            reconnectionTimer = null;
        }
    });

    socket.on('disconnect', (reason) => {
        console.warn('⚠️ Desconectado:', reason);

        if (reason === 'io server disconnect') {
            showPersistentMessage('⚠️ Carrinho desconectado. Reconecte o QR Code.', 'warning');
        } else {
            showPersistentMessage('⚠️ Conexão perdida. Reconectando...', 'warning');
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconectado após ${attemptNumber} tentativas`);
        showMessage('✅ Reconectado com sucesso!', 'success', true);
    });

    socket.on('reconnect_failed', () => {
        showPersistentMessage('❌ Falha na reconexão. Recarregue a página.', 'error');
        DOM.barcodeInput.disabled = true;
        DOM.btnAdd.disabled = true;
    });

    // --- EVENTOS DO CARRINHO ---

    /**
     * CART_UPDATE: Atualização completa do carrinho
     */
    socket.on('cart_update', (cartData) => {
        console.log('📦 Carrinho atualizado:', cartData);

        currentCart = cartData;
        saveCartState(cartData);
        updateCartDisplay();

        // Limpa mensagens de aguardo quando atualização bem-sucedida
        if (persistentMessageActive) {
            clearPersistentMessage();
        }
    });

    /**
     * AWAITING_WEIGHT: Aguardando produto ser colocado no carrinho
     */
    socket.on('awaiting_weight', (data) => {
        const { product, expectedWeight, quantity } = data;
        console.log('⚖️ Aguardando peso:', data);

        const message = quantity > 1
            ? `⚖️ <strong>Aguardando:</strong> Coloque <strong>${quantity}x ${product.name}</strong> no carrinho<br>
               <small>Peso esperado: ~${expectedWeight}g</small>`
            : `⚖️ <strong>Aguardando:</strong> Coloque <strong>${product.name}</strong> no carrinho<br>
               <small>Peso esperado: ~${expectedWeight}g</small>`;

        showPersistentMessage(message, 'warning');

        // Simula leitura de peso (se configurado)
        if (CONFIG.SIMULATE_WEIGHT) {
            simulateWeightReading(product, expectedWeight, quantity);
        }
    });

    /**
     * WEIGHT_CONFIRMED: Peso validado, produto adicionado
     */
    socket.on('weight_confirmed', (data) => {
        const { product, quantity } = data;

        const message = quantity > 1
            ? `✅ ${quantity}x ${product.name} adicionados com sucesso!`
            : `✅ ${product.name} adicionado com sucesso!`;

        showMessage(message, 'success', true);

        // Reseta quantidade para 1
        selectedQuantity = 1;
        DOM.quantitySelector.value = 1;
    });

    /**
     * AWAITING_REMOVAL: Aguardando remoção física do produto
     */
    socket.on('awaiting_removal', (data) => {
        const { product, expectedWeight, quantityToRemove } = data;
        console.log('🗑️ Aguardando remoção:', data);

        const message = quantityToRemove > 1
            ? `🗑️ <strong>Aguardando:</strong> Remova <strong>${quantityToRemove}x ${product.name}</strong> do carrinho<br>
               <small>Peso a ser subtraído: ~${expectedWeight}g</small>`
            : `🗑️ <strong>Aguardando:</strong> Remova <strong>${product.name}</strong> do carrinho<br>
               <small>Peso a ser subtraído: ~${expectedWeight}g</small>`;

        showPersistentMessage(message, 'warning');

        // Simula leitura de peso (se configurado)
        if (CONFIG.SIMULATE_WEIGHT) {
            simulateWeightRemoval(product, expectedWeight, quantityToRemove);
        }
    });

    /**
     * REMOVAL_CONFIRMED: Remoção validada
     */
    socket.on('removal_confirmed', (data) => {
        const { product, quantityRemoved } = data;

        const message = quantityRemoved > 1
            ? `✅ ${quantityRemoved}x ${product.name} removidos!`
            : `✅ ${product.name} removido!`;

        showMessage(message, 'success', true);
    });

    /**
     * SCAN_ERROR: Código inválido ou produto não encontrado
     */
    socket.on('scan_error', (errorMessage) => {
        showMessage(`❌ ${errorMessage}`, 'error', true);
        clearPersistentMessage();
    });

    /**
     * WEIGHT_ERROR: Peso incompatível (possível fraude)
     */
    socket.on('weight_error', (data) => {
        const message = `⚠️ <strong>Peso incompatível!</strong><br>
            Produto: ${data.productName}<br>
            Esperado: ~${data.expected}g | Lido: ${data.received}g<br>
            <small>Tolerância: ±${CONFIG.WEIGHT_TOLERANCE}g</small>`;

        showMessage(message, 'error', true);
        clearPersistentMessage();
        playErrorSound();
    });

    /**
     * ERROR: Erro genérico
     */
    socket.on('error', (error) => {
        console.error('❌ Erro do servidor:', error);
        showMessage(error.message || error, 'error', true);
        clearPersistentMessage();
    });
}

// ============================
// SIMULAÇÃO DE BALANÇA
// ============================
/**
 * Simula leitura de peso ao ADICIONAR produto
 * Em produção: substituir por leitura real do ESP32
 */
function simulateWeightReading(product, expectedWeight, quantity) {
    console.log('🧪 [SIMULAÇÃO] Simulando leitura de peso...');

    // Aguarda 2 segundos (tempo realista para colocar no carrinho)
    setTimeout(() => {
        // Simula pequena variação de peso (±30g é normal)
        const variance = Math.floor(Math.random() * 60) - 30; // -30 a +30
        const measuredWeight = expectedWeight + variance;

        console.log(`🧪 [SIMULAÇÃO] Peso lido: ${measuredWeight}g (esperado: ${expectedWeight}g)`);

        // Envia para o servidor
        socket.emit('weight_reading', {
            cartId: currentCartId,
            barcode: product.barcode,
            measuredWeight: measuredWeight,
            quantity: quantity
        });
    }, 2000);
}

/**
 * Simula leitura de peso ao REMOVER produto
 */
function simulateWeightRemoval(product, expectedWeight, quantity) {
    console.log('🧪 [SIMULAÇÃO] Simulando remoção...');

    setTimeout(() => {
        const variance = Math.floor(Math.random() * 60) - 30;
        const measuredWeight = expectedWeight + variance;

        console.log(`🧪 [SIMULAÇÃO] Peso removido: ${measuredWeight}g (esperado: ${expectedWeight}g)`);

        socket.emit('weight_removal_reading', {
            cartId: currentCartId,
            barcode: product.barcode,
            measuredWeight: measuredWeight,
            quantity: quantity
        });
    }, 2000);
}

/**
 * MIGRAÇÃO PARA HARDWARE REAL:
 * 
 * No ESP32, implemente:
 * 
 * void sendWeightToServer(float weight) {
 *     String payload = "{\"cartId\":\"" + cartId + 
 *                      "\",\"barcode\":\"" + lastScannedBarcode + 
 *                      "\",\"measuredWeight\":" + String(weight) + 
 *                      ",\"quantity\":" + String(quantity) + "}";
 *     
 *     socket.emit("weight_reading", payload);
 * }
 * 
 * Então, aqui no frontend, simplesmente remova:
 * - CONFIG.SIMULATE_WEIGHT = false
 * - Comentar/remover simulateWeightReading() e simulateWeightRemoval()
 */

// ============================
// ADICIONAR PRODUTO
// ============================
function addProductByBarcode(barcode) {
    if (!barcode || !barcode.trim()) {
        showMessage('❌ Digite um código de barras', 'error', true);
        return;
    }

    if (!socket || !socket.connected) {
        showMessage('❌ Carrinho não conectado', 'error', true);
        return;
    }

    console.log(`📡 Escaneando: ${barcode} (Quantidade: ${selectedQuantity})`);

    socket.emit('scan_barcode', {
        cartId: currentCartId,
        barcode: barcode.trim(),
        quantity: selectedQuantity // Envia quantidade selecionada
    });

    DOM.barcodeInput.value = '';
    showPersistentMessage('🔍 Buscando produto...', 'info');
}

// ============================
// NOVO: REMOVER ITEM DO CARRINHO
// ============================
/**
 * Abre modal para confirmar remoção (total ou parcial)
 */
function showRemoveItemModal(item) {
    // Cria overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'removeModal';

    overlay.innerHTML = `
        <div class="modal-content">
            <h3>Remover Item</h3>
            <p><strong>${item.name}</strong></p>
            <p class="item-details">Quantidade no carrinho: ${item.quantity}x</p>
            
            <div class="removal-options">
                ${item.quantity > 1 ? `
                    <button class="btn-modal btn-partial" data-action="partial">
                        Remover Apenas 1
                    </button>
                ` : ''}
                
                <button class="btn-modal btn-all" data-action="all">
                    Remover ${item.quantity > 1 ? 'Todos' : 'Item'} (${item.quantity}x)
                </button>
            </div>
            
            <button class="btn-modal btn-cancel">Cancelar</button>
            
            <small class="modal-hint">
                ⚖️ Você precisará remover fisicamente o produto do carrinho
            </small>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.btn-cancel').onclick = () => {
        overlay.remove();
    };

    // 1. Botão de Remoção Total (sempre existe se o modal abrir)
    const btnAll = overlay.querySelector('.btn-all');
    if (btnAll) {
        btnAll.onclick = () => {
            removeItem(item.barcode, item.quantity);
            overlay.remove();
        };
    }

    // 2. Botão de Remoção Parcial (existe SOMENTE se item.quantity > 1)
    const btnPartial = overlay.querySelector('.btn-partial');
    if (btnPartial) {
        btnPartial.onclick = () => {
            removeItem(item.barcode, 1);
            overlay.remove();
        };
    }

        // Fecha ao clicar fora
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    }

/**
 * Envia comando de remoção para o servidor
 */
function removeItem(barcode, quantityToRemove) {
    if (!socket || !socket.connected) {
        showMessage('❌ Carrinho não conectado', 'error', true);
        return;
    }

    console.log(`🗑️ Removendo: ${barcode} (Quantidade: ${quantityToRemove})`);

    socket.emit('remove_item', {
        cartId: currentCartId,
        barcode: barcode,
        quantity: quantityToRemove
    });

    showPersistentMessage('🔍 Processando remoção...', 'info');
}

// ============================
// CHECKOUT
// ============================
async function handleCheckout() {
    if (!currentCartId || !currentCart?.items?.length) {
        showMessage('❌ Carrinho vazio', 'error', true);
        return;
    }

    DOM.btnCheckout.disabled = true;
    DOM.btnCheckout.textContent = "⏳ Gerando pagamento...";

    try {
        const token = await getUserToken();
        const userEmail = document.getElementById('userEmail')?.textContent || 'teste@autocart.com';

        const response = await fetch(`${CONFIG.API_URL}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                cartId: currentCartId,
                items: currentCart.items,
                payerEmail: userEmail,
                totalAmount: currentCart.totalValue
            })
        });

        if (!response.ok) throw new Error('Falha ao criar pagamento');

        const { link_pagamento } = await response.json();

        if (!link_pagamento) {
            throw new Error('Link de pagamento não recebido');
        }

        localStorage.setItem('savedCartId', currentCartId);
        localStorage.setItem('savedMarketId', getConnectionParams().marketId);

        console.log('💳 Redirecionando para pagamento...');
        window.location.href = link_pagamento;

    } catch (error) {
        console.error("❌ Erro no checkout:", error);
        showMessage(`Erro: ${error.message}`, 'error', true);

        DOM.btnCheckout.disabled = false;
        DOM.btnCheckout.textContent = `Finalizar - ${formatPrice(currentCart.totalValue)}`;
    }
}

// ============================
// RETORNO DO PAGAMENTO
// ============================
async function handlePaymentReturn(token) {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const paymentId = urlParams.get('payment_id');

    if (!status) return false;

    if (status === 'approved') {
        showFullscreenOverlay('✅', 'Pagamento Confirmado!', 'Finalizando pedido...');

        const savedCartId = localStorage.getItem('savedCartId');
        const savedMarketId = localStorage.getItem('savedMarketId');

        if (!savedCartId || !savedMarketId) {
            showMessage('❌ Dados da compra perdidos. Contate o suporte.', 'error', true);
            return true;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cartId: savedCartId,
                    marketId: savedMarketId,
                    paymentId: paymentId
                })
            });

            if (!response.ok) throw new Error('Falha ao confirmar');

            const { orderId } = await response.json();
            console.log('✅ Pedido finalizado:', orderId);

            localStorage.removeItem('savedCartId');
            localStorage.removeItem('savedMarketId');

            setTimeout(() => {
                window.location.href = `historico.html?orderId=${orderId}&new=true`;
            }, 1500);

        } catch (error) {
            console.error('❌ Erro ao confirmar:', error);
            showMessage('Erro ao finalizar. Contate o atendimento: ' + paymentId, 'error', true);
        }

        return true;
    }

    if (status === 'rejected' || status === 'cancelled') {
        showMessage('❌ Pagamento não concluído', 'error', true);

        setTimeout(() => {
            const cartId = localStorage.getItem('savedCartId');
            const marketId = localStorage.getItem('savedMarketId');
            window.location.href = `index.html?cartId=${cartId}&marketId=${marketId}`;
        }, 3000);

        return true;
    }

    return false;
}

// ============================
// QR CODE SCANNER
// ============================
function showQRCodeScanner() {
    const container = document.querySelector('.container');
    container.innerHTML = `
    <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    ">
        <button id="btnScannerLogout" style="
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid white;
            padding: 8px 15px;
            font-size: 0.9rem;
            border-radius: 5px;
            cursor: pointer;
        ">
            🚪 Sair
        </button>

        <div style="font-size: 6rem; margin-bottom: 30px;">📱</div>
        <h1 style="font-size: 2rem; margin-bottom: 15px;">
            Escaneie o QR Code do Carrinho
        </h1>

        <p style="font-size: 1.1rem; margin-bottom: 40px; opacity: 0.9;">
            Aponte a câmera para o QR Code na tela do carrinho
        </p>
        
        <button id="btnOpenCamera" style="
            background: white;
            color: #667eea;
            border: none;
            padding: 15px 40px;
            font-size: 1.1rem;
            border-radius: 30px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        ">
            📷 Abrir Câmera
        </button>

        <div style="
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        ">
            </div>
    </div>
`;

    document.getElementById('btnManualConnect')?.addEventListener('click', () => {
        const cartId = document.getElementById('manualCartId').value.trim();
        const marketId = document.getElementById('manualMarketId').value.trim();

        if (cartId && marketId) {
            window.location.href = `index.html?cartId=${cartId}&marketId=${marketId}`;
        } else {
            alert('Preencha ambos os campos!');
        }
    });

    document.getElementById('btnOpenCamera')?.addEventListener('click', () => {
        alert('Função de câmera em desenvolvimento. Use a entrada manual.');
    });

    // Adiciona listener para o botão de Sair
    document.getElementById('btnScannerLogout')?.addEventListener('click', async () => {
        // Assume que a função de logout existe em algum lugar global
        // Se a sua função de logout for 'signOutUser' (exemplo do Firebase):
        // signOutUser().then(() => window.location.href = 'login.html');
        
        // Simulação de clique no botão de logout da interface padrão:
        const logoutBtn = document.getElementById('menuLogout');
        if (logoutBtn) {
            logoutBtn.click();
        } else {
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
    });
}

// ============================
// PERSISTÊNCIA
// ============================
function saveCartState(cart) {
    sessionStorage.setItem('currentCart', JSON.stringify({
        data: cart,
        timestamp: Date.now()
    }));
}

function restoreCartState(cartId) {
    const saved = sessionStorage.getItem('currentCart');
    if (!saved) return;

    try {
        const { data, timestamp } = JSON.parse(saved);
        const age = Date.now() - timestamp;

        if (age < CONFIG.CACHE_EXPIRATION && data.cartId === cartId) {
            console.log('📦 Estado restaurado');
            currentCart = data;
            updateCartDisplay();
        } else {
            sessionStorage.removeItem('currentCart');
        }
    } catch (error) {
        console.error('Erro ao restaurar:', error);
        sessionStorage.removeItem('currentCart');
    }
}

// ============================
// DISPLAY
// ============================
function updateCartDisplay() {
    if (!currentCart?.items?.length) {
        DOM.emptyCart.style.display = 'block';
        DOM.cartItems.innerHTML = '';
        DOM.checkoutSection.style.display = 'none';
        DOM.totalValue.textContent = 'R$ 0,00';
        DOM.itemCount.textContent = '0';
        return;
    }

    const { items, totalValue } = currentCart;

    DOM.totalValue.textContent = formatPrice(totalValue);
    DOM.checkoutTotal.textContent = formatPrice(totalValue);
    DOM.itemCount.textContent = items.length;

    DOM.emptyCart.style.display = 'none';
    DOM.checkoutSection.style.display = 'block';
    DOM.btnCheckout.textContent = `Finalizar - ${formatPrice(totalValue)}`;

    renderCartItems(items);
}

function renderCartItems(items) {
    const grouped = items.reduce((acc, item) => {
        if (acc[item.barcode]) {
            acc[item.barcode].quantity++;
            acc[item.barcode].totalWeight += (item.weight || 0);
        } else {
            acc[item.barcode] = {
                ...item,
                quantity: 1,
                totalWeight: item.weight || 0
            };
        }
        return acc;
    }, {});

    let html = '';

    for (const barcode in grouped) {
        const item = grouped[barcode];
        const subtotal = item.price * item.quantity;

        html += `
            <div class="cart-item" data-barcode="${barcode}">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-code">
                        Código: ${item.barcode}
                        ${item.totalWeight > 0 ? ` | ${item.totalWeight.toFixed(0)}g` : ''}
                    </div>
                    <div class="item-price">
                        ${formatPrice(item.price)} × ${item.quantity} = 
                        <strong>${formatPrice(subtotal)}</strong>
                    </div>
                </div>
                
                <div class="item-controls">
                    <span class="qty-badge">${item.quantity}x</span>
                    <button class="btn-remove-item" data-barcode="${item.barcode}">
                        🗑️ Remover
                    </button>
                </div>
            </div>
        `;
    }

    DOM.cartItems.innerHTML = html;

    // Adiciona event listeners aos botões de remoção
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.onclick = () => {
            const barcode = btn.dataset.barcode;
            const item = grouped[barcode];
            showRemoveItemModal(item);
        };
    });
}

// ============================
// MENSAGENS
// ============================
/**
 * Mensagem persistente (não desaparece até ação do usuário)
 */
function showPersistentMessage(html, type = 'info') {
    if (!DOM.message) return;

    persistentMessageActive = true;
    DOM.message.innerHTML = html;
    DOM.message.className = `message ${type} persistent`;
}

/**
 * Mensagem temporária (desaparece automaticamente)
 */
function showMessage(html, type = 'info', autoHide = true) {
    if (!DOM.message) return;

    persistentMessageActive = false;
    DOM.message.innerHTML = html;
    DOM.message.className = `message ${type}`;

    if (autoHide) {
        setTimeout(clearMessage, CONFIG.MESSAGE_TIMEOUT);
    }
}

/**
 * Limpa mensagem persistente
 */
function clearPersistentMessage() {
    persistentMessageActive = false;
    clearMessage();
}

/**
 * Limpa qualquer mensagem
 */
function clearMessage() {
    if (DOM.message && !persistentMessageActive) {
        DOM.message.textContent = '';
        DOM.message.className = 'message';
    }
}

/**
 * Overlay fullscreen
 */
function showFullscreenOverlay(icon, title, subtitle) {
    document.getElementById('paymentOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'paymentOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="font-size: 5rem; margin-bottom: 30px; animation: bounce 1s infinite;">
            ${icon}
        </div>
        <h2 style="font-size: 2rem; margin-bottom: 15px; font-weight: 600;">
            ${title}
        </h2>
        <p style="font-size: 1.1rem; opacity: 0.9;">
            ${subtitle}
        </p>
        <div style="margin-top: 30px;">
            <div class="spinner"></div>
        </div>
    `;

    document.body.appendChild(overlay);
}

// ============================
// UTILITÁRIOS
// ============================
function getConnectionParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        cartId: urlParams.get('cartId'),
        marketId: urlParams.get('marketId')
    };
}

function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price || 0);
}

function playErrorSound() {
    // TODO: Implementar com Web Audio API
    // const audio = new Audio('/sounds/error.mp3');
    // audio.play();
}

function handleKeyPress(e) {
    if ((e.keyCode || e.which) === 13) {
        addProductByBarcode(DOM.barcodeInput.value);
    }
}

// ============================
// EVENT LISTENERS
// ============================
DOM.btnAdd.onclick = () => addProductByBarcode(DOM.barcodeInput.value);
DOM.barcodeInput.onkeypress = handleKeyPress;
DOM.btnCheckout.onclick = handleCheckout;

// Expõe função globalmente para uso nos botões dinâmicos
window.showRemoveItemModal = showRemoveItemModal;

// Cleanup
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
        console.log('🔌 Socket desconectado');
    }
});