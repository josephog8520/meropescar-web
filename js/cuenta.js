// cuenta.js - Gestión de Autenticación de Clientes en Firebase Cloud (Firestore)
let modoRegistro = false;

function toggleModo() {
    modoRegistro = !modoRegistro;
    
    // Cambiar textos dinámicamente
    document.getElementById('btn-submit').innerText = modoRegistro ? "Registrarse" : "Ingresar";
    document.getElementById('texto-toggle').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
    document.getElementById('auth-desc').innerText = modoRegistro ? "Completa tus datos para crear tu cuenta en la nube." : "Acceso inmediato optimizado para el muelle.";
    
    // Mostrar/Ocultar campos extra de registro
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
}

async function procesarAuth() {
    const ident = document.getElementById('client-ident').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    
    try {
        if (modoRegistro) {
            const nombre = document.getElementById('reg-nombre').value.trim();
            const apellido = document.getElementById('reg-apellido').value.trim();
            
            if (!nombre || !apellido) {
                alert("Por favor, completa tu nombre y apellido.");
                return;
            }

            // 1. Verificamos si el cliente ya existe en Firestore consultando por su cédula o RUC (ident)
            const snapshot = await db.collection("clientes").where("ident", "==", ident).get();
            
            if (!snapshot.empty) {
                alert("Este número de RUC o Cédula ya se encuentra registrado.");
                return;
            }

            // 2. Si no existe, lo guardamos directamente en la colección 'clientes' de Firestore
            await db.collection("clientes").add({
                nombre: nombre,
                apellido: apellido,
                ident: ident,
                phone: phone,
                email: email,
                fecha_registro: new Date().toISOString()
            });

            alert("¡Registro exitoso en la nube! Ahora puedes iniciar sesión.");
            toggleModo(); 

        } else {
            // 1. Consultamos en Firestore si el cliente existe validando su RUC/Cédula y Teléfono
            const snapshot = await db.collection("clientes")
                .where("ident", "==", ident)
                .where("phone", "==", phone)
                .get();

            if (!snapshot.empty) {
                let clienteData = null;
                snapshot.forEach(doc => {
                    clienteData = doc.data();
                });

                // 2. Guardamos la sesión activa localmente de forma temporal solo para la navegación del navegador actual
                localStorage.setItem('sesion_activa', JSON.stringify({ ...clienteData, rol: 'cliente' }));
                
                alert("Bienvenido, " + clienteData.nombre);
                
                // Si venía de intentar comprar con un carrito suspendido, lo redirigimos o mandamos al catálogo
                window.location.href = 'catalogo.html';
            } else {
                alert("Credenciales incorrectas o cliente no registrado en el sistema.");
            }
        }
    } catch (error) {
        console.error("Error en la autenticación del cliente:", error);
        alert("Ocurrió un error de conexión con la base de datos.");
    }
}

// --- NUEVO: Verificar al cargar la página si el cliente ya tiene una sesión activa ---
window.onload = async function() {
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    
    if (sesion && sesion.rol === 'cliente') {
        // Ocultamos el login y mostramos el perfil
        document.getElementById('seccion-auth').style.display = 'none';
        document.getElementById('seccion-perfil').style.display = 'block';

        // Rellenar campos del perfil con los datos locales
        document.getElementById('perfil-nombre').value = sesion.nombre || '';
        document.getElementById('perfil-apellido').value = sesion.apellido || '';
        document.getElementById('perfil-ident').value = sesion.ident || '';
        document.getElementById('perfil-phone').value = sesion.phone || '';
        document.getElementById('perfil-email').value = sesion.email || '';

        // Cargar el historial de compras de este cliente desde la base de datos de Firebase
        await cargarHistorialComprasCliente(sesion.nombre, sesion.ident);
    }
};

// --- NUEVO: Guardar cambios de edición de perfil ---
async function guardarCambiosPerfil() {
    const sesion = JSON.parse(localStorage.getItem('sesion_activa'));
    if (!sesion) return;

    const nuevoNombre = document.getElementById('perfil-nombre').value.trim();
    const nuevoApellido = document.getElementById('perfil-apellido').value.trim();
    const nuevoPhone = document.getElementById('perfil-phone').value.trim();
    const nuevoEmail = document.getElementById('perfil-email').value.trim();

    try {
        // Buscar el documento del cliente en Firestore usando su cédula/RUC (ident)
        const snapshot = await db.collection("clientes").where("ident", "==", sesion.ident).get();
        
        if (!snapshot.empty) {
            let docId = "";
            snapshot.forEach(doc => { docId = doc.id; });

            // Actualizar en la nube de Firebase
            await db.collection("clientes").doc(docId).update({
                nombre: nuevoNombre,
                apellido: nuevoApellido,
                phone: nuevoPhone,
                email: nuevoEmail
            });

            // Actualizar la sesión local activa
            sesion.nombre = nuevoNombre;
            sesion.apellido = nuevoApellido;
            sesion.phone = nuevoPhone;
            sesion.email = nuevoEmail;
            localStorage.setItem('sesion_activa', JSON.stringify(sesion));

            alert("¡Perfil actualizado con éxito en la nube!");
        } else {
            alert("No se encontró el registro en la base de datos.");
        }
    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        alert("Hubo un error al actualizar los datos.");
    }
}

// --- NUEVO: Cargar Historial de Compras filtrado por cliente ---
async function cargarHistorialComprasCliente(nombreCliente, identCliente) {
    const contenedor = document.getElementById('historial-compras-container');
    
    try {
        // Consultamos la colección 'pedidos' en Firebase
        const snapshot = await db.collection("pedidos").get();
        
        if (snapshot.empty) {
            contenedor.innerHTML = `<p style="font-size: 0.85rem; color: var(--texto-secundario);">No hay registros de pedidos en el sistema.</p>`;
            return;
        }

        let misPedidos = [];
        snapshot.forEach(doc => {
            let p = doc.data();
            // Filtramos los pedidos que coincidan con el cliente actual
            if (p.cliente && (p.cliente.includes(nombreCliente) || p.cliente.includes(identCliente))) {
                misPedidos.push({ id: doc.id, ...p });
            }
        });

        if (misPedidos.length === 0) {
            contenedor.innerHTML = `<p style="font-size: 0.85rem; color: var(--texto-secundario);">Aún no has realizado ninguna reserva de stock.</p>`;
            return;
        }

        // Pintamos el historial en una tabla limpia
        contenedor.innerHTML = `
            <table class="admin-table-view" style="width: 100%; font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th style="padding: 8px;">ID Orden</th>
                        <th style="padding: 8px;">Fecha</th>
                        <th style="padding: 8px;">Total</th>
                        <th style="padding: 8px;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${misPedidos.map(p => `
                        <tr>
                            <td style="padding: 8px;"><code>${p.id.substring(0, 6)}...</code></td>
                            <td style="padding: 8px;">${p.fecha ? new Date(p.fecha).toLocaleDateString() : 'N/A'}</td>
                            <td style="padding: 8px; font-weight: bold;">$${p.total}</td>
                            <td style="padding: 8px;"><span style="color: ${p.estado === 'Entregado' ? '#16a34a' : '#0284c7'}; font-weight: 700;">${p.estado}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error("Error al cargar historial:", error);
        contenedor.innerHTML = `<p style="font-size: 0.85rem; color: #dc2626;">Error al cargar las transacciones.</p>`;
    }
}

// --- NUEVO: Cerrar sesión desde el perfil ---
function cerrarSesionCliente() {
    if (confirm("¿Deseas cerrar sesión?")) {
        localStorage.removeItem('sesion_activa');
        window.location.reload();
    }
}