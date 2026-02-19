/**
 * ========================================
 * AUTH.JS - Lógica de Autenticación con Supabase
 * ========================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Verificar que Supabase esté disponible
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase no está cargado. Verifica el CDN.');
    return;
  }

  // Inicializar cliente de Supabase usando config.js
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan credenciales de Supabase en config.js');
    return;
  }

  const _supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  console.log('✅ Cliente Supabase inicializado');

  // Referencias al formulario
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const formMessage = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');

  // Función para mostrar mensajes
  const showMessage = (message, type = 'error') => {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = `form-message ${type} show`;
    // Ocultar mensaje después de 5 segundos
    setTimeout(() => {
      formMessage.classList.remove('show');
    }, 5000);
  };

  // Función para activar/desactivar estado de carga
  const setLoading = (loading) => {
    if (loading) {
      btnText.hidden = true;
      btnLoader.hidden = false;
      submitBtn.disabled = true;
    } else {
      btnText.hidden = false;
      btnLoader.hidden = true;
      submitBtn.disabled = false;
    }
  };

  // Manejar envío del formulario
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Validaciones básicas
      if (!email || !password) {
        showMessage('Por favor, completa todos los campos', 'error');
        return;
      }

      if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }

      setLoading(true);
      showMessage('', 'success'); // Limpiar mensajes previos

      try {
        // Intentar iniciar sesión con Supabase Auth
        const { data, error } = await _supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Login exitoso
        console.log('✅ Usuario autenticado:', data.user);
        showMessage('✅ Inicio de sesión exitoso. Redirigiendo...', 'success');
        
        // Guardar sesión si es necesario
        if (data.user) {
          localStorage.setItem('user_email', data.user.email);
        }
        
        // Redirigir al dashboard (ajusta la ruta según tu estructura)
        setTimeout(() => {
          window.location.href = 'dashboard.html'; // o '/sistema-logistica/dashboard.html'
        }, 1500);

      } catch (err) {
        console.error('❌ Error de autenticación:', err);
        
        // Mensajes amigables según el tipo de error
        let mensaje = 'Error al iniciar sesión. Verifica tus credenciales.';
        
        if (err.message?.includes('Invalid login credentials')) {
          mensaje = 'Correo o contraseña incorrectos.';
        } else if (err.message?.includes('Email not confirmed')) {
          mensaje = 'Por favor, confirma tu correo electrónico antes de continuar.';
        }
        
        showMessage(mensaje, 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  // Verificar sesión activa al cargar la página (opcional)
  const checkSession = async () => {
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session?.user) {
        console.log('✅ Sesión activa detectada');
        // window.location.href = 'dashboard.html'; // Descomenta si quieres redirección automática
      }
    } catch (error) {
      console.warn('⚠️ No se pudo verificar la sesión:', error);
    }
  };
  
  checkSession();
});
