// Actualizar vista previa en tiempo real
const inputs = document.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('input', actualizarVistaPrevia);
});

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

function guardarFicha() {
    const form = document.getElementById('fichaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const fichaData = {
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        tipo: document.getElementById('tipo').value,
        clase: document.getElementById('clase').value,
        serialCarroceria: document.getElementById('serialCarroceria').value,
        color: document.getElementById('color').value,
        placa: document.getElementById('placa').value,
        facsimilar: document.getElementById('facsimilar').value,
        serialMotor: document.getElementById('serialMotor').value,
        dependencia: document.getElementById('dependencia').value,
        estatus: document.getElementById('estatus').value,
        causa: document.getElementById('causa').value,
        mecanica: document.getElementById('mecanica').value,
        diagnostico: document.getElementById('diagnostico').value,
        ubicacion: document.getElementById('ubicacion').value,
        tapiceria: document.getElementById('tapiceria').value,
        cauchos: document.getElementById('cauchos').value,
        luces: document.getElementById('luces').value,
        observaciones: document.getElementById('observaciones').value,
        fechaCreacion: new Date().toISOString()
    };
    
    // Guardar en localStorage
    let fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
    fichas.push(fichaData);
    localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));
    
    alert('✅ Ficha técnica guardada exitosamente');
}

function limpiarFormulario() {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
        actualizarVistaPrevia();
    }
}

// Inicializar
actualizarVistaPrevia();
