// ============================================
// FICHA TÉCNICA DE VEHÍCULOS - LÓGICA COMPLETA
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL, 
    window.SUPABASE_KEY
);

// Array para almacenar las imágenes en base64
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// Vehículo seleccionado
let vehiculoSeleccionado = null;

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================

// Buscar vehículo en Supabase
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        // ✅ CONSULTA CON OR PARA MÚLTIPLES CAMPOS
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm}`)
            .limit(1);
        
        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
            vehiculoSeleccionado = null;
            return;
        }
        
        // ✅ VEHÍCULO ENCONTRADO
        vehiculoSeleccionado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
        
        // Llenar formulario con los datos encontrados
        llenarFormulario(vehiculoSeleccionado);
        
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - Placa: ${vehiculoSeleccionado.placa}`, 'success');
        
        // Actualizar vista previa
        actualizarVistaPrevia();
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    }
}

// Llenar el formulario con los datos del vehículo
function llenarFormulario(vehiculo) {
    // Mapeo de campos de la BD al formulario
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
        'estatus': 'estatus',
        'situacion': 'estatus',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones',
        'ubicacion_fisica': 'ubicacion'
    };
    
    // Llenar campos
    Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField]) {
            if (element.tagName === 'SELECT') {
                // Para selects, buscar la opción que coincida
                const options = Array.from(element.options);
                const matchingOption = options.find(opt =>
                    opt.value.toUpperCase() === vehiculo[dbField].toUpperCase()
                );
                if (matchingOption) {
                    element.value = matchingOption.value;
                }
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    
    // Actualizar vista previa
    actualizarVistaPrevia();
}

// Limpiar búsqueda y formulario
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
    vehiculoSeleccionado = null;
}

// ============================================
// FUNCIONES DE VISTA PREVIA
// ============================================

// Actualizar vista previa en tiempo real
function actualizarVistaPrevia() {
    const campos = {
        'marca': 'previewMarca',
        'modelo': 'previewModelo',
        'tipo': 'previewTipo',
        'clase': 'previewClase',
        'serialCarroceria': 'previewSerialCarroceria',
        'color': 'previewColor',
        'placa': 'previewPlaca',
        'facsimilar': 'previewFacsimilar',
        'serialMotor': 'previewSerialMotor',
        'dependencia': 'previewDependencia',
        'estatus': 'previewEstatus',
        'causa': 'previewCausa',
        'mecanica': 'previewMecanica',
        'diagnostico': 'previewDiagnostico',
        'ubicacion': 'previewUbicacion',
        'tapiceria': 'previewTapiceria',
        'cauchos': 'previewCauchos',
        'luces': 'previewLuces',
        'observaciones': 'previewObservaciones'
    };
    
    Object.entries(campos).forEach(([formField, previewField]) => {
        const element = document.getElementById(formField);
        const preview = document.getElementById(previewField);
        if (element && preview) {
            preview.textContent = element.value || '';
        }
    });
}

// Previsualizar imágenes
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
            return;
        }
        
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('⚠️ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
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

// Actualizar las fotos en la vista previa de la ficha
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

// ============================================
// FUNCIONES DE GUARDADO
// ============================================

// Guardar la ficha técnica
async function guardarFicha() {
    // Validar que haya un vehículo seleccionado
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar y seleccionar un vehículo', 'error');
        return;
    }
    
    // Validar formulario
    const form = document.getElementById('fichaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar que haya al menos una foto
    const fotosCount = Object.values(fotosData).filter(f => f !== null).length;
    if (fotosCount === 0) {
        mostrarAlerta('⚠️ Debe cargar al menos una foto del vehículo', 'error');
        return;
    }
    
    console.log('💾 Guardando ficha técnica...');
    
    try {
        // Preparar datos de la ficha
        const fichaData = {
            // ID del vehículo original
            vehiculo_id: vehiculoSeleccionado.id,
            
            // Datos del vehículo (copiados)
            placa: vehiculoSeleccionado.placa,
            facsimil: vehiculoSeleccionado.facsimil,
            marca: vehiculoSeleccionado.marca,
            modelo: vehiculoSeleccionado.modelo,
            tipo: vehiculoSeleccionado.tipo,
            clase: vehiculoSeleccionado.clase,
            color: vehiculoSeleccionado.color,
            s_carroceria: vehiculoSeleccionado.s_carroceria,
            s_motor: vehiculoSeleccionado.s_motor,
            
            // Datos específicos de la ficha
            estatus_ficha: document.getElementById('estatus').value,
            dependencia: document.getElementById('dependencia').value,
            
            // Información técnico mecánica
            causa: document.getElementById('causa').value || null,
            mecanica: document.getElementById('mecanica').value || null,
            diagnostico: document.getElementById('diagnostico').value || null,
            ubicacion: document.getElementById('ubicacion').value || null,
            tapiceria: document.getElementById('tapiceria').value || null,
            cauchos: document.getElementById('cauchos').value || null,
            luces: document.getElementById('luces').value || null,
            
            // Observaciones
            observaciones: document.getElementById('observaciones').value || null,
            
            // Fotos en base64
            foto1: fotosData.foto1,
            foto2: fotosData.foto2,
            foto3: fotosData.foto3,
            foto4: fotosData.foto4,
            
            // Metadata
            fecha_creacion: new Date().toISOString(),
            creado_por: await obtenerUsuarioActual()
        };
        
        console.log('📝 Datos a guardar:', fichaData);
        
        // ✅ INSERTAR EN TABLA fichas_tecnicas
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .insert([fichaData])
            .select();
        
        if (error) {
            console.error('❌ Error al guardar:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Ficha guardada:', data);
        mostrarAlerta('✅ Ficha técnica guardada exitosamente', 'success');
        
        // Opcional: Imprimir automáticamente
        // setTimeout(() => imprimirFicha(), 1000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    }
}

// Obtener usuario actual
async function obtenerUsuarioActual() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session?.user?.email || 'usuario@institucion.com';
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return 'usuario@institucion.com';
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// Imprimir ficha
function imprimirFicha() {
    window.print();
}

// Limpiar formulario
function limpiarFormulario() {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
        limpiarBusqueda();
        mostrarAlerta('🔄 Formulario limpiado', 'success');
    }
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    // Inicializar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Event listeners para inputs (actualización en tiempo real)
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
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
        logoutBtn.addEventListener('click', async () => {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            }
        });
    }
    
    // Cargar información del usuario
    cargarUsuario();
    
    console.log('✅ Ficha técnica inicializada');
});

// Cargar información del usuario
async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
            document.getElementById('userEmail').textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
