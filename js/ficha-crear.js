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

// Base de datos de vehículos (se cargará desde CSV o localStorage)
let vehiculosDB = [];

// Actualizar vista previa en tiempo real
const inputs = document.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
    input.addEventListener('input', actualizarVistaPrevia);
});

// Función para cargar la base de datos desde CSV
async function cargarBaseDeDatos() {
    try {
        // Intentar cargar desde localStorage primero
        const stored = localStorage.getItem('vehiculosDB');
        if (stored) {
            vehiculosDB = JSON.parse(stored);
            console.log('✅ Base de datos cargada desde localStorage:', vehiculosDB.length, 'vehículos');
            return;
        }

        // Si no hay en localStorage, cargar desde CSV
        const response = await fetch('../data/vehiculos_rows.csv');
        const csvText = await response.text();
        vehiculosDB = parseCSV(csvText);
        
        // Guardar en localStorage para futuras consultas
        localStorage.setItem('vehiculosDB', JSON.stringify(vehiculosDB));
        console.log('✅ Base de datos cargada desde CSV:', vehiculosDB.length, 'vehículos');
    } catch (error) {
        console.error('❌ Error al cargar base de datos:', error);
        mostrarAlerta('⚠️ No se pudo cargar la base de datos de vehículos', 'error');
    }
}

// Función para parsear CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const obj = {};
        
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        
        result.push(obj);
    }
    
    return result;
}

// Función para parsear una línea de CSV considerando comillas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Función para buscar vehículo
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    // Cargar base de datos si no está cargada
    if (vehiculosDB.length === 0) {
        mostrarAlerta('⏳ Cargando base de datos...', 'info');
        await cargarBaseDeDatos();
    }

    // Buscar en placa, facsimilar, serial carroceria y serial motor
    const vehiculo = vehiculosDB.find(v => 
        (v.placa && v.placa.toUpperCase() === searchTerm) ||
        (v.facsimil && v.facsimil.toUpperCase() === searchTerm) ||
        (v.s_carroceria && v.s_carroceria.toUpperCase() === searchTerm) ||
        (v.s_motor && v.s_motor.toUpperCase() === searchTerm)
    );

    if (vehiculo) {
        // Llenar formulario con los datos encontrados
        llenarFormulario(vehiculo);
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`, 'success');
    } else {
        mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
    }
}

// Función para llenar el formulario con los datos del vehículo
function llenarFormulario(vehiculo) {
    // Mapear campos del CSV al formulario
    const mapeoCampos = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 'serialCarroceria',
        's_motor': 'serialMotor',
        'placa': 'placa',
        'facsimil': 'facsimilar',
        'situacion': 'estatus',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones',
        'ubicacion_fisica': 'ubicacion'
    };

    // Llenar campos
    Object.entries(mapeoCampos).forEach(([csvField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[csvField]) {
            if (element.tagName === 'SELECT') {
                // Para selects, buscar la opción que coincida
                const options = Array.from(element.options);
                const matchingOption = options.find(opt => 
                    opt.value.toUpperCase() === vehiculo[csvField].toUpperCase()
                );
                if (matchingOption) {
                    element.value = matchingOption.value;
                }
            } else {
                element.value = vehiculo[csvField];
            }
        }
    });

    // Actualizar vista previa
    actualizarVistaPrevia();
}

// Función para limpiar búsqueda
function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    
    // Limpiar formulario
    document.getElementById('fichaForm').reset();
    
    // Limpiar vista previa
    actualizarVistaPrevia();
    
    // Limpiar fotos
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container.querySelector('.placeholder');
        
        if (input) input.value = '';
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';
        
        fotosData['foto' + i] = null;
    }
    
    actualizarFotosPreview();
}

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
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

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Cargar base de datos al iniciar
    cargarBaseDeDatos();
    
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

    // Permitir buscar con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarVehiculo();
            }
        });
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
                const { data: perfilData, error: perfilError } = await supabase
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
