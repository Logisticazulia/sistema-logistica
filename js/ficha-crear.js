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
        
        vehiculoSeleccionado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
        
        llenarFormulario(vehiculoSeleccionado);
        
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - Placa: ${vehiculoSeleccionado.placa}`, 'success');
        
        actualizarVistaPrevia();
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    }
}

function llenarFormulario(vehiculo) {
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
    
    Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField]) {
            if (element.tagName === 'SELECT') {
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
    
    actualizarVistaPrevia();
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    document.getElementById('fichaForm').reset();
    actualizarVistaPrevia();
    
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

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (!file.type.startsWith('image/')) {
            mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('⚠️ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(previewId);
            const container = document.getElementById(previewId + 'Container');
            const placeholder = container.querySelector('.placeholder');
            
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            
            actualizarFotosPreview();
        };
        reader.readAsDataURL(file);
    }
}

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
// ✅ CORRECCIÓN 4: GUARDAR CON STORAGE
// ============================================

async function guardarFicha() {
    // ✅ CORRECCIÓN 2: SCROLL AL TOP PARA VER MENSAJES
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
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
        // ✅ SUBIR FOTOS A SUPABASE STORAGE
        const fotoUrls = [];
        const bucketName = 'fichas-tecnicas';
        
        for (let i = 1; i <= 4; i++) {
            if (fotosData['foto' + i]) {
                // Convertir base64 a blob
                const base64Data = fotosData['foto' + i];
                const blob = await fetch(base64Data).then(r => r.blob());
                
                // Nombre único para cada foto
                const fileName = `ficha_${Date.now()}_foto${i}_${vehiculoSeleccionado.placa}.jpg`;
                
                // Subir a Supabase Storage
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from(bucketName)
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error(`Error subiendo foto ${i}:`, uploadError);
                    throw uploadError;
                }
                
                // Obtener URL pública
                const { data: { publicUrl } } = supabaseClient
                    .storage
                    .from(bucketName)
                    .getPublicUrl(fileName);
                
                fotoUrls.push(publicUrl);
                console.log(`✅ Foto ${i} subida:`, publicUrl);
            }
        }
        
        // Preparar datos de la ficha
        const fichaData = {
            vehiculo_id: vehiculoSeleccionado.id,
            placa: vehiculoSeleccionado.placa,
            facsimil: vehiculoSeleccionado.facsimil,
            marca: vehiculoSeleccionado.marca,
            modelo: vehiculoSeleccionado.modelo,
            tipo: vehiculoSeleccionado.tipo,
            clase: vehiculoSeleccionado.clase,
            color: vehiculoSeleccionado.color,
            s_carroceria: vehiculoSeleccionado.s_carroceria,
            s_motor: vehiculoSeleccionado.s_motor,
            estatus_ficha: document.getElementById('estatus').value,
            dependencia: document.getElementById('dependencia').value,
            causa: document.getElementById('causa').value || null,
            mecanica: document.getElementById('mecanica').value || null,
            diagnostico: document.getElementById('diagnostico').value || null,
            ubicacion: document.getElementById('ubicacion').value || null,
            tapiceria: document.getElementById('tapiceria').value || null,
            cauchos: document.getElementById('cauchos').value || null,
            luces: document.getElementById('luces').value || null,
            observaciones: document.getElementById('observaciones').value || null,
            foto1_url: fotoUrls[0] || null,
            foto2_url: fotoUrls[1] || null,
            foto3_url: fotoUrls[2] || null,
            foto4_url: fotoUrls[3] || null,
            fecha_creacion: new Date().toISOString(),
            creado_por: await obtenerUsuarioActual()
        };
        
        console.log('📝 Datos a guardar:', fichaData);
        
        // Insertar en tabla fichas_tecnicas
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
        
        // ✅ CORRECCIÓN 3: LIMPIAR FORMULARIO Y VISTA PREVIA DESPUÉS DE GUARDAR
        setTimeout(() => {
            limpiarTodo();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    }
}

// ✅ CORRECCIÓN 3: FUNCIÓN PARA LIMPIAR TODO
function limpiarTodo() {
    // Limpiar búsqueda
    document.getElementById('searchInput').value = '';
    
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
    
    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Formulario limpiado, listo para nueva búsqueda');
}

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

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    // ✅ CORRECCIÓN 2: SCROLL AL TOP PARA VER ALERTA
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function imprimirFicha() {
    window.print();
}

function limpiarFormulario() {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
        limpiarTodo();
        mostrarAlerta('🔄 Formulario limpiado', 'success');
    }
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
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
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarVehiculo();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            }
        });
    }
    
    cargarUsuario();
    
    console.log('✅ Ficha técnica inicializada');
});

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
