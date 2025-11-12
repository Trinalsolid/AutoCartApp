// ============================
// JS do Histórico de Compras
// ============================

// Elementos DOM
const btnBack = document.getElementById('btnBack');
const filterPeriod = document.getElementById('filterPeriod');
const filterMarket = document.getElementById('filterMarket');
const totalPurchases = document.getElementById('totalPurchases');
const totalSpent = document.getElementById('totalSpent');
const emptyState = document.getElementById('emptyState');
const purchasesList = document.getElementById('purchasesList');

// Dados simulados (em produção virá do backend)
let purchasesData = [
    {
        id: '001',
        market: 'Mercado A',
        date: '2024-11-10',
        items: 15,
        total: 127.50
    },
    {
        id: '002',
        market: 'Mercado B',
        date: '2024-11-08',
        items: 8,
        total: 89.90
    },
    {
        id: '003',
        market: 'Mercado A',
        date: '2024-11-05',
        items: 22,
        total: 215.30
    },
    {
        id: '004',
        market: 'Mercado C',
        date: '2024-11-02',
        items: 12,
        total: 156.80
    },
    {
        id: '005',
        market: 'Mercado A',
        date: '2024-10-28',
        items: 18,
        total: 198.45
    }
];

// ============================
// Funções de formatação
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
// Filtrar compras
// ============================

function filterPurchases() {
    const period = filterPeriod.value;
    const market = filterMarket.value;
    const today = new Date();
    
    let filtered = purchasesData.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
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
            passesMarketFilter = purchase.market === market;
        }
        
        return passesDateFilter && passesMarketFilter;
    });
    
    return filtered;
}

// ============================
// Renderizar compras
// ============================

function renderPurchases() {
    const filtered = filterPurchases();
    
    // Atualizar resumo
    const total = filtered.reduce((sum, p) => sum + p.total, 0);
    totalPurchases.textContent = filtered.length;
    totalSpent.textContent = formatPrice(total);
    
    // Verificar se está vazio
    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        purchasesList.innerHTML = '';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Renderizar lista
    let html = '';
    filtered.forEach(purchase => {
        html += `
            <div class="purchase-card" onclick="viewPurchaseDetails('${purchase.id}')">
                <div class="purchase-header">
                    <span class="purchase-market">${purchase.market}</span>
                    <span class="purchase-date">${formatDate(purchase.date)}</span>
                </div>
                <div class="purchase-details">
                    <span class="purchase-items">${purchase.items} itens</span>
                    <span class="purchase-total">${formatPrice(purchase.total)}</span>
                </div>
            </div>
        `;
    });
    
    purchasesList.innerHTML = html;
}

// ============================
// Ver detalhes da compra
// ============================

function viewPurchaseDetails(purchaseId) {
    alert(`Detalhes da compra #${purchaseId} - Em desenvolvimento`);
    // Aqui você pode abrir um modal ou redirecionar para página de detalhes
}

// ============================
// Carregar do backend
// ============================

async function loadPurchasesFromBackend() {
    try {
        // const response = await fetch('http://localhost:3333/purchases', {
        //     headers: {
        //         'Authorization': 'Bearer ' + localStorage.getItem('token')
        //     }
        // });
        // const data = await response.json();
        // purchasesData = data;
        
        // Por enquanto usando dados mockados
        renderPurchases();
    } catch (error) {
        console.error('Erro ao carregar compras:', error);
    }
}

// ============================
// Event Listeners
// ============================

btnBack.addEventListener('click', () => {
    window.location.href = 'index.html';
});

filterPeriod.addEventListener('change', renderPurchases);
filterMarket.addEventListener('change', renderPurchases);

// ============================
// Inicialização
// ============================

document.addEventListener('DOMContentLoaded', () => {
    loadPurchasesFromBackend();
});