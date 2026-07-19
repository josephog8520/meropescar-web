// admin-reportes.js - Gestor de Consultas del Archivo de Cierres con Descarga PDF Individual

window.onload = function() {
    const sesion = JSON.parse(localStorage.getItem('sesion_admin_activa'));
    if (!sesion || sesion.rol !== 'gerencia') {
        alert("Acceso Restringido. Solo el rol de Gerencia puede auditar los reportes diarios.");
        window.location.href = 'admin-login.html';
        return;
    }

    renderizarHistorialReportes();
};

/**
 * Dibuja los cierres almacenados con su respectivo botón de descarga individual
 */
function renderizarHistorialReportes() {
    const contenedor = document.getElementById('historial-reportes-contenedor');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const reportes = JSON.parse(localStorage.getItem('reportes_diarios_archivados')) || [];

    if (reportes.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center; padding:30px; border:2px dashed var(--gris-borde); border-radius:6px; color:var(--texto-secundario);">
                <span style="font-size:2rem;">📂</span>
                <p style="margin-top:10px; font-size:0.95rem;">El archivo histórico está vacío.</p>
            </div>`;
        return;
    }

    let reportesInvertivos = [...reportes].reverse();
    let html = `<div style="display:grid; grid-template-columns:1fr; gap:15px;">`;
    
    reportesInvertivos.forEach((rep) => {
        let esAutomatico = rep.tipo === "AUTOMÁTICO_MEDIANOCHE";
        let badgeTipo = esAutomatico 
            ? `<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">🕒 Sistema (24h)</span>` 
            : `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">👤 Forzado</span>`;

        html += `
            <div style="background:#fff; border:1px solid var(--gris-borde); border-radius:6px; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.01);">
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                        <strong style="color:var(--texto-principal); font-size:1.05rem;">📅 Cierre: ${rep.fecha_cierre}</strong>
                        ${badgeTipo}
                    </div>
                    <p style="font-size:0.85rem; color:var(--texto-secundario); margin-bottom:8px;">Estatus contable: Consolidado y bloqueado en base de datos local.</p>
                    
                    <!-- NUEVO: Botón operativo por cada fila para descargar el reporte contable -->
                    <button onclick="descargarReporteEspecificoPDF('${rep.id_reporte}')" style="background: var(--azul-frescura); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; gap: 5px;">
                        📄 Descargar PDF
                    </button>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.75rem; color:var(--texto-secundario); text-transform:uppercase; font-weight:700;">Ingresos Brutos</div>
                    <div style="font-size:1.3rem; font-weight:800; color:var(--azul-institucional);">$${rep.ingresos_24h}</div>
                </div>
            </div>`;
    });

    html += `</div>`;
    contenedor.innerHTML = html;
}

/**
 * Captura el estado detallado actual para guardarlo de forma íntegra en la simulación
 */
function simularGeneracionCierreInmediato() {
    const pedidos = JSON.parse(localStorage.getItem('pedidos_sistema')) || [];
    const productos = JSON.parse(localStorage.getItem('productos')) || [];
    
    let despachados = pedidos.filter(p => p.estado === "Despachado");
    let despachadoHastaAhora = despachados.reduce((sum, p) => sum + parseFloat(p.total), 0);

    // Guardamos qué especies se vendieron y cuánto queda para auditar en el PDF
    let detallesInventarioCierre = productos.map(p => {
        let lbsVendidas = 0;
        despachados.forEach(ped => {
            let item = ped.detalles.find(d => d.id === p.id);
            if (item) lbsVendidas += parseFloat(item.cantidad);
        });
        return { nombre: p.nombre, stock_final: p.stock, libras_vendidas: lbsVendidas };
    });

    let archivoReportes = JSON.parse(localStorage.getItem('reportes_diarios_archivados')) || [];
    
    archivoReportes.push({
        id_reporte: "REP-" + new Date().getTime(), // ID único para buscarlo después
        fecha_cierre: new Date().toLocaleDateString('es-EC') + " - " + new Date().toLocaleTimeString('es-EC', {hour: '2-digit', minute:'2-digit'}),
        ingresos_24h: despachadoHastaAhora.toFixed(2),
        tipo: "FORZADO_GERENCIA",
        inventario: detallesInventarioCierre
    });
    
    localStorage.setItem('reportes_diarios_archivados', JSON.stringify(archivoReportes));
    
    alert("[SIMULACIÓN COMPLETADA]\n\nSe ha generado el reporte con un desglose completo de especies vendidas.");
    renderizarHistorialReportes();
}

/**
 * NUEVA FUNCIÓN: Abre una pestaña limpia optimizada para impresión nativa del reporte seleccionado
 */
function descargarReporteEspecificoPDF(idReporte) {
    const reportes = JSON.parse(localStorage.getItem('reportes_diarios_archivados')) || [];
    const rep = reportes.find(r => r.id_reporte === idReporte);

    if (!rep) {
        alert("Error al recuperar el archivo del reporte contable.");
        return;
    }

    // Generar una vista HTML limpia en memoria
    let ventanaImpresion = window.open('', '_blank');
    
    let filasInventario = '';
    if (rep.inventario && rep.inventario.length > 0) {
        rep.inventario.forEach(item => {
            filasInventario += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 10px; text-align: left;">${item.nombre}</td>
                    <td style="padding: 10px; text-align: center;">${item.libras_vendidas.toFixed(2)} lbs</td>
                    <td style="padding: 10px; text-align: center;">${item.stock_final} lbs</td>
                </tr>`;
        });
    } else {
        filasInventario = `<tr><td colspan="3" style="padding:15px; text-align:center; color:#666;">No hay desglose de inventario registrado para cierres antiguos.</td></tr>`;
    }

    // Inyectar la maqueta del documento contable oficial
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Cierre_Contable_${rep.fecha_cierre.replace(/ /g, '_')}</title>
            <style>
                body { font-family: 'Arial', sans-serif; color: #333; padding: 40px; margin: 0; }
                .header { border-bottom: 3px solid #0b436a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                .title { font-size: 22px; font-weight: bold; color: #0b436a; margin: 0; }
                .meta-box { margin-bottom: 30px; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #0b436a; color: white; padding: 12px; text-align: left; font-size: 14px; }
                .total-box { margin-top: 4px; padding: 20px; text-align: right; background: #f0f7ff; border-radius: 6px; border: 1px solid #cbd5e1; }
                .total-title { font-size: 14px; color: #475569; text-transform: uppercase; font-weight: bold; }
                .total-val { font-size: 24px; font-weight: bold; color: #0b436a; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1 class="title">⚓ MEROPESCAR - REPORTES DE AUDITORÍA</h1>
                    <span style="font-size:12px; color:#666;">Terminal de Operaciones Muelle de Salinas</span>
                </div>
                <div style="text-align: right; font-size: 12px; color: #666;">
                    <strong>Tipo:</strong> ${rep.tipo.replace('_', ' ')}
                </div>
            </div>

            <div class="meta-box">
                <strong>Fecha y Hora de Cierre:</strong> ${rep.fecha_cierre}<br>
                <strong>Estatus Contable:</strong> Consolidado y Firmado Digitalmente (Simulado)
            </div>

            <h3 style="color:#0b436a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">📊 Balance de Movimiento de Pesca</h3>
            <table>
                <thead>
                    <tr>
                        <th>Especie Marina</th>
                        <th style="text-align: center;">Volumen Vendido (24h)</th>
                        <th style="text-align: center;">Stock Disponible Restante</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasInventario}
                </tbody>
            </table>

            <br><br>
            <div class="total-box">
                <div class="total-title">Total Ingresos Recaudados</div>
                <div class="total-val">$${rep.ingresos_24h}</div>
            </div>

            <div style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                Documento de control interno generado automáticamente por el BackOffice de MeroPescar.
            </div>

            <script>
                // Disparar de forma inmediata el controlador de impresión nativa a PDF al abrirse la pestaña
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500); // Se auto-cierra al terminar para no estorbar
                }
            <\/script>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
}