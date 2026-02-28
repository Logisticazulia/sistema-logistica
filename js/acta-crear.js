/**
 * CREAR ACTA DE ASIGNACIÓN
 */

let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando creación de acta...');
    
    // Inicializar Supabase
    supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_KEY
    );
    
    // Cargar usuario
    await cargarUsuario();
    
    // Configurar logout
    configurarLogout();
    
    // Configurar formulario
    const form = document.getElementById('actaForm');
    if (form) {
        form.addEventListener('submit', guardarActa);
    }
    
    // Buscar vehículo al ingresar placa
    const placaInput = document.getElementById('placa');
    if (placaInput) {
        placaInput.addEventListener('blur', buscarVehiculoPorPlaca);
    }
    
    console.log('✅ Creación de acta inicializada');
});

async function cargarUsuario() {
    try {
        const sessionData = await supabaseClient.auth.getSession();
        const session = sessionData.data ? sessionData.data.session : null;
        
        const userEmail = document.getElementById('userEmail');
        if (session && session.user && session.user.email) {
            userEmail.textContent = session.user.email;
        }
    } catch (err) {
        console.error('Error cargando usuario:', err);
    }
}

function configurarLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
        });
    }
}

async function buscarVehiculoPorPlaca() {
    const placaInput = document.getElementById('placa');
    const placa = placaInput.value.trim().toUpperCase();
    
    if (!placa) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('marca, modelo, tipo, clase')
            .eq('placa', placa)
            .limit(1);
        
        if (error) throw error;
        
        const vehiculoInfo = document.getElementById('vehiculoInfo');
        if (data && data.length > 0) {
            const v = data[0];
            vehiculoInfo.value = `${v.marca || ''} ${v.modelo || ''} - ${v.tipo || ''}`;
        } else {
            vehiculoInfo.value = '⚠️ Vehículo no encontrado en la base de datos';
        }
    } catch (error) {
        console.error('Error buscando vehículo:', error);
    }
}

async function guardarActa(event) {
    event.preventDefault();
    
    try {
        const acta = {
            numero_acta: document.getElementById('numeroActa').value.trim().toUpperCase(),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            cedula_funcionario: document.getElementById('cedulaFuncionario').value.trim(),
            nombre_funcionario: document.getElementById('nombreFuncionario').value.trim(),
            cargo: document.getElementById('cargo').value.trim(),
            unidad_administrativa: document.getElementById('unidadAdmin').value.trim(),
            fecha_asignacion: document.getElementById('fechaAsignacion').value,
            estatus: document.getElementById('estatus').value,
            observaciones: document.getElementById('observaciones').value.trim(),
            creado_por: document.getElementById('userEmail').textContent,
            fecha_creacion: new Date().toISOString()
        };
        
        console.log('📝 Guardando acta:', acta);
        
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .insert([acta])
            .select();
        
        if (error) throw error;
        
        alert('✅ Acta de asignación registrada exitosamente\nN° Acta: ' + acta.numero_acta);
        
        // Limpiar formulario
        document.getElementById('actaForm').reset();
        
    } catch (error) {
        console.error('❌ Error guardando acta:', error);
        alert('❌ Error al guardar: ' + error.message);
    }
}

console.log('✅ Script acta-crear.js cargado');
