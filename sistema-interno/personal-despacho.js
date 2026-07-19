// personal-despacho.js - Controlador Profesional

let modoEdicion = null; 

window.onload = () => {
    const sesion = JSON.parse(localStorage.getItem('sesion_admin_activa'));
    if (!sesion || !sesion.login) window.location.href = 'admin-login.html';
    else {
        document.getElementById('operador-nombre').innerText = `👤 Turno: ${sesion.nombre}`;
        mostrarSeccion('inventario');
    }
};

window.mostrarSeccion = (seccion) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${seccion}`).classList.add('active');

    const contenedor = document.getElementById('seccion-activa');
    contenedor.innerHTML = ''; 

    if (seccion === 'inventario') renderizarInventario(contenedor);
    else if (seccion === 'reservas') renderizarSolicitudes(contenedor); // <--- ESTO DEBE ESTAR
    else if (seccion === 'despachados') renderizarEntregados(contenedor);
};

// --- MÓDULO: INVENTARIO (Solo visualización) ---
function renderizarInventario(contenedor) {
    contenedor.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2>Inventario de Especies</h2>
            <!-- Este botón abrirá el modal vacío para CREAR -->
            <button onclick="abrirModal()" class="btn-agregar-producto">+ Agregar Producto</button>
        </div>
        <table class="admin-table-view">
            <thead><tr><th>Producto</th><th>Tipo</th><th>Precio</th><th>Stock (lbs)</th><th>Acciones</th></tr></thead>
            <tbody id="inventario-tbody"></tbody>
        </table>
    `;
    
    window.MeroPescarDB.suscribirseAProductos(productos => {
        const tbody = document.getElementById('inventario-tbody');
        tbody.innerHTML = productos.map(p => `
            <tr id="fila-${p.id}">
                <td>${p.nombre}</td>
                <td>${p.tipo}</td>
                <td>$${p.precio}</td>
                <td>${p.stock} lbs</td>
                <td>
                    <!-- Este botón abre el modal con los DATOS del producto para EDITAR -->
                    <button onclick="abrirModal('${p.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})">✏️</button>
                    <button onclick="eliminarProducto('${p.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    });
}

// --- MÓDULO: SOLICITUDES (RENDERING) ---
window.renderizarSolicitudes = (contenedor) => {
    contenedor.innerHTML = `
        <h2>Solicitudes Pendientes</h2>
        <table class="admin-table-view">
            <thead><tr><th>ID Pedido</th><th>Cliente</th><th>Total</th><th>Acción</th></tr></thead>
            <tbody id="pedidos-tbody"></tbody>
        </table>
    `;

    window.MeroPescarDB.suscribirseAPedidos(pedidos => {
        const tbody = document.getElementById('pedidos-tbody');
        const pendientes = pedidos.filter(p => p.estado === "Por Entregar");

        tbody.innerHTML = pendientes.map(p => `
            <tr onclick="toggleDetalle('${p.id}')" style="cursor:pointer;">
                <td>${p.id.substring(0, 8)}...</td>
                <td>${p.cliente}</td>
                <td>$${p.total}</td>
                <td>
                    <button onclick="event.stopPropagation(); confirmarEntrega('${p.id}')" class="btn-admin-save">✅ Entregado</button>
                </td>
            </tr>
            <tr id="detalle-${p.id}" style="display:none; background:#f8fafc;">
                <td colspan="4" style="padding:15px;">
                    <strong style="color:var(--azul-institucional);">Detalle del despacho:</strong>
                    <table class="detalle-pedido-table">
                        <tr>
                            <th>PRODUCTO</th>
                            <th>CANTIDAD (Lbs)</th>
                        </tr>
                        ${(p.detalles || []).map(d => `
                            <tr>
                                <td>${d.nombre || 'Producto'}</td>
                                <td style="font-weight: 700; color: var(--azul-frescura);">${d.cantidad} lbs</td>
                            </tr>
                        `).join('')}
                    </table>
                </td>
            </tr>
        `).join('');
    });
};

// --- MÓDULO: DESPACHADOS (HISTORIAL) ---
window.renderizarEntregados = (contenedor) => {
    contenedor.innerHTML = `
        <h2>Historial de Entregas</h2>
        <table class="admin-table-view">
            <thead><tr><th>ID Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody id="despachados-tbody"></tbody>
        </table>
    `;

    window.MeroPescarDB.suscribirseAPedidos(pedidos => {
        const tbody = document.getElementById('despachados-tbody');
        const entregados = pedidos.filter(p => p.estado === "Entregado");

        tbody.innerHTML = entregados.map(p => `
            <tr onclick="toggleDetalle('${p.id}')" style="cursor:pointer;">
                <td>${p.id.substring(0, 8)}...</td>
                <td>${p.cliente}</td>
                <td>$${p.total}</td>
                <td><span style="color:var(--acento-compras); font-weight:bold;">✔ Entregado</span></td>
            </tr>
            <!-- Fila oculta de detalle (igual a la de solicitudes) -->
            <tr id="detalle-${p.id}" style="display:none; background:#f8fafc;">
                <td colspan="4" style="padding:15px;">
                    <strong style="color:var(--azul-institucional);">Detalle del pedido entregado:</strong>
                    <table class="detalle-pedido-table">
                        <tr>
                            <th>PRODUCTO</th>
                            <th>CANTIDAD (Lbs)</th>
                        </tr>
                        ${(p.detalles || []).map(d => `
                            <tr>
                                <td>${d.nombre || 'Producto'}</td>
                                <td style="font-weight: 700; color: var(--azul-frescura);">${d.cantidad} lbs</td>
                            </tr>
                        `).join('')}
                    </table>
                </td>
            </tr>
        `).join('');
    });
};

// Función para mostrar/ocultar detalles
window.toggleDetalle = (id) => {
    const fila = document.getElementById(`detalle-${id}`);
    fila.style.display = fila.style.display === 'none' ? 'table-row' : 'none';
};

// Función para marcar como entregado
window.confirmarEntrega = async (id) => {
    if(confirm("¿Marcar este pedido como entregado?")) {
        await window.MeroPescarDB.actualizarPedido(id, { estado: "Entregado" });
    }
};

// --- GESTIÓN DEL MODAL (Crear y Editar) ---
window.abrirModal = function(id = null, datos = null) {
    const modal = document.getElementById('modal-producto');
    modoEdicion = id;
    
    // Rellenar o limpiar campos
    document.getElementById('prod-nombre').value = datos ? datos.nombre : '';
    document.getElementById('prod-especie').value = datos ? (datos.especie || '') : '';
    document.getElementById('prod-tipo').value = datos ? datos.tipo : 'Entero';
    document.getElementById('prod-precio').value = datos ? datos.precio : '';
    document.getElementById('prod-stock').value = datos ? datos.stock : '';
    document.getElementById('prod-foto').value = datos ? (datos.foto || '') : '';
    
    modal.style.display = 'block';
};

window.guardarProducto = async function() {
    const datos = {
        nombre: document.getElementById('prod-nombre').value,
        especie: document.getElementById('prod-especie').value || "N/A", // Capturamos la especie
        tipo: document.getElementById('prod-tipo').value,
        precio: parseFloat(document.getElementById('prod-precio').value),
        stock: parseFloat(document.getElementById('prod-stock').value),
        foto: document.getElementById('prod-foto').value
    };

    if (modoEdicion) {
        await window.MeroPescarDB.actualizarProducto(modoEdicion, datos);
        alert("Producto actualizado");
    } else {
        await window.MeroPescarDB.crearProducto(datos);
        alert("Producto guardado");
    }
    document.getElementById('modal-producto').style.display = 'none';
    modoEdicion = null;
};

window.eliminarProducto = async (id) => {
    if(confirm("¿Eliminar producto?")) await window.MeroPescarDB.eliminarProducto(id);
};

// --- MÓDULO: PEDIDOS (KPIs) ---
window.MeroPescarDB.suscribirseAPedidos(pedidos => {
    const kpiP = document.getElementById('kpi-pendientes');
    const kpiE = document.getElementById('kpi-entregados');
    if (kpiP) kpiP.innerText = pedidos.filter(p => p.estado === "Por Entregar").length;
    if (kpiE) kpiE.innerText = pedidos.filter(p => p.estado === "Entregado").length;
});

window.filtrarColaPorBusqueda = () => {
    const input = document.getElementById('input-buscador-muelle');
    const filtro = input.value.toLowerCase();
    const tabla = document.getElementById('pedidos-tbody');
    const filas = tabla.getElementsByTagName('tr');

    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        
        // Solo filtramos las filas de datos (las que tienen clase o son las principales)
        // Usamos [0] para la columna ID Pedido y [1] para la columna Cliente
        const celdas = fila.getElementsByTagName('td');
        
        if (celdas.length > 1) {
            // Buscamos solo en la columna ID Pedido (índice 0) o Cliente (índice 1)
            const idPedido = celdas[0].innerText.toLowerCase();
            const cliente = celdas[1].innerText.toLowerCase();
            
            if (idPedido.includes(filtro) || cliente.includes(filtro)) {
                fila.style.display = ""; // Mostrar
            } else {
                fila.style.display = "none"; // Ocultar
            }
        }
    }
};