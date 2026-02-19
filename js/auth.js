/**
 * AUTENTICACIÓN - LOGIN
 */
const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
    
    // Estado de carga
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').textContent = 'Verificando...';
    
    try {
        const {  user, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Verificar perfil
        const {  perfil } = await supabase
            .from('perfiles')
            .select('*, roles(nombre)')
            .eq('id', user.id)
            .single();
        
        if (!perfil || !perfil.activo) {
            throw new Error('Usuario no autorizado o inactivo');
        }
        
        // Redirigir según rol
        formMessage.style.display = 'flex';
        formMessage.style.background = '#d1fae5';
        formMessage.style.color = '#059669';
        formMessage.textContent = '✅ Inicio de sesión exitoso. Redirigiendo...';
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        formMessage.style.display = 'flex';
        formMessage.style.background = '#fee2e2';
        formMessage.style.color = '#dc2626';
        formMessage.textContent = '❌ Error: ' + error.message;
        
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = 'Ingresar';
    }
});
