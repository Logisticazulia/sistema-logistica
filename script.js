// 1. Inicializar el cliente de Supabase
// Reemplaza estos valores con los de tu proyecto
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Seleccionar elementos del HTML
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('message');

// 3. Escuchar el evento "submit" del formulario
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const email = emailInput.value;
    const password = passwordInput.value;

    // Limpiar mensajes anteriores
    messageElement.textContent = 'Iniciando sesión...';
    messageElement.style.color = '#333';

    // 4. Llamar a Supabase para autenticar
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    // 5. Manejar la respuesta
    if (error) {
        messageElement.textContent = 'Error: ' + error.message;
        messageElement.style.color = 'var(--error-color)';
    } else {
        messageElement.textContent = '¡Login exitoso! Redirigiendo...';
        messageElement.style.color = 'green';
        
        // Aquí redirigirías a tu página principal (dashboard.html)
        // Por ahora, solo mostramos un alerta
        setTimeout(() => {
            alert("Bienvenido al sistema. Aquí iría la redirección al dashboard.");
            // window.location.href = "dashboard.html"; 
        }, 1000);
    }
});
