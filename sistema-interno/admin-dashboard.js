// admin-dashboard.js - Controlador Avanzado de Inteligencia Operativa y UX Dinámica

let vistaActual = 'inventario'; 
let filtroCategoriaStock = 'Todos'; // Control de botones para el inventario
let filtroCategoriaIngresos = 'Todos'; // NUEVO: Control de botones para la vista de ingresos

/**
 * Middleware de seguridad y arranque
 */
window.onload = function() {
    const sesion = JSON.parse(localStorage.getItem('sesion_admin_activa'));
    if (!sesion || !sesion.login) { window.location.href = 'admin-login.html'; return; }
    document.getElementById('saludo-usuario').innerText = `Panel de Control: ${sesion.nombre}`;

    // Variables locales para mantener el estado actualizado en memoria
    let productosActuales = [];
    let pedidosActuales = [];

    // 1. Suscripción Productos
    window.MeroPescarDB.suscribirseAProductos((data) => {
    productosActuales = data;
    localStorage.setItem('productos', JSON.stringify(data)); // Actualiza el cache
    calcularMetricasKPIs(productosActuales, pedidosActuales);
    renderizarTablaSegunFiltro(productosActuales, pedidosActuales);
});

    window.MeroPescarDB.suscribirseAPedidos((data) => {
        pedidosActuales = data;
        localStorage.setItem('pedidos_sistema', JSON.stringify(data)); // Actualiza el cache
        calcularMetricasKPIs(productosActuales, pedidosActuales);
        renderizarTablaSegunFiltro(productosActuales, pedidosActuales);
    });

    setInterval(actualizarRelojYReporteAutomático, 1000);
};

/**
 * Operaciones aritméticas de agregación
 */
// Aceptamos los datos como argumentos, así no dependemos de localStorage
function calcularMetricasKPIs(productos, pedidos) {
    let lbsInventario = productos.reduce((sum, p) => sum + parseFloat(p.stock), 0);
    document.getElementById('kpi-total-inventario').innerText = `${lbsInventario.toFixed(2)} lbs`;

    let lbsReservadas = 0;
    let lbsDespachadas = 0;
    let dólaresRecaudados = 0;

    pedidos.forEach(pedido => {
        // Asegúrate de que p.detalles exista
        let cuentaLbsPedido = (pedido.detalles || []).reduce((sum, item) => sum + parseFloat(item.cantidad), 0);
        
        if (pedido.estado === "Por Entregar") {
            lbsReservadas += cuentaLbsPedido;
        } else if (pedido.estado === "Entregado") {
            lbsDespachadas += cuentaLbsPedido;
            dólaresRecaudados += parseFloat(pedido.total || 0);
        }
    });

    document.getElementById('kpi-total-reservado').innerText = `${lbsReservadas.toFixed(2)} lbs`;
    document.getElementById('kpi-total-entregado').innerText = `${lbsDespachadas.toFixed(2)} lbs`;
    document.getElementById('kpi-total-ingresos').innerText = `$${dólaresRecaudados.toFixed(2)}`;
}

function cambiarFiltroVista(nuevaVista) {
    vistaActual = nuevaVista;
    document.querySelectorAll('.kpi-card-button').forEach(card => card.classList.remove('active'));
    
    const mapeoCards = { 'inventario': 'kpi-card-1', 'reservado': 'kpi-card-2', 'entregado': 'kpi-card-3', 'ingresos': 'kpi-card-4' };
    document.getElementById(mapeoCards[nuevaVista]).classList.add('active');

    renderizarTablaSegunFiltro();
}

/**
 * Inyecta estructuras HTML avanzadas y lógica de UI según el KPI seleccionado
 */
function renderizarTablaSegunFiltro(productos = [], pedidos = []) {

    if (productos.length === 0) productos = JSON.parse(localStorage.getItem('productos')) || [];
    if (pedidos.length === 0) pedidos = JSON.parse(localStorage.getItem('pedidos_sistema')) || [];

    const contenedor = document.getElementById('contenedor-tabla-dinamica');
    
    if (!contenedor) return;
    contenedor.innerHTML = '';

    // ==========================================================================
    // VISTA #1: INVENTARIO DISPONIBLE (Con Filtros por Botón)
    // ==========================================================================
    if (vistaActual === 'inventario') {
        document.getElementById('titulo-tabla-dinamica').innerText = "Monitoreo Analítico de Especies";
        
        let critico = productos.reduce((min, p) => parseFloat(p.stock) < parseFloat(min.stock) ? p : min, productos[0]);
        document.getElementById('subtitulo-analitico').innerText = `⚠️ Crítico: ${critico ? critico.nombre : 'Ninguno'}`;
        document.getElementById('subtitulo-analitico').style.background = '#fee2e2';
        document.getElementById('subtitulo-analitico').style.color = '#dc2626';

        // Construcción de la botonera de filtrado rápido idéntica al catálogo
        let htmlBotones = `
            <div class="filter-container" style="margin-bottom: 20px; display:flex; gap:10px;">
                <button class="filter-btn ${filtroCategoriaStock === 'Todos' ? 'active' : ''}" onclick="filtrarStockPorCategoria('Todos')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">Todos</button>
                <button class="filter-btn ${filtroCategoriaStock === 'Entero' ? 'active' : ''}" onclick="filtrarStockPorCategoria('Entero')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🐟 Enteros</button>
                <button class="filter-btn ${filtroCategoriaStock === 'Filete' ? 'active' : ''}" onclick="filtrarStockPorCategoria('Filete')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🔪 Filetes</button>
                <button class="filter-btn ${filtroCategoriaStock === 'Marisco' ? 'active' : ''}" onclick="filtrarStockPorCategoria('Marisco')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🦐 Mariscos</button>
            </div>
        `;

        let productosFiltrados = productos.filter(p => filtroCategoriaStock === 'Todos' || p.tipo === filtroCategoriaStock);

        let htmlTabla = `<table class="admin-table-view"><thead><tr><th>Especie Marina</th><th>Categoría</th><th>Precio Actual</th><th>Lbs Disponibles</th><th>Nivel de Riesgo</th></tr></thead><tbody>`;
        productosFiltrados.forEach(p => {
            let badgeRiesgo = parseFloat(p.stock) < 60 ? '<span style="color:#dc2626; font-weight:700;">🔴 Reabastecer Urgente</span>' : '<span style="color:#16a34a; font-weight:700;">🟢 Estable</span>';
            htmlTabla += `<tr><td><strong>${p.nombre}</strong></td><td>${p.tipo}</td><td>$${p.precio.toFixed(2)}</td><td>${p.stock} lbs</td><td>${badgeRiesgo}</td></tr>`;
        });
        htmlTabla += `</tbody></table>`;
        
        contenedor.innerHTML = htmlBotones + htmlTabla;

    // ==========================================================================
    // VISTA #2 Y #3: RESERVADOS Y DESPACHADOS (Con Desplegables / Accordion)
    // ==========================================================================
    } else if (vistaActual === 'reservado' || vistaActual === 'entregado') {
        let estadoFiltro = vistaActual === 'reservado' ? "Por Entregar" : "Entregado";
        document.getElementById('titulo-tabla-dinamica').innerText = vistaActual === 'reservado' ? "Órdenes Pendientes de Confirmación" : "Historial de Entregas";
        
        let pedidosFiltrados = pedidos.filter(p => p.estado === estadoFiltro);
        document.getElementById('subtitulo-analitico').innerText = `Total órdenes: ${pedidosFiltrados.length}`;
        document.getElementById('subtitulo-analitico').style.background = '#e0f2fe';
        document.getElementById('subtitulo-analitico').style.color = '#0369a1';

        if (pedidosFiltrados.length === 0) {
            contenedor.innerHTML = `<p style="text-align:center; padding:20px; color:var(--texto-secundario);">No existen transacciones en este estado actualmente.</p>`;
            return;
        }

        // Si es reservado, la última columna muestra Estado. Si es despachado, no lleva columna operativa extra.
        let ultimaCabecera = vistaActual === 'reservado' ? '<th>Estado Operación</th>' : '';

        let html = `
            <p style="font-size:0.85rem; color:var(--texto-secundario); margin-bottom:10px;">💡 Clic sobre cualquier fila de orden para desplegar/ocultar las especies y libras reservadas.</p>
            <table class="admin-table-view">
                <thead>
                    <tr>
                        <th>ID Orden</th>
                        <th>Cliente (RUC)</th>
                        <th>Fecha Registro</th>
                        <th>Total Reserva</th>
                        ${ultimaCabecera}
                    </tr>
                </thead>
                <tbody>`;
        
        pedidosFiltrados.forEach(p => {
            let celdaEstado = vistaActual === 'reservado' ? `<td><span style="color:#0284c7; background:#e0f2fe; padding:4px 8px; border-radius:4px; font-weight:700; font-size:0.85rem;">⏳ Por Entregar</span></td>` : '';
            
            // Fila principal ejecutable con evento clic
            html += `
                <tr onclick="conmutarDesplegableOrden('${p.id_pedido}')" style="cursor:pointer; background:#fff;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                    <td><code>📌 ${p.id_pedido}</code></td>
                    <td>${p.cliente}</td>
                    <td>${p.fecha}</td>
                    <td><strong>$${p.total}</strong></td>
                    ${celdaEstado}
                </tr>
                <!-- FILA DESPLEGABLE (OCULTA POR DEFECTO) -->
                <tr id="details-${p.id_pedido}" style="display:none; background:#f8fafc;">
                    <td colspan="5" style="padding:15px;">
                        <strong style="color:var(--azul-institucional);">🛒 Desglose de Mercancía:</strong>
                        <table class="detalle-pedido-table">
                            <tr><th>PRODUCTO</th><th>CANTIDAD (Lbs)</th></tr>
                            ${p.detalles.map(d => `
                                <tr>
                                    <td>${d.nombre}</td>
                                    <td style="font-weight:700; color:var(--azul-frescura);">${d.cantidad} lbs</td>
                                </tr>
                            `).join('')}
                        </table>
                    </td>
                </tr>`;
            
            p.detalles.forEach(d => {
                html += `<li style="padding:6px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem; display:flex; justify-content:space-between;">
                            <span>🔹 <strong>${d.nombre}</strong></span>
                            <span>${d.cantidad} lbs <span style="color:var(--texto-secundario); font-size:0.8rem;">(a $${d.precio.toFixed(2)} c/u)</span></span>
                         </li>`;
            });
            
            html += `       </ul>
                        </div>
                    </td>
                </tr>`;
        });
        
        html += `</tbody></table>`;
        contenedor.innerHTML = html;

    // ==========================================================================
    // VISTA #4: RENDIMIENTO FINANCIERO E INGRESOS (Macro y Micro Fusionado)
    // ==========================================================================
    } else if (vistaActual === 'ingresos') {
        document.getElementById('titulo-tabla-dinamica').innerText = "Rendimiento Financiero y Rotación";
        
        // Mapear rentabilidad de especies individuales
        let metricasEspecies = {};
        productos.forEach(p => { 
            metricasEspecies[p.nombre] = { lbs: 0, usd: 0, tipo: p.tipo }; 
        });

        pedidos.filter(p => p.estado === "Entregado").forEach(p => {
            p.detalles.forEach(d => {
                if (metricasEspecies[d.nombre]) {
                    metricasEspecies[d.nombre].lbs += parseFloat(d.cantidad);
                    metricasEspecies[d.nombre].usd += parseFloat(d.cantidad) * parseFloat(d.precio);
                }
            });
        });

        // Encontrar el Producto Rey basado en libras despachadas
        let productoRey = "Ninguno";
        let maxLbs = -1;
        Object.keys(metricasEspecies).forEach(nombre => {
            if (metricasEspecies[nombre].lbs > maxLbs && metricasEspecies[nombre].lbs > 0) {
                maxLbs = metricasEspecies[nombre].lbs;
                productoRey = nombre;
            }
        });
        
        document.getElementById('subtitulo-analitico').innerText = `👑 Top Volumen: ${productoRey}`;
        document.getElementById('subtitulo-analitico').style.background = '#fef3c7';
        document.getElementById('subtitulo-analitico').style.color = '#b45309';

        // 1. Resumen Ejecutivo por Categoría (Se mantiene estático arriba como pediste)
        let htmlSegmentos = `
            <h4 style="color:var(--texto-secundario); margin-bottom:12px; font-size:0.95rem;">📊 Resumen por Segmento de Producción:</h4>
            <table class="admin-table-view" style="margin-bottom:30px;">
                <thead>
                    <tr>
                        <th>Línea de Producto</th>
                        <th>Lbs Despachadas</th>
                        <th>Ingresos Recaudados ($)</th>
                    </tr>
                </thead>
                <tbody>`;
                
        let categorias = ["Entero", "Filete", "Marisco"];
        categorias.forEach(cat => {
            let lbsCat = 0; let usdCat = 0;
            pedidos.filter(p => p.estado === "Entregado").forEach(p => {
                p.detalles.forEach(d => {
                    if (d.nombre.toLowerCase().includes(cat.toLowerCase()) || 
                        (cat === "Marisco" && (d.nombre.toLowerCase().includes("camarón") || d.nombre.toLowerCase().includes("pulpo")))) {
                        lbsCat += parseFloat(d.cantidad);
                        usdCat += parseFloat(d.cantidad) * parseFloat(d.precio);
                    }
                });
            });
            htmlSegmentos += `<tr><td><strong>Segmento ${cat}s</strong></td><td>${lbsCat.toFixed(2)} lbs</td><td><strong>$${usdCat.toFixed(2)}</strong></td></tr>`;
        });
        htmlSegmentos += `</tbody></table>`;

        // 2. NUEVO: Botonera de Filtrado Rápido para el Desglose Técnico Inferior
        let htmlBotonesIngresos = `
            <h4 style="color:var(--texto-secundario); margin-bottom:12px; font-size:0.95rem;">🐟 Desglose Técnico una a una (Histórico Entregado):</h4>
            <div class="filter-container" style="margin-bottom: 20px; display:flex; gap:10px;">
                <button class="filter-btn ${filtroCategoriaIngresos === 'Todos' ? 'active' : ''}" onclick="filtrarIngresosPorCategoria('Todos')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">Todos</button>
                <button class="filter-btn ${filtroCategoriaIngresos === 'Entero' ? 'active' : ''}" onclick="filtrarIngresosPorCategoria('Entero')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🐟 Enteros</button>
                <button class="filter-btn ${filtroCategoriaIngresos === 'Filete' ? 'active' : ''}" onclick="filtrarIngresosPorCategoria('Filete')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🔪 Filetes</button>
                <button class="filter-btn ${filtroCategoriaIngresos === 'Marisco' ? 'active' : ''}" onclick="filtrarIngresosPorCategoria('Marisco')" style="padding: 6px 12px; cursor:pointer; font-weight:700; border-radius:4px; border:1px solid var(--gris-borde);">🦐 Mariscos</button>
            </div>
        `;

        // 3. Tabla Detallada Especie por Especie (Filtrada dinámicamente)
        let htmlEspecies = `
            <table class="admin-table-view">
                <thead>
                    <tr>
                        <th>Especie Marina</th>
                        <th>Categoría</th>
                        <th>Lbs Vendidas</th>
                        <th>Dinero Total Generado</th>
                    </tr>
                </thead>
                <tbody>`;
        
        // Ordenar especies de mayor a menor ingresos de forma analítica
        let especiesOrdenadas = Object.keys(metricasEspecies).sort((a,b) => metricasEspecies[b].usd - metricasEspecies[a].usd);
        
        // Aplicar el filtro seleccionado por el jefe
        let especiesFiltradas = especiesOrdenadas.filter(nombreEsp => filtroCategoriaIngresos === 'Todos' || metricasEspecies[nombreEsp].tipo === filtroCategoriaIngresos);

        especiesFiltradas.forEach(nombreEsp => {
            let data = metricasEspecies[nombreEsp];
            htmlEspecies += `<tr><td><strong>${nombreEsp}</strong></td><td>${data.tipo}</td><td>${data.lbs.toFixed(2)} lbs</td><td><strong>$${data.usd.toFixed(2)}</strong></td></tr>`;
        });
        htmlEspecies += `</tbody></table>`;

        // Inyectamos todo el conjunto estructurado al contenedor
        contenedor.innerHTML = htmlSegmentos + htmlBotonesIngresos + htmlEspecies;
    }
}

/**
 * Función controladora del filtro de categorías para la vista de inventario
 */
function filtrarStockPorCategoria(categoria) {
    filtroCategoriaStock = categoria;
    renderizarTablaSegunFiltro();
}

/**
 * Lógica del acordeón dinámico para desplegar los pescados sin cambiar de página
 */
function conmutarDesplegableOrden(idPedido) {
    const filaDetalle = document.getElementById(`details-${idPedido}`);
    if (filaDetalle) {
        if (filaDetalle.style.display === "none") {
            filaDetalle.style.display = "table-row";
        } else {
            filaDetalle.style.display = "none";
        }
    }
}

/**
 * Control del Reloj y Cierre de 24 horas
 */
function actualizarRelojYReporteAutomático() {
    const ahora = new Date();
    const horaStr = ahora.toTimeString().split(' ')[0];
    const relojEl = document.getElementById('reloj-sistema');
    if (relojEl) relojEl.innerText = horaStr;

    if (horaStr === "23:59:59") {
        ejecutarCierreDeDiaAutomatico();
    }
}

function ejecutarCierreDeDiaAutomatico() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos_sistema')) || [];
    let entregadoHoy = pedidos.filter(p => p.estado === "Entregado").reduce((sum, p) => sum + parseFloat(p.total), 0);

    let archivoReportes = JSON.parse(localStorage.getItem('reportes_diarios_archivados')) || [];
    archivoReportes.push({
        fecha_cierre: new Date().toLocaleDateString('es-EC'),
        ingresos_24h: entregadoHoy.toFixed(2),
        tipo: "AUTOMÁTICO_MEDIANOCHE"
    });
    localStorage.setItem('reportes_diarios_archivados', JSON.stringify(archivoReportes));
}

function dispararReporteManualPDF() {
    alert("[MODO CONTINGENCIA INTERNET]\n\nPreparando compresión local de datos corporativos.\nSe abrirá la ventana de impresión nativa; seleccione 'Guardar como PDF' para archivar su reporte físico.");
    window.print();
}

function cerrarSesionCorporativa() {
    localStorage.removeItem('sesion_admin_activa');
    window.location.href = 'admin-login.html';
}

/**
 * Función controladora del filtro de categorías para la sección de ingresos
 */
function filtrarIngresosPorCategoria(categoria) {
    filtroCategoriaIngresos = categoria;
    renderizarTablaSegunFiltro();
}