/* ============================================ */
/* INSPECCION.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* MENÚ PRINCIPAL DE INSPECCIONES PVR           */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Iniciando inspeccion.js');
    
    // ✅ Inicializar Supabase si las credenciales están disponibles
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
    // ✅ Cargar email del usuario
    cargarEmailUsuario();
});

// ============================================
// ✅ CARGAR EMAIL DEL USUARIO
// ============================================
function cargarEmailUsuario() {
    const userEmailElement = document.getElementById('userEmail');
    if (!userEmailElement) return;
    
    // ✅ Primero intentar cargar desde sessionStorage
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email);
            return;
        } catch (error) {
            console.error('❌ Error al parsear usuario desde sessionStorage:', error);
        }
    }
    
    // ✅ Si no hay usuario en sessionStorage, intentar obtenerlo de Supabase
    if (supabaseClient) {
        supabaseClient.auth.getSession()
            .then(function(response) {
                const session = response.data.session;
                if (session && session.user) {
                    // ✅ Usuario autenticado
                    userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                    
                    // ✅ Guardar en sessionStorage para futuras cargas
                    sessionStorage.setItem('usuario', JSON.stringify({
                        email: session.user.email,
                        id: session.user.id
                    }));
                    
                    console.log('✅ Usuario cargado desde Supabase:', session.user.email);
                } else {
                    // ✅ No hay sesión activa
                    userEmailElement.textContent = 'usuario@institucion.com';
                    console.log('⚠️ No hay sesión activa de Supabase');
                }
            })
            .catch(function(error) {
                console.error('❌ Error al obtener sesión de Supabase:', error);
                userEmailElement.textContent = 'usuario@institucion.com';
            });
    } else {
        // ✅ Supabase no está disponible
        userEmailElement.textContent = 'usuario@institucion.com';
        console.log('⚠️ Supabase no disponible, usando usuario por defecto');
    }
}

// ============================================
// ✅ CERRAR SESIÓN
// ============================================
function cerrarSesion() {
    // ✅ Limpiar sessionStorage
    sessionStorage.removeItem('usuario');
    
    // ✅ Si hay cliente Supabase, cerrar sesión allí también
    if (supabaseClient) {
        supabaseClient.auth.signOut()
            .then(function() {
                console.log('✅ Sesión cerrada correctamente');
                window.location.href = '../dashboard.html';
            })
            .catch(function(error) {
                console.error('❌ Error al cerrar sesión:', error);
                window.location.href = '../dashboard.html';
            });
    } else {
        // ✅ Redirigir aunque Supabase no esté disponible
        window.location.href = '../dashboard.html';
    }
}

// ============================================
// ✅ AGREGAR LISTENER AL BOTÓN DE LOGOUT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cerrarSesion();
        });
    }
});

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES
// ============================================
window.cargarEmailUsuario = cargarEmailUsuario;
window.cerrarSesion = cerrarSesion;

console.log('✅ Funciones exportadas a window');
