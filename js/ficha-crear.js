// ============================================
// FICHA TÉCNICA DE VEHÍCULOS - LÓGICA
// ============================================

// Array para almacenar las imágenes en base64
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// Actualizar vista previa en tiempo real
const inputs = document.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('input', actualizarVistaPrevia);
});

// Función para actualizar la vista previa
function actualizarVistaPrevia() {
    document.getElementById('previewMarca').textContent = document.getElementById('marca').value || '';
    document.getElementById('previewModelo').textContent = document.getElementById('modelo').value || '';
    document.getElementById('previewTipo').textContent = document.getElementById('tipo').value || '';
    document.getElementById('previewClase').textContent = document.getElementById('clase').value || '';
    document.getElementById('previewSerialCarroceria').textContent = document.getElementById('serialCarroceria').value || '';
    document.getElementById('previewColor').textContent = document.getElementById('color').value || '';
    document.getElementById('previewPlaca').textContent = document.getElementById('placa').value || '';
    document.getElementById('previewFacsimilar').textContent = document.getElementById('facsimilar').value || '';
    document.getElementById('previewSerialMotor').textContent = document.getElementById('serialMotor').value || '';
    document.getElementById('previewDependencia').textContent = document.getElementById('dependencia').value || '';
    document.getElementById('previewEstatus').textContent = document.getElementById('estatus').value || '';
    document.getElementById('previewCausa').textContent = document.getElementById('causa').value || '';
    document.getElementById('previewMecanica').textContent = document.getElementById('mecanica').value || '';
    document.getElementById('previewDiagnostico').textContent = document.getElementById('diagnostico').value || '';
    document.getElementById('previewUbicacion').textContent = document.getElementById('ubicacion').value || '';
    document.getElementById('previewTapiceria').textContent = document.getElementById('tapiceria').value || '';
    document.getElementById('previewCauchos').textContent = document.getElementById('cauchos').value || '';
    document.getElementById('previewLuces').textContent = document.getElementById('luces').value || '';
    document.getElementById('previewObservaciones').textContent = document.getElementById('observaciones').value || '';
}

// Función para previsualizar imágenes
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Actualizar vista previa en el formulario
            const img = document.getElementById(previewId);
            const container = document.getElementById(previewId + 'Container');
            const placeholder = container.querySelector('.placeholder');
            
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            
            // Guardar en base64
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            
            // Actualizar vista previa en la ficha
            actualizarFotosPreview();
        };
        
        reader.readAsDataURL(file);
    }
}

// Función para actualizar las fotos en la vista previa de la ficha
function actualizarFotosPreview() {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewImg' + i);
        const box = document.getElementById('previewBox' + i);
        const span = box.querySelector('span');
        
        if (fotosData['foto' + i]) {
            img.src = fotosData['foto' + i];
            img.style.display = 'block';
            span.style.display = 'none';
        } else {
            img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

// Función para guardar la ficha
function guardarFicha() {
    const form = document.getElementById('fichaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }

    const fichaData = {
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        tipo: document.getElementById('tipo').value,
        clase: document.getElementById('clase').value,
        serialCarroceria: document.getElementById('serialCarroceria').value,
        serialMotor: document.getElementById('serialMotor').value,
        color: document.getElementById('color').value,
        placa: document.getElementById('placa').value,
        facsimilar: document.getElementById('facsimilar').value,
        estatus: document.getElementById('estatus').value,
        dependencia: document.getElementById('dependencia').value,
        causa: document.getElementById('causa').value,
        mecanica: document.getElementById('mecanica').value,
        diagnostico: document.getElementById('diagnostico').value,
        ubicacion: document.getElementById('ubicacion').value,
        tapiceria: document.getElementById('tapiceria').value,
        cauchos: document.getElementById('cauchos').value,
        luces: document.getElementById('luces').value,
        observaciones: document.getElementById('observaciones').value,
        fotos: fotosData,
        fechaCreacion: new Date().toISOString()
    };

    // Guardar en localStorage
    let fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
    fichas.push(fichaData);
    localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));

    mostrarAlerta('✅ Ficha técnica guardada exitosamente', 'success');
}

// Función para limpiar el formulario
function limpiarFormulario() {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
        // Limpiar vista previa de textos
        actualizarVistaPrevia();
        
        // Limpiar vista previa de fotos
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById('foto' + i);
            const img = document.getElementById('previewFoto' + i);
            const container = document.getElementById('previewFoto' + i + 'Container');
            const placeholder = container.querySelector('.placeholder');
            
            input.value = '';
            img.src = '';
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            
            fotosData['foto' + i] = null;
        }
        
        // Limpiar vista previa en la ficha
        actualizarFotosPreview();
        
        mostrarAlerta('🔄 Formulario limpiado', 'success');
    }
}

// Función para imprimir
function imprimirFicha() {
    window.print();
}

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    let alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'alertMessage';
        alertDiv.style.cssText = 'padding: 12px; border-radius: 8px; margin: 16px 0; display: none;';
        document.querySelector('.form-section').insertBefore(alertDiv, document.querySelector('.form-section h2'));
    }

    alertDiv.textContent = mensaje;
    alertDiv.className = tipo === 'success' ? 'alert-success' : 'alert-error';
    alertDiv.style.backgroundColor = tipo === 'success' ? '#e8f5e9' : '#ffebee';
    alertDiv.style.color = tipo === 'success' ? '#2e7d32' : '#c62828';
    alertDiv.style.display = 'block';

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 3000);
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();

    // Event listeners para botones
    const btnGuardar = document.getElementById('btnGuardar');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const logoutBtn = document.getElementById('logoutBtn');

    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarFicha);
    }

    if (btnImprimir) {
        btnImprimir.addEventListener('click', imprimirFicha);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFormulario);
    }

    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }

    // Cargar información del usuario
    cargarUsuario();
});

// Función para cargar información del usuario
async function cargarUsuario() {
    try {
        if (typeof supabase !== 'undefined') {
            const { data } = await supabase.auth.getSession();
            const session = data?.session;
            if (session) {
                const {  perfilData } = await supabase
                    .from('perfiles')
                    .select('email')
                    .eq('id', session.user.id)
                    .single();

                if (perfilData) {
                    document.getElementById('userEmail').textContent = perfilData.email || 'usuario@institucion.com';
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
