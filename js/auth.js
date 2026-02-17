const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';     // Ej: https://xxxxx.supabase.co
const SUPABASE_KEY = 'TeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ'; // Ej: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== REFERENCIAS AL DOM ====================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');
const recoverPasswordLink = document.getElementById('recoverPassword');

// ==================== FUNCIONES DE UTILIDAD ====================

/**
 * Muestra un mensaje en el formulario
 * @param {string} message - Texto del mensaje
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showMessage(message, type = 'info') {
    formMessage.textContent = message;
    formMessage.className = 'form-message'; // Reset clases
    
    if (type === 'error') {
        formMessage.classList.add('error');
    } else if (type === 'success') {
        formMessage.classList.add('success');
    }
}

/**
 * Activa/desactiva estado de carga en el botón
 * @param {boolean} isLoading - Estado de carga
 */
function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

/**
 * Valida que los campos del formulario no estén vacíos
 * @returns {boolean} - True si es válido
 */
function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email) {
        showMessage('Por favor ingresa tu correo electrónico', 'error');
        emailInput.focus();
        return false;
    }

    if (!password) {
        showMessage('Por favor ingresa tu contraseña', 'error');
        passwordInput.focus();
        return false;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Por favor ingresa un correo electrónico válido', 'error');
        emailInput.focus();
        return false;
    }

    // Validación de longitud de contraseña
    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        passwordInput.focus();
        return false;
    }

    return true;
}

/**
 * Limpia el formulario y los mensajes
 */
function clearForm() {
    emailInput.value = '';
    passwordInput.value = '';
    formMessage.textContent = '';
    formMessage.className = 'form-message';
}

// ==================== LÓGICA DE AUTENTICACIÓN ====================

/**
 * Maneja el inicio de sesión del usuario
 * @param {Event} e - Evento del formulario
 */
async function handleLogin(e) {
    e.preventDefault(); // Prevenir recarga de página

    // 1. Validar formulario
    if (!validateForm()) {
        return;
    }

    // 2. Obtener valores
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // 3. Activar estado de carga
    setLoading(true);
    showMessage('Verificando credenciales...', 'info');

    try {
        // 4. Intentar autenticar con Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // 5. Manejar errores de Supabase
        if (error) {
            console.error('Error de autenticación:', error);
            
            // Mensajes amigables según el tipo de error
            if (error.message.includes('Invalid login credentials')) {
                showMessage('Correo o contraseña incorrectos', 'error');
            } else if (error.message.includes('Email not confirmed')) {
                showMessage('Por favor verifica tu correo electrónico', 'error');
            } else {
                showMessage('Error al iniciar sesión. Intenta nuevamente', 'error');
            }
            setLoading(false);
            return;
        }

        // 6. Login exitoso
        console.log('Usuario autenticado:', data.user);
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        
        // 7. Esperar un momento y redirigir al dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        // 8. Errores inesperados
        console.error('Error inesperado:', error);
        showMessage('Ocurrió un error inesperado. Intenta nuevamente', 'error');
        setLoading(false);
    }
}

/**
 * Maneja la recuperación de contraseña (opcional)
 */
async function handlePasswordRecovery() {
    const email = emailInput.value.trim();
    
    if (!email) {
        showMessage('Ingresa tu correo para recuperar la contraseña', 'error');
        emailInput.focus();
        return;
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/dashboard.html',
        });

        if (error) {
            showMessage('Error al enviar correo de recuperación', 'error');
        } else {
            showMessage('Se envió un correo con instrucciones de recuperación', 'success');
        }
    } catch (error) {
        showMessage('Ocurrió un error. Intenta nuevamente', 'error');
    }
}

/**
 * Verifica si el usuario ya tiene sesión activa
 * Útil para redirigir al dashboard si ya está logueado
 */
async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Si ya hay sesión, redirigir al dashboard
        window.location.href = 'dashboard.html';
    }
}

// ==================== EVENT LISTENERS ====================

// Iniciar sesión al enviar el formulario
loginForm.addEventListener('submit', handleLogin);

// Recuperación de contraseña
recoverPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    handlePasswordRecovery();
});

// Limpiar mensajes cuando el usuario empieza a escribir
emailInput.addEventListener('input', () => {
    if (formMessage.classList.contains('error')) {
        showMessage('', 'info');
    }
});

passwordInput.addEventListener('input', () => {
    if (formMessage.classList.contains('error')) {
        showMessage('', 'info');
    }
});

// ==================== INICIALIZACIÓN ====================

// Verificar sesión al cargar la página
document.addEventListener('DOMContentLoaded', checkExistingSession);

// Log de inicialización (para debugging)
console.log('✅ Sistema de autenticación inicializado');
