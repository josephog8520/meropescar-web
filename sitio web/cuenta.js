let modoRegistro = false;

function toggleModo() {
    modoRegistro = !modoRegistro;
    
    // Cambiar textos
    document.getElementById('btn-submit').innerText = modoRegistro ? "Registrarse" : "Ingresar";
    document.getElementById('texto-toggle').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate";
    document.getElementById('auth-desc').innerText = modoRegistro ? "Completa tus datos para crear tu cuenta." : "Acceso inmediato optimizado para el muelle.";
    
    // Mostrar/Ocultar campos extra
    document.getElementById('campos-registro').style.display = modoRegistro ? "block" : "none";
}

function procesarAuth() {
    const ident = document.getElementById('client-ident').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const email = document.getElementById('client-email').value.trim();
    
    let usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');

    if (modoRegistro) {
        const nombre = document.getElementById('reg-nombre').value;
        const apellido = document.getElementById('reg-apellido').value;
        
        if (usuarios.find(u => u.ident === ident)) return alert("Este usuario ya existe.");
        
        usuarios.push({ nombre, apellido, ident, phone, email });
        localStorage.setItem('usuarios_registrados', JSON.stringify(usuarios));
        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        toggleModo(); 
    } else {
        const usuario = usuarios.find(u => u.ident === ident && u.phone === phone);
        if (usuario) {
            localStorage.setItem('sesion_activa', JSON.stringify({ ...usuario, rol: 'cliente' }));
            alert("Bienvenido, " + usuario.nombre);
            window.location.href = 'catalogo.html';
        } else {
            alert("Credenciales incorrectas o usuario no registrado.");
        }
    }
}