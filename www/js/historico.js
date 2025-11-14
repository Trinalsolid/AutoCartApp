/*
|--------------------------------------------------------------------------
| JS do Histórico de Compras (historico.js)
|--------------------------------------------------------------------------
|
| Busca o histórico real do endpoint /history do nosso backend.
|
*/

import { onAuthReady, getUserToken } from './firebase-auth.js';

// --- Elementos DOM (iguais aos seus) ---
const btnBack = document.getElementById('btnBack');
const filterPeriod = document.getElementById('filterPeriod');
const filterMarket = document.getElementById('filterMarket');
const totalPurchases = document.getElementById('totalPurchases');
const totalSpent = document.getElementById('totalSpent');
const emptyState = document.getElementById('emptyState');
const purchasesList = document.getElementById('purchasesList');

// --- Variáveis Globais ---
let allPurchasesData = []; // Armazena todas as compras do backend
const API_URL = "http://localhost:3000";

// ============================
// Funções de formatação (iguais)
// ============================
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    } else {
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
        });
    }
}
function formatPrice(price) {
    return price.toLocaleString('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    });
}

// ============================
// Filtrar compras (MODIFICADO)
// ============================
function filterPurchases() {
    const period = filterPeriod.value;
    const market = filterMarket.value; // ex: 'market_A'
    const today = new Date();
    
    let filtered = allPurchasesData.filter(purchase => {
        const purchaseDate = new Date(purchase.paidTimestamp); // Usamos o timestamp de pagamento
        let passesDateFilter = true;
        let passesMarketFilter = true;
        
        // Filtro de período
        if (period === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            passesDateFilter = purchaseDate >= weekAgo;
        } else if (period === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            passesDateFilter = purchaseDate >= monthAgo;
        } else if (period === '3months') {
            const threeMonthsAgo = new Date(today);
            threeMonthsAgo.setMonth(today.getMonth() - 3);
            passesDateFilter = purchaseDate >= threeMonthsAgo;
        } else if (period === 'year') {
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            passesDateFilter = purchaseDate >= yearAgo;
        }
        
        // Filtro de mercado (agora usa o marketId real)
        if (market !== 'all') {
            passesMarketFilter = purchase.marketId === market;
        }
        
        return passesDateFilter && passesMarketFilter;
    });
    
    return filtered;
}

// ============================
// Renderizar compras (MODIFICADO)
// ============================
function renderPurchases() {
    const filtered = filterPurchases();
    
    const total = filtered.reduce((sum, p) => sum + p.totalValue, 0);
    totalPurchases.textContent = filtered.length;
    totalSpent.textContent = formatPrice(total);
    
    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        purchasesList.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Mapeia os marketId para nomes amigáveis (você pode expandir isso)
    const marketNames = {
        'market_A': 'Mercado A',
        'market_B': 'Mercado B',
        'market_default': 'Mercado Padrão'
    };
    
    let html = '';
    filtered.forEach(purchase => {
        const marketName = marketNames[purchase.marketId] || purchase.marketId;
        html += `
            <div class="purchase-card" onclick="viewPurchaseDetails('${purchase.cartId}')">
                <div class="purchase-header">
                    <span class="purchase-market">${marketName}</span>
                    <span class="purchase-date">${formatDate(purchase.paidTimestamp)}</span>
                </div>
                <div class="purchase-details">
                    <span class="purchase-items">${purchase.items.length} itens</span>
                    <span class="purchase-total">${formatPrice(purchase.totalValue)}</span>
                </div>
            </div>
        `;
    });
    
    purchasesList.innerHTML = html;
}

// ============================
// Ver detalhes da compra
// ============================
function viewPurchaseDetails(cartId) {
    alert(`Detalhes da compra #${cartId} - Em desenvolvimento`);
    // Aqui você pode abrir um modal e mostrar a 'purchase.items'
}

// ============================
// Carregar do backend (MODIFICADO)
// ============================
async function loadPurchasesFromBackend() {
    try {
        const token = await getUserToken();
        if (!token) throw new Error("Usuário não autenticado");

        const response = await fetch(`${API_URL}/history`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error("Falha ao buscar histórico: " + response.statusText);
        }

        allPurchasesData = await response.json();
        
        // Atualiza as opções do filtro de mercado dinamicamente
        updateMarketFilterOptions();

        renderPurchases();

    } catch (error) {
        console.error('Erro ao carregar compras:', error);
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = "Erro ao carregar histórico";
    }
}

// Atualiza o <select> de mercados com base no histórico
function updateMarketFilterOptions() {
    const markets = new Set(allPurchasesData.map(p => p.marketId));
    const marketNames = {
        'market_A': 'Mercado A',
        'market_B': 'Mercado B',
        'market_default': 'Mercado Padrão'
    };

    // Limpa opções antigas (exceto "Todos")
    filterMarket.innerHTML = '<option value="all">Todos os mercados</option>';

    markets.forEach(marketId => {
        const option = document.createElement('option');
        option.value = marketId;
        option.textContent = marketNames[marketId] || marketId;
        filterMarket.appendChild(option);
    });
}


// ============================
// Event Listeners (iguais)
// ============================
btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
});
filterPeriod.addEventListener('change', renderPurchases);
filterMarket.addEventListener('change', renderPurchases);

// ============================
// Inicialização
// ============================
document.addEventListener('DOMContentLoaded', async () => {
    await onAuthReady(); // Espera saber se o usuário está logado
    loadPurchasesFromBackend();
});