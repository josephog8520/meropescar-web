// compartida/base-datos.js - MOTOR CENTRAL DE DATOS
const firebaseConfig = {
    apiKey: "AIzaSyBHPTn0nHm2m_JYXMBoA6Aq_ZBHOwRbHx8",
    authDomain: "meropescar-sistema.firebaseapp.com",
    projectId: "meropescar-sistema",
    storageBucket: "meropescar-sistema.firebasestorage.app",
    messagingSenderId: "851970243052",
    appId: "1:851970243052:web:12a8f10781adaa319868c9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.MeroPescarDB = {
    
    // Lectura en tiempo real (Usar en todas las vistas)
    suscribirseAProductos: (callback) => {
        return db.collection("productos").onSnapshot(snap => {
            callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    },

    // CRUD Inventario (Escritura)
    crearProducto: (data) => db.collection("productos").add({ ...data, fecha: new Date().toISOString() }),
    actualizarProducto: (id, data) => db.collection("productos").doc(id).update(data),
    eliminarProducto: (id) => db.collection("productos").doc(id).delete(),

    // Pedidos (Gestión de Solicitudes y Entregas)
    suscribirseAPedidos: (callback) => {
        return db.collection("pedidos").onSnapshot(snap => {
            callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    },

    // Agrega esto a base-datos.js
    actualizarPedido: (id, data) => {
        return db.collection("pedidos").doc(id).update(data);
    },

    // Añadir esto dentro del objeto window.MeroPescarDB en base-datos.js
    crearPedido: (pedidoData) => {
    return db.collection("pedidos").add({
        ...pedidoData,
        fecha: new Date().toISOString(),
        estado: "Por Entregar" // El estado que tu panel espera
    });
    },
    actualizarEstadoPedido: (id, estado) => db.collection("pedidos").doc(id).update({ estado: estado })
};

console.log("⚓ Motor MeroPescar: CONEXIÓN ESTABLE");