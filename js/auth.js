/**
 * ========================================
 * SISTEMA INSTITUCIONAL - AUTENTICACIÓN
 * ========================================
 * Manejo de login/logout con Supabase
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';     
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ'; 

// ✅ CORRECCIÓN: Usamos 'supabaseClient' para evitar conflictos con la librería
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== REFERENCIAS AL DOM ====================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');
const recoverPasswordLink = document.getElementById('recoverPassword');

// ==================== FUNCIONES DE UTILIDAD ====================

function showMessage(message, type = 'info') {
    formMessage.textContent = message;
    formMessage.className = 'form-message';
    
    if (type === 'error') {
        formMessage.classList.add('error');
    } else if (type === 'success') {
        formMessage.classList.add('success');
    }
}

function setLoading(isLoading) {
    if (isLoading) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
    } else {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('Por favor ingresa un correo electrónico válido', 'error');
        emailInput.focus();
        return false;
    }

    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        passwordInput.focus();
        return false;
    }

    return true;
}

function clearForm() {
    emailInput.value = '';
    passwordInput.value = '';
    formMessage.textContent = '';
    formMessage.className = 'form-message';
}

// ==================== LÓGICA DE AUTENTICACIÓN ====================

async function handleLogin(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    setLoading(true);
    showMessage('Verificando credenciales...', 'info');

    try {
        // ✅ CORRECCIÓN: Usamos 'supabaseClient' en lugar de 'supabase'
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('Error de autenticación:', error);
            
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

        console.log('Usuario autenticado:', data.user);
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Error inesperado:', error);
        showMessage('Ocurrió un error inesperado. Intenta nuevamente', 'error');
        setLoading(false);
    }
}

async function handlePasswordRecovery() {
    const email = emailInput.value.trim();
    
    if (!email) {
        showMessage('Ingresa tu correo para recuperar la contraseña', 'error');
        emailInput.focus();
        return;
    }

    try {
        // ✅ CORRECCIÓN: Usamos 'supabaseClient'
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
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

async function checkExistingSession() {
    // ✅ CORRECCIÓN: Usamos 'supabaseClient'
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        window.location.href = 'dashboard.html';
    }
}

// ==================== EVENT LISTENERS ====================

loginForm.addEventListener('submit', handleLogin);

recoverPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    handlePasswordRecovery();
});

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

document.addEventListener('DOMContentLoaded', checkExistingSession);

console.log('✅ Sistema de autenticación inicializado');
