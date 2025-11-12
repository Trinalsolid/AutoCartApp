// Estado do carrinho
var cart = [];
var productsDatabase = {}; // Será preenchido a partir do localStorage

// Elementos DOM
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

// Carregar base de produtos do localStorage ou criar uma nova
async function loadProductsFromBackend() {
  productsDatabase = {}; // limpa
  try {
    const res = await fetch('http://localhost:3333/produtos'); // rota pública do backend
    if (!res.ok) {
      throw new Error('Erro ao buscar produtos do servidor: ' + res.status);
    }
    const produtos = await res.json();
    for (var i = 0; i < produtos.length; i++) {
      var product = produtos[i];
      // mapeie propriedades conforme seu backend (nome: name ou nome)
      productsDatabase[product.barcode || product.codigo_barras || product.id] = {
        barcode: product.barcode || product.codigo_barras || (product.id + ''),
        name: product.name || product.nome || product.title || 'Produto',
        price: parseFloat(product.price || product.preco || 0),
        weight: parseFloat(product.weight || product.peso || 0),
        category: product.category || product.categoria || '',
        image: product.image || product.imagem || ''
      };
    }
    console.log('Base de produtos carregada do backend:', Object.keys(productsDatabase).length, 'itens.');
  } catch (err) {
    console.error(err);
    // fallback: mantemos a lista offline (opcional)
    showMessage('Não foi possível carregar produtos do servidor. Usando catálogo local (apenas se disponível).', 'error');
    // não salva nada no localStorage; se quiser fallback, podemos injetar produtos default aqui
  }
}


// Adicionar produto por codigo de barras
function addProductByBarcode(code) {
    if (!code.trim()) return;

    var product = productsDatabase[code];

    if (!product) {
        showMessage('Produto nao encontrado', 'error');
        return;
    }

    addToCart(product);
    showMessage('Produto ' + product.name + ' adicionado!', 'success');
    barcodeInput.value = '';

    setTimeout(function() {
        showMessage('', '');
    }, 2000);
}

// Adicionar ao carrinho
function addToCart(product) {
    var existingItem = null;
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].barcode === product.barcode) {
            existingItem = cart[i];
            break;
        }
    }

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            barcode: product.barcode,
            name: product.name,
            price: product.price,
            weight: product.weight,
            quantity: 1
        });
    }

    updateCartDisplay();
}

// Atualizar quantidade
function updateQuantity(barcode, change) {
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].barcode === barcode) {
            cart[i].quantity = Math.max(0, cart[i].quantity + change);
            if (cart[i].quantity === 0) {
                removeItem(barcode);
                return;
            }
            break;
        }
    }
    updateCartDisplay();
}

// Remover item
function removeItem(barcode) {
    var newCart = [];
    for (var i = 0; i < cart.length; i++) {
        if (cart[i].barcode !== barcode) {
            newCart.push(cart[i]);
        }
    }
    cart = newCart;
    updateCartDisplay();
}

// Atualizar exibicao do carrinho
function updateCartDisplay() {
    var total = 0;
    var totalItems = 0;

    for (var i = 0; i < cart.length; i++) {
        total += cart[i].price * cart[i].quantity;
        totalItems += cart[i].quantity;
    }

    totalValue.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
    checkoutTotal.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
    itemCount.textContent = totalItems;

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartItems.innerHTML = '';
        checkoutSection.style.display = 'none';
    } else {
        emptyCart.style.display = 'none';
        checkoutSection.style.display = 'block';
        renderCartItems();
    }
}

// Renderizar itens do carrinho
function renderCartItems() {
    var html = '';
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var subtotal = item.price * item.quantity;
        html += '<div class="cart-item">';
        html += '<div class="item-info">';
        html += '<div class="item-name">' + item.name + '</div>';
        html += '<div class="item-code">Codigo: ' + item.barcode + '</div>';
        html += '<div class="item-price">';
        html += 'R$ ' + item.price.toFixed(2).replace('.', ',') + ' x ' + item.quantity + ' = ';
        html += 'R$ ' + subtotal.toFixed(2).replace('.', ',');
        html += '</div></div>';
        html += '<div class="item-controls">';
        html += '<button class="qty-btn" onclick="updateQuantity(\'' + item.barcode + '\', -1)">-</button>';
        html += '<div class="qty-display">' + item.quantity + '</div>';
        html += '<button class="qty-btn" onclick="updateQuantity(\'' + item.barcode + '\', 1)">+</button>';
        html += '<button class="btn-remove" onclick="removeItem(\'' + item.barcode + '\')">X</button>';
        html += '</div></div>';
    }
    cartItems.innerHTML = html;
}

// Mostrar mensagem
function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message';
    if (type) {
        message.classList.add(type);
    }
}

// Handler para tecla Enter
function handleKeyPress(e) {
    var keycode = e.keyCode || e.which;
    if (keycode === 13) {
        addProductByBarcode(barcodeInput.value);
    }
}

// Handler para botao adicionar
function handleAddClick() {
    addProductByBarcode(barcodeInput.value);
}

// Handler para checkout
function handleCheckout() {
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        total += cart[i].price * cart[i].quantity;
    }
    alert('Finalizando compra de R$ ' + total.toFixed(2));
}

// Event listeners
btnAdd.onclick = handleAddClick;
barcodeInput.onkeypress = handleKeyPress;
btnCheckout.onclick = handleCheckout;

// Inicializar a aplicação
// Alterar inicialização no final do arquivo:
loadProductsFromBackend().then(() => {
  barcodeInput.focus();
});