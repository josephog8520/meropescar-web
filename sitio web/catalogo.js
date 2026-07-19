// catalogo.js
let listaProductosOriginal = [];
let filtroActual = 'todos';
let busquedaActual = '';
let pedidoActual = {}; // Objeto para guardar el carrito: { id: {id, nombre, cantidad, precio} }

// --- 1. LÓGICA DEL CARRITO LATERAL (NUEVO) ---
window.abrirResumenSimulado = () => {
    document.getElementById('panel-carrito').classList.add('activo');
    document.getElementById('overlay-carrito').style.display = 'block';
    renderizarCarrito();
};

window.cerrarCarrito = () => {
    document.getElementById('panel-carrito').classList.remove('activo');
    document.getElementById('overlay-carrito').style.display = 'none';
};

function renderizarCarrito() {
    const contenedor = document.getElementById('lista-carrito');
    const items = Object.values(pedidoActual);
    
    contenedor.innerHTML = items.map(i => `
        <div class="item-carrito">
            <div class="item-img-sm">🐟</div>
            <div class="item-info">
                <strong>${i.nombre}</strong>
                <span>$${i.precio.toFixed(2)} x 
                    <input type="number" value="${i.cantidad}" class="input-qty-carrito" onchange="actualizarCantidad('${i.id}', this.value)">
                lbs</span>
            </div>
            <div class="txt-right">
                <strong>$${(i.cantidad * i.precio).toFixed(2)}</strong>
                <button onclick="eliminarDelCarrito('${i.id}')" class="btn-remove">✕</button>
            </div>
        </div>
    `).join('');
    
    const total = items.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
    document.getElementById('total-carrito').innerText = `$${total.toFixed(2)}`;
}

window.actualizarCantidad = (id, nuevaCant) => {
    if (pedidoActual[id]) {
        pedidoActual[id].cantidad = parseFloat(nuevaCant);
        if (pedidoActual[id].cantidad <= 0) delete pedidoActual[id];
        renderizarCarrito();
    }
};

window.eliminarDelCarrito = (id) => {
    delete pedidoActual[id];
    renderizarCarrito();
};

// --- 2. PROCESO DE COMPRA (CORREGIDO) ---
window.confirmarPedidoFinal = async function() {
    let items = Object.values(pedidoActual);
    if (items.length === 0) return alert("Tu lista de reserva está vacía.");
    
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    if (!sesion || sesion.rol !== 'cliente') {
        localStorage.setItem('carrito_suspendido', JSON.stringify(pedidoActual));
        window.location.href = 'cuenta.html';
        return;
    }

    let total = items.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
    
    if (confirm(`Confirmar pedido por $${total.toFixed(2)}`)) {
        const pedidoData = {
            cliente: sesion.iden || "Cliente",
            total: total.toFixed(2),
            estado: "Por Despachar",
            fecha: new Date().toISOString(),
            detalles: items
        };

        try {
            await window.MeroPescarDB.crearPedido(pedidoData);
            pedidoActual = {};
            cerrarCarrito();
            window.location.href = 'pedido-exito.html';
        } catch (e) {
            alert("Error: " + e.message);
        }
    }
};

// --- 3. RENDERIZADO Y FILTROS ---
function renderizarProductos(lista) {
    const grid = document.getElementById('grid-catalogo');
    if (!grid) return;
    grid.innerHTML = '';

    lista.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'card-catalog';
        card.innerHTML = `
            <div class="card-img-placeholder"><span>🐟</span></div>
            <div class="card-content-catalog">
                <span class="tag-tipo">${prod.tipo}</span>
                <h3>${prod.nombre}</h3>
                <p class="catalog-price">$${parseFloat(prod.precio).toFixed(2)} <span>/lb</span></p>
            </div>
            <div class="action-box-catalog">
                <input type="number" id="input-${prod.id}" value="1" min="1" max="${prod.stock}" class="input-qty-catalog">
                <button onclick="agregarAlPedido('${prod.id}', '${prod.nombre}', ${prod.precio})" class="btn-add">Añadir</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Modificamos agregarAlPedido para que también guarde el nombre
window.agregarAlPedido = (id, nombre, precio) => {
    const cant = parseFloat(document.getElementById(`input-${id}`).value);
    pedidoActual[id] = { id, nombre, cantidad: cant, precio };
    renderizarCarrito();
    abrirResumenSimulado(); // Abrir al añadir
};

function filtrarYRenderizar() {
    let listaFiltrada = listaProductosOriginal.filter(p => {
        const coincideCategoria = (filtroActual === 'todos' || p.tipo === filtroActual);
        const coincideBusqueda = p.nombre.toLowerCase().includes(busquedaActual.toLowerCase());
        return coincideCategoria && coincideBusqueda;
    });
    renderizarProductos(listaFiltrada);
}

// Filtros Globales
window.filtrarCategoria = (cat, btn) => {
    filtroActual = cat;
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtrarYRenderizar();
};

window.filtrarPorTexto = (texto) => {
    busquedaActual = texto;
    filtrarYRenderizar();
};

// --- 4. ARRANQUE ---
window.onload = function() {
    // 1. Cargar productos desde Firebase
    window.MeroPescarDB.suscribirseAProductos((productos) => {
        listaProductosOriginal = productos;
        localStorage.setItem('productos', JSON.stringify(productos));
            const busquedaPendiente = localStorage.getItem('busqueda_pendiente');
            if (busquedaPendiente) {
                busquedaActual = busquedaPendiente;
                localStorage.removeItem('busqueda_pendiente'); // Limpiamos para que no se repita
            }
        filtrarYRenderizar();
    });

    // 2. CORRECCIÓN: Actualizar el contador si ya hay productos en pedidoActual
    const badge = document.getElementById('badge-contador');
    if (badge) {
        // Calculamos la suma total de libras
        let totalLbs = Object.values(pedidoActual).reduce((sum, i) => sum + i.cantidad, 0);
        badge.innerText = totalLbs;
    }

    // 3. Lógica de Sesión (Botón Salir/Login)
    const btnSesion = document.getElementById('btn-sesion-accion');
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    
    if (btnSesion) {
        if (sesion && sesion.rol === 'cliente') {
            btnSesion.innerHTML = '<span class="action-icon">🚪</span><span class="action-text">Salir</span>';
            btnSesion.onclick = () => { 
                localStorage.removeItem('sesion_activa'); 
                window.location.reload(); // Recargamos para limpiar todo
            };
        } else {
            btnSesion.innerHTML = '<span class="action-icon">👤</span><span class="action-text">Iniciar Sesión</span>';
            btnSesion.onclick = () => { window.location.href = 'cuenta.html'; };
        }
    }
};