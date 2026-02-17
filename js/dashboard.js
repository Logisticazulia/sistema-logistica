/**
 * ========================================
 * SISTEMA LOGÍSTICA - DASHBOARD
 * ========================================
 * Protección de ruta, fecha y navegación
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// URLs para GitHub Pages
const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';
const DASHBOARD_URL = 'https://logisticazulia.github.io/sistema-logistica/dashboard.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const currentDateElement = document.getElementById('currentDate');
const lastUpdateElement = document.getElementById('lastUpdate');
const moduleCards = document.querySelectorAll('.module-card');

// ==================== FUNCIONES ====================

/**
 * Verifica si el usuario tiene sesión activa
 */
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        console.log('❌ No hay sesión activa, redirigiendo al login...');
        window.location.href = LOGIN_URL;
        return;
    }
    
    userEmailElement.textContent = session.user.email;
    console.log('✅ Sesión activa para:', session.user.email);
}

/**
 * Maneja el cierre de sesión
 */
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            alert('Error al cerrar sesión: ' + error.message);
            return;
        }
        
        console.log('✅ Sesión cerrada correctamente');
        window.location.href = LOGIN_URL;
        
    } catch (error) {
        console.error('Error en logout:', error);
        alert('Ocurrió un error al cerrar sesión');
    }
}

/**
 * Actualiza la fecha actual en el header
 */
function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDateElement.textContent = now.toLocaleDateString('es-ES', options);
    
    // Fecha de última actualización (puedes cambiarla manualmente)
    lastUpdateElement.textContent = new Date().toLocaleDateString('es-ES');
}

/**
 * Maneja el clic en los módulos
 */
function handleModuleClick(e) {
    e.preventDefault();
    
    const moduleCard = e.currentTarget;
    const moduleName = moduleCard.getAttribute('data-module');
    
    // Efecto visual de clic
    moduleCard.style.transform = 'scale(0.98)';
    setTimeout(() => {
        moduleCard.style.transform = '';
    }, 150);
    
    // Mensaje temporal (luego crearás las páginas de cada módulo)
    alert(`🚀 Módulo: ${moduleName.toUpperCase()}\n\nEsta sección está en desarrollo.\nPróximamente disponible.`);
    
    // Cuando crees las páginas de cada módulo, usa:
    // window.location.href = `modulos/${moduleName}.html`;
}

/**
 * Agrega event listeners a los módulos
 */
function initModuleListeners() {
    moduleCards.forEach(card => {
        card.addEventListener('click', handleModuleClick);
    });
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    updateDate();
    initModuleListeners();
    console.log('✅ Dashboard inicializado correctamente');
});

// Botón de logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}
