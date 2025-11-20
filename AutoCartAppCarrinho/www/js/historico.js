/*
|--------------------------------------------------------------------------
| JS do Histórico de Compras (historico.js)
|--------------------------------------------------------------------------
*/

import { db, auth } from './firebase-config.js';
import { onAuthReady, getUserToken } from './authchek.js';
//Firestore tools
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Elementos DOM ---
const btnBack = document.getElementById('btnBack');
const filterPeriod = document.getElementById('filterPeriod');
const filterMarket = document.getElementById('filterMarket');
const totalPurchases = document.getElementById('totalPurchases');
const totalSpent = document.getElementById('totalSpent');
const emptyState = document.getElementById('emptyState');
const purchasesList = document.getElementById('purchasesList');

// --- Variáveis Globais ---
let allPurchasesData = []; 

// ============================
// Funções de formatação (Mantidas iguais)
// ============================
function formatDate(dateInput) {
    // O input pode vir como Date Object ou String, garantimos que seja Date
    const date = new Date(dateInput);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Hoje às ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
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
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================
// Filtrar compras (Mantido igual)
// ============================
function filterPurchases() {
    const period = filterPeriod.value;
    const market = filterMarket.value;
    const today = new Date();
    
    let filtered = allPurchasesData.filter(purchase => {
        const purchaseDate = new Date(purchase.paidTimestamp);
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
        
        // Filtro de mercado
        if (market !== 'all') {
            passesMarketFilter = purchase.marketId === market;
        }
        
        return passesDateFilter && passesMarketFilter;
    });
    
    return filtered;
}

// ============================
// Renderizar compras (Mantido igual)
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
    
    const marketNames = {
        'market_A': 'Mercado A',
        'market_B': 'Mercado B',
        'market_default': 'Supermercado Central'
    };
    
    let html = '';
    filtered.forEach(purchase => {
        const marketName = marketNames[purchase.marketId] || purchase.marketId;
        
        html += `
            <div class="purchase-card" onclick="viewPurchaseDetails('${purchase.id}')">
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
// Função para abrir o Comprovante (js/historico.js)
// ============================

window.viewPurchaseDetails = function(id) {
    const purchase = allPurchasesData.find(p => p.id === id);
    if (!purchase) return;

    // Preenche os dados do Modal
    document.getElementById('modalDate').textContent = formatDate(purchase.paidTimestamp);
    document.getElementById('modalTotal').textContent = formatPrice(purchase.totalValue);
    document.getElementById('modalId').textContent = purchase.paymentId || purchase.id; // Mostra ID do MP ou do Firebase

    // Gera lista de itens
    const itemsContainer = document.getElementById('modalItems');
    itemsContainer.innerHTML = purchase.items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #4a5568;">
            <span>${item.quantity || 1}x ${item.name}</span>
            <span style="font-weight: 600;">${formatPrice(item.price)}</span>
        </div>
    `).join('');

    // Mostra o modal (usando flex para centralizar)
    const modal = document.getElementById('receiptModal');
    modal.style.display = 'flex';
};

// Função para fechar (Global)
window.closeReceipt = function() {
    document.getElementById('receiptModal').style.display = 'none';
}

// ============================
// Carregar do Firebase (ATUALIZADO)
// ============================
async function loadPurchasesFromFirebase() {
    try {
        const user = auth.currentUser;
        if (!user) {
            // Se carregar a página direto sem auth estar pronto, espera um pouco ou redireciona
            return; 
        }

        // 1. Monta a Query para a coleção 'purchase_history'
        const q = query(
            collection(db, "purchase_history"),
            where("userId", "==", user.uid),
            orderBy("purchasedAt", "desc") 
        );

        const querySnapshot = await getDocs(q);

        // 2. Mapeia os dados do Firestore para o formato que seu Front usa
        allPurchasesData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                marketId: data.marketId,
                items: data.items || [],
                totalValue: Number(data.totalValue),
                // O Firestore devolve Timestamp, convertemos para JS Date
                // Se o campo paidTimestamp não existir, usa data atual como fallback
                paidTimestamp: data.purchasedAt ? data.purchasedAt.toDate() : new Date()
            };
        });

        // Atualiza os filtros e renderiza
        updateMarketFilterOptions();
        renderPurchases();

    } catch (error) {
        console.error('Erro ao carregar compras:', error);
        
        // DICA DE DEBUG: Se der erro de indice, avisa no console
        if (error.message.includes("index")) {
            console.warn("⚠️ ATENÇÃO: Verifique o console do navegador. O Firebase exige um índice composto. Clique no link gerado no erro para criar.");
        }

        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = "Erro ao carregar histórico.";
    }
}

// Atualiza o <select> de mercados
function updateMarketFilterOptions() {
    const markets = new Set(allPurchasesData.map(p => p.marketId));
    const marketNames = {
        'market_A': 'Mercado A',
        'market_B': 'Mercado B',
        'market_default': 'Supermercado Central'
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
// Event Listeners e Init
// ============================
btnBack.addEventListener('click', () => {
    window.location.href = 'carrinho.html';
});
filterPeriod.addEventListener('change', renderPurchases);
filterMarket.addEventListener('change', renderPurchases);

document.addEventListener('DOMContentLoaded', async () => {
    await onAuthReady(); 
    loadPurchasesFromFirebase(); // Nova função
});