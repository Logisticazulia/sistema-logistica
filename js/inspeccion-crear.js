// js/inspeccion-crear.js
document.addEventListener('DOMContentLoaded', async () => {
  
  // 🔹 Esperar que Supabase esté disponible
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }
    
    if (!window.supabase) {
      console.warn('⚠️ Supabase no cargó');
      return null;
    }
    
    // Si ya está inicializado, retornarlo
    if (window.supabase.auth) return window.supabase;
    
    // Intentar inicializar con variables globales
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
        return window.supabase;
      } catch (err) {
        console.error('❌ Error inicializando Supabase:', err);
        return null;
      }
    }
    return null;
  }

  // 🔹 Inicializar
  const supabase = await initSupabase();
  
  // 🔹 Mostrar email del usuario si está autenticado
  if (supabase?.auth) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const el = document.getElementById('userEmail');
        if (el) el.textContent = user.email || 'Usuario';
      }
    } catch (err) {
      console.warn('⚠️ Sesión no verificada:', err.message);
    }
  }

  // 🔹 Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
      window.location.href = '../login.html';
    });
  }

  // 🔹 Efecto hover en botones de selección (opcional)
  const vehicleBtns = document.querySelectorAll('.vehicle-btn');
  vehicleBtns.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
    });
    btn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });

  console.log('✅ inspeccion-crear.js cargado');
});
