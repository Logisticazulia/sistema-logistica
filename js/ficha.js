/**
 * ========================================
 * MÓDULO: FICHA TÉCNICA - MENÚ PRINCIPAL
 * ========================================
 * Funcionalidades:
 * - Mostrar email de usuario autenticado
 * - Cerrar sesión
 */

// ========================================
// CONFIGURACIÓN
// ========================================
let supabaseClient = null;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando módulo Ficha Técnica...');
    
    // 1. Verificar que Supabase esté disponible
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase no está cargado');
        return;
    }
    
    // 2. Crear cliente de Supabase
    supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_KEY
    );
    
    // 3. Cargar usuario autenticado
    cargarUsuario();
    
    // 4. Configurar botón de logout
    configurarLogout();
    
    console.log('✅ Módulo Ficha Técnica inicializado');
});

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

/**
 * Muestra el email del usuario autenticado en el navbar
 */
async function cargarUsuario() {
    try {
        console.log('🔄 Cargando usuario autenticado...');
        
        // ✅ SINTAXIS CORREGIDA - Sin espacios en la destructuración
        const sessionData = await supabaseClient.auth.getSession();
        const session = sessionData.data ? sessionData.data.session : null;
        const error = sessionData.error;
        
        if (error) {
            console.error('❌ Error obteniendo sesión:', error);
            return;
        }
        
        const userEmail = document.getElementById('userEmail');
        
        if (session && session.user && session.user.email) {
            const email = session.user.email;
            
            // Mostrar email truncado si es muy largo
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            
            userEmail.textContent = nombreMostrar;
            userEmail.title = email; // Tooltip con email completo
            userEmail.style.cursor = 'help';
            
            console.log('✅ Usuario autenticado:', email);
        } else {
            userEmail.textContent = 'Invitado';
            userEmail.title = 'No hay sesión activa';
            console.log('⚠️ No hay sesión activa');
        }
    } catch (err) {
        console.error('❌ Error en cargarUsuario:', err);
    }
}

/**
 * Configura el botón de cerrar sesión
 */
function configurarLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!logoutBtn) {
        console.warn('⚠️ Botón de logout no encontrado');
        return;
    }
    
    logoutBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (!confirm('¿Está seguro de que desea cerrar sesión?')) {
            return;
        }
        
        try {
            console.log('🔄 Cerrando sesión...');
            
            const logoutData = await supabaseClient.auth.signOut();
            const error = logoutData.error;
            
            if (error) {
                console.error('❌ Error al cerrar sesión:', error);
                throw error;
            }
            
            // Limpiar datos locales
            localStorage.clear();
            sessionStorage.clear();
            
            console.log('✅ Sesión cerrada correctamente');
            
            // 🔁 Redirigir al login
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error('❌ Error en cerrarSesion:', error);
            // Forzar redirección incluso con error
            window.location.href = '../index.html';
        }
    });
    
    console.log('✅ Botón de logout configurado');
}

// ========================================
// FIN DEL MÓDULO
// ========================================
console.log('✅ Script ficha.js cargado correctamente');
