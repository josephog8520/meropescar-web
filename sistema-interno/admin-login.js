// admin-login.js - Controlador de Autenticación del Sistema de Oficina

/**
 * Valida las credenciales ingresadas contra la base de datos de personal autorizado
 */
function verificarAccesoAdministrativo() {
    const usuarioIngresado = document.getElementById('admin-user-field').value.trim();
    const claveIngresada = document.getElementById('admin-pass-field').value;

    const listaUsuariosAdmin = JSON.parse(localStorage.getItem('usuarios_admin')) || [];
    const usuarioValidado = listaUsuariosAdmin.find(u => u.usuario === usuarioIngresado && u.clave === claveIngresada);

    if (usuarioValidado) {
        const sesionCorporativa = {
            login: true,
            rol: usuarioValidado.rol,
            nombre: usuarioValidado.nombre,
            usuario: usuarioValidado.usuario,
            token_timestamp: new Date().getTime()
        };
        localStorage.setItem('sesion_admin_activa', JSON.stringify(sesionCorporativa));

        alert(`[ACCESO AUTORIZADO]\n\nBienvenido(a): ${usuarioValidado.nombre}\nRol: ${usuarioValidado.rol.toUpperCase()}`);
        
        // --- AQUÍ ESTÁ EL CAMBIO LOGÍCO ---
        // Evaluamos el rol para decidir a qué página enviarlo de forma independiente
        if (usuarioValidado.rol === 'gerencia') {
            // El Jefe de Operaciones va al Dashboard de KPIs Analíticos
            window.location.href = 'admin-dashboard.html';
        } else if (usuarioValidado.rol === 'oficina') {
            // El Encargado de Despacho va directo a la Terminal de Carga en Muelle
            window.location.href = 'personal-despacho.html';
        }
        
    } else {
        alert("Error de autenticación corporativa:\n\nEl usuario o la contraseña ingresados son incorrectos.");
    }
}