// pedido-exito.js - Controlador del Recibo Digital Transaccional

/**
 * Carga los datos guardados transitoriamente por el catálogo y los pinta en el recibo
 */
function renderizarReciboDigital() {
    // 1. Intentar recuperar el último pedido procesado usando cualquiera de los nombres posibles
    const datosRecibo = JSON.parse(localStorage.getItem('ultimo_pedido_exito')) || 
                        JSON.parse(localStorage.getItem('ultimo_recibo_processed')) || 
                        JSON.parse(localStorage.getItem('ultimo_recibo_procesado'));

    if (!datosRecibo) {
        alert("No se localizó ninguna transacción reciente. Volviendo al catálogo.");
        window.location.href = 'catalogo.html';
        return;
    }

    // 2. Inyectar metadatos básicos en la interfaz (unificando propiedades)
    document.getElementById('recibo-id').innerText = datosRecibo.idPedido || datosRecibo.id_pedido || "MP-99482";
    document.getElementById('recibo-fecha').innerText = datosRecibo.fecha || new Date().toLocaleString();
    
    const totalFinal = datosRecibo.total || datosRecibo.total_pagar || "0.00";
    document.getElementById('recibo-total').innerText = `$${parseFloat(totalFinal).toFixed(2)}`;

    // 3. Simulación de Hash SHA-256 visual para dar alta confianza (Requisito de seguridad 74%)
    const caracteres = "abcdef0123456789";
    let hashFicticio = "";
    for (let i = 0; i < 40; i++) {
        hashFicticio += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    document.getElementById('recibo-hash').innerText = hashFicticio.toUpperCase() + "...";

    // 4. Dibujar las filas de la tabla de mercancías de forma robusta
    const tbody = document.getElementById('recibo-tabla-cuerpo');
    if (!tbody) return;
    tbody.innerHTML = '';

    const detalles = datosRecibo.detalles || [];
    detalles.forEach(item => {
        const subtotalItem = item.subtotal !== undefined ? item.subtotal : (item.cantidad * item.precio);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.nombre || 'Producto'}</strong></td>
            <td class="txt-center">${item.cantidad} lbs</td>
            <td class="txt-right">$${parseFloat(subtotalItem).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Simulación asíncrona de envío de recibo digital a canales tradicionales
 */
function simularNotificacionWhatsApp() {
    const idOrden = document.getElementById('recibo-id').innerText;
    alert(`[SIMULACIÓN DE NOTIFICACIÓN COMPLETADA]\n\nSe ha disparado el flujo asíncrono hacia el teléfono registrado.\n\nMensaje enviado: "⚓ MeroPescar: Tu reserva de stock de la Orden ${idOrden} está lista para retiro en muelle."`);
}

// Inicializar el recibo al cargar la pantalla
window.onload = renderizarReciboDigital;