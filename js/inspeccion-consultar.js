document.addEventListener('DOMContentLoaded', async () => {
    // 🔹 1. INICIALIZACIÓN DE SUPABASE
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
        if (window.supabase.auth) return window.supabase;
        const createFn = window.supabase.createClient || window.createClient;
        if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
            try { 
                window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY); 
                return window.supabase; 
            } catch (err) { 
                console.error('❌ Error init Supabase:', err); 
                return null; 
            }
        }
        return null;
    }

    const supabase = await initSupabase();
    
    // 🔹 2. MOSTRAR EMAIL DEL USUARIO
    if (supabase) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const el = document.getElementById('userEmail');
            if (el && user) el.textContent = user.email || 'Usuario';
        } catch (err) { 
            console.warn('Sesión no verificada'); 
        }
    }

    // 🔹 3. CERRAR SESIÓN
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabase) await supabase.auth.signOut();
            window.location.href = '../login.html';
        });
    }

    // ✅ Página de selección: no requiere más lógica inicial
    console.log('✅ inspeccion-consultar.js cargado');
});
