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
    
    contenedor.innerHTML = items.map(i => {
        // Validamos si el ítem tiene foto registrada, de lo contrario usamos la imagen por defecto
        const imgItemSrc = (i.foto && i.foto.trim() !== "") ? i.foto : 'https://images.pexels.com/photos/32262736/pexels-photo-32262736.jpeg';

        return `
            <div class="item-carrito" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                <div class="item-img-sm" style="width: 45px; height: 45px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #e2e8f0;">
                    <img src="${imgItemSrc}" alt="${i.nombre}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://images.pexels.com/photos/32262736/pexels-photo-32262736.jpeg';">
                </div>
                <div class="item-info" style="flex-grow: 1;">
                    <strong style="font-size: 0.9rem; display: block; color: var(--texto-principal);">${i.nombre}</strong>
                    <span style="font-size: 0.8rem; color: var(--texto-secundario);">$${i.precio.toFixed(2)} x 
                        <input type="number" value="${i.cantidad}" class="input-qty-carrito" onchange="actualizarCantidad('${i.id}', this.value)" style="width: 45px; padding: 2px 4px;">
                    lbs</span>
                </div>
                <div class="txt-right" style="text-align: right;">
                    <strong style="display: block; font-size: 0.9rem; color: var(--azul-institucional);">$${(i.cantidad * i.precio).toFixed(2)}</strong>
                    <button onclick="eliminarDelCarrito('${i.id}')" class="btn-remove" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.9rem; margin-top: 4px;">✕</button>
                </div>
            </div>
        `;
    }).join('');
    
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
// --- 2. PROCESO DE COMPRA CON PASARELA FICTICIA Y ÉXITO CONECTADO ---
window.abrirPasarelaPago = () => {
    let items = Object.values(pedidoActual);
    if (items.length === 0) {
        alert("Tu lista de reserva está vacía.");
        return;
    }
    
    // Verificamos si el cliente ha iniciado sesión
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    if (!sesion || sesion.rol !== 'cliente') {
        localStorage.setItem('carrito_suspendido', JSON.stringify(pedidoActual));
        window.location.href = 'cuenta.html';
        return;
    }

    // Si hay sesión, abrimos el modal de la pasarela de pago ficticia
    document.getElementById('modal-pasarela-pago').style.display = 'flex';
};

window.cambiarMetodoPago = () => {
    const metodo = document.getElementById('pago-metodo').value;
    document.getElementById('contenedor-tarjeta').style.display = metodo === 'tarjeta' ? 'block' : 'none';
    document.getElementById('contenedor-transferencia').style.display = metodo === 'transferencia' ? 'block' : 'none';
};

window.ejecutarPagoFicticio = async function() {
    // 1. Ocultar pasarela
    document.getElementById('modal-pasarela-pago').style.display = 'none';

    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    let items = Object.values(pedidoActual);
    let total = items.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);

    const pedidoData = {
        cliente: (sesion.nombre || "Cliente") + " (" + (sesion.ident || "N/A") + ")",
        total: total.toFixed(2),
        estado: "Por Entregar",
        fecha: new Date().toISOString(),
        detalles: items
    };

    try {
        // 2. Guardar en Firebase
        const docRef = await window.MeroPescarDB.crearPedido(pedidoData);

        // 3. Guardar datos en un respaldo temporal para la pantalla de éxito
        const datosExito = {
            idPedido: docRef ? docRef.id : "MP-" + Math.floor(Math.random() * 100000),
            cliente: pedidoData.cliente,
            total: pedidoData.total,
            detalles: items,
            fecha: new Date().toLocaleString()
        };
        localStorage.setItem('ultimo_pedido_exito', JSON.stringify(datosExito));

        // 4. Limpiar carrito y cerrar panel
        pedidoActual = {};
        cerrarCarrito();

        // 5. Redirigir a la página de éxito conectada
        window.location.href = 'pedido-exito.html';

    } catch (e) {
        alert("Error al procesar el pago: " + e.message);
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
        
        // Validamos si el producto tiene una URL de imagen real guardada en la base de datos
        const imagenSrc = (prod.foto && prod.foto.trim() !== "") ? prod.foto : 'https://images.pexels.com/photos/32262736/pexels-photo-32262736.jpeg';

        card.innerHTML = `
            <div class="card-img-placeholder" style="overflow: hidden; padding: 0; display: flex; align-items: center; justify-content: center; height: 160px; background: #e2e8f0;">
                <img src="${imagenSrc}" alt="${prod.nombre}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://images.pexels.com/photos/32262736/pexels-photo-32262736.jpeg';">
            </div>
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
    
    // Buscamos el producto original en la lista para extraer su foto actual
    const productoEncontrado = listaProductosOriginal.find(p => p.id === id);
    const fotoUrl = productoEncontrado ? productoEncontrado.foto : '';

    // Guardamos la foto dentro del objeto del carrito
    pedidoActual[id] = { id, nombre, cantidad: cant, precio, foto: fotoUrl };
    
    renderizarCarrito();
    abrirResumenSimulado(); 
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
    
    // 3. Lógica de Sesión (Botón Dinámico Salir / Login)
    const btnSesion = document.getElementById('btn-sesion-accion');
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    
    if (btnSesion) {
        if (sesion && sesion.rol === 'cliente') {
            btnSesion.innerHTML = '<span class="action-icon">🚪</span><span class="action-text">Cerrar Sesión</span>';
            btnSesion.onclick = () => { 
                if (confirm("¿Deseas cerrar sesión en este dispositivo?")) {
                    localStorage.removeItem('sesion_activa'); 
                    window.location.reload(); 
                }
            };
        } else {
            // Si no ha iniciado sesión, este botón también puede servir de acceso rápido al login
            btnSesion.innerHTML = '<span class="action-icon">🔑</span><span class="action-text">Acceso</span>';
            btnSesion.onclick = () => { window.location.href = 'cuenta.html'; };
        }
    }
};