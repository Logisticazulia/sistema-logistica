/**
* ============================================
* FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN SUPABASE
* ============================================
*/

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// ================= ESTADO =================
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

const CAMPOS_BLOQUEADOS = [
    'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria',
    'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia'
];

// ================= FUNCIONES DE UTILIDAD =================
// ================= FUNCIONES DE UTILIDAD =================
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    
    // ✅ SCROLL AUTOMÁTICO HACIA LA ALERTA
    alertDiv.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ================= GUARDAR FICHA =================
async function guardarFicha() {
    const form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }

    const camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    let camposFaltantes = [];
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });

    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Los siguientes campos son obligatorios: ' + camposFaltantes.join(', '), 'error');
        return;
    }

    // ✅ MENSAJE DE "GUARDANDO..."
    mostrarAlerta('⏳ Guardando ficha técnica en base de datos...', 'info');

    try {
        // 1. Preparar datos para Supabase
        const placaValue = (document.getElementById('placa')?.value || '').toUpperCase();
        
        const fichaData = {
            vehiculo_id: null,
            placa: placaValue,
            facsimil: (document.getElementById('facsimil')?.value || '').toUpperCase(),
            marca: (document.getElementById('marca')?.value || '').toUpperCase(),
            modelo: (document.getElementById('modelo')?.value || '').toUpperCase(),
            tipo: (document.getElementById('tipo')?.value || '').toUpperCase(),
            clase: (document.getElementById('clase')?.value || '').toUpperCase(),
            color: (document.getElementById('color')?.value || '').toUpperCase(),
            s_carroceria: (document.getElementById('serialCarroceria')?.value || '').toUpperCase(),
            s_motor: (document.getElementById('serialMotor')?.value || '').toUpperCase(),
            estatus_ficha: (document.getElementById('estatus')?.value || '').toUpperCase(),
            dependencia: (document.getElementById('dependencia')?.value || '').toUpperCase(),
            causa: document.getElementById('causa')?.value || '',
            mecanica: document.getElementById('mecanica')?.value || '',
            diagnostico: document.getElementById('diagnostico')?.value || '',
            ubicacion: document.getElementById('ubicacion')?.value || '',
            tapiceria: document.getElementById('tapiceria')?.value || '',
            cauchos: document.getElementById('cauchos')?.value || '',
            luces: document.getElementById('luces')?.value || '',
            observaciones: document.getElementById('observaciones')?.value || '',
            creado_por: document.getElementById('userEmail')?.textContent || 'usuario@institucion.com',
            fecha_creacion: new Date().toISOString()
        };

        // 2. Subir fotos a Supabase Storage
        const fotoUrls = {
            foto1_url: null,
            foto2_url: null,
            foto3_url: null,
            foto4_url: null
        };

        const bucketName = 'fichas-tecnicas';
        
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById('foto' + i);
            if (input && input.files && input.files[0]) {
                const file = input.files[0];
                const fileName = `ficha_${Date.now()}_foto${i}_${placaValue || 'sinplaca'}.jpg`;
                
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from(bucketName)
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (!uploadError) {
                    const { data: urlData } = supabaseClient
                        .storage
                        .from(bucketName)
                        .getPublicUrl(fileName);
                    
                    fotoUrls['foto' + i + '_url'] = urlData.publicUrl;
                }
            }
        }

        // 3. Insertar en Supabase
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .insert([{
                ...fichaData,
                ...fotoUrls
            }])
            .select();

        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }

        console.log('✅ Ficha guardada exitosamente:', data);
        
        // ✅ MENSAJE DE ÉXITO CON SCROLL
        mostrarAlerta('✅ ¡FICHA TÉCNICA GUARDADA EXITOSAMENTE EN BASE DE DATOS!', 'success');
        
        // ✅ SCROLL ADICIONAL PARA ASEGURAR VISIBILIDAD
        setTimeout(() => {
            const alertDiv = document.getElementById('searchAlert');
            if (alertDiv) {
                alertDiv.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 100);

        // 4. Limpiar formulario después de guardar
        setTimeout(() => {
            limpiarBusqueda();
        }, 2000);

    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}
// ================= ACTUALIZAR FOTOS PREVIEW =================
function actualizarFotosPreview() {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewImg' + i);
        const box = document.getElementById('previewBox' + i);
        const span = box?.querySelector('span');
        if (fotosData['foto' + i] && img && box && span) {
            img.src = fotosData['foto' + i];
            img.style.display = 'block';
            span.style.display = 'none';
        } else if (span) {
            if (img) img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

// ================= PREVIEW IMAGEN =================
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
            const placeholder = container?.querySelector('.placeholder');
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            actualizarFotosPreview();
        };
        reader.onerror = function() {
            mostrarAlerta('❌ Error al leer la imagen', 'error');
        };
        reader.readAsDataURL(file);
    }
}

// ================= BUSCAR VEHÍCULO =================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    const searchTerm = limpiarTexto(searchInput.value);
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    console.log('🔍 Buscando vehículo en Supabase:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm}`)
            .limit(1);
        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
            return;
        }
        console.log('📊 Resultado:', data?.length || 0, 'vehículo(s) encontrado(s)');
        if (!data || data.length === 0) {
            mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
            return;
        }
        const vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        llenarFormulario(vehiculo);
        bloquearCamposPrincipales();
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`, 'success');
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

// ================= LLENAR FORMULARIO =================
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
        'facsimil': 'facsimil',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones'
    };
    Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField]) {
            if (element.tagName === 'SELECT') {
                const matchingOption = Array.from(element.options).find(opt =>
                    opt.value.toUpperCase() === vehiculo[dbField].toUpperCase()
                );
                if (matchingOption) element.value = matchingOption.value;
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    const estatusInput = document.getElementById('estatus');
    if (estatusInput) {
        const valorEstatus = vehiculo.estatus || vehiculo.situacion || '';
        if (valorEstatus) {
            const valorNormalizado = valorEstatus.toUpperCase()
                .replace('OPERATIVA', 'OPERATIVO')
                .replace('INOPERATIVA', 'INOPERATIVO')
                .replace('DESINCORPORADA', 'DESINCORPORADO');
            const matchingOption = Array.from(estatusInput.options).find(opt =>
                opt.value.toUpperCase() === valorNormalizado
            );
            if (matchingOption) {
                estatusInput.value = matchingOption.value;
            } else {
                estatusInput.value = valorEstatus.toUpperCase();
            }
        }
    }
    actualizarVistaPrevia();
}

// ================= BLOQUEAR CAMPOS =================
function bloquearCamposPrincipales() {
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
}

// ================= DESBLOQUEAR CAMPOS =================
function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('locked');
            }
        }
    });
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    desbloquearCampos();
    actualizarVistaPrevia();
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container?.querySelector('.placeholder');
        if (input) input.value = '';
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';
        fotosData['foto' + i] = null;
    }
    actualizarFotosPreview();
    mostrarAlerta('🔄 Formulario limpiado', 'info');
}

// ================= SUBIR FOTO A SUPABASE =================
async function subirFotoSupabase(file, placa, numeroFoto) {
    try {
        const bucketName = 'fichas-tecnicas';
        const fileName = `ficha_${Date.now()}_foto${numeroFoto}_${placa || 'sinplaca'}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) {
            console.error(`❌ Error subiendo foto ${numeroFoto}:`, uploadError);
            return null;
        }
        
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from(bucketName)
            .getPublicUrl(fileName);
        
        console.log(`✅ Foto ${numeroFoto} subida:`, publicUrl);
        return publicUrl;
    } catch (error) {
        console.error(`❌ Error en subirFotoSupabase:`, error);
        return null;
    }
}

// ================= GUARDAR FICHA EN SUPABASE =================
async function guardarFicha() {
    const form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }

    const camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    let camposFaltantes = [];
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });

    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Los siguientes campos son obligatorios: ' + camposFaltantes.join(', '), 'error');
        return;
    }

    mostrarAlerta('⏳ Guardando ficha técnica...', 'info');

    try {
        // 1. Preparar datos para Supabase (mapeo correcto de columnas)
        const placaValue = (document.getElementById('placa')?.value || '').toUpperCase();
        
        const fichaData = {
            vehiculo_id: null,
            placa: placaValue,
            facsimil: (document.getElementById('facsimil')?.value || '').toUpperCase(),
            marca: (document.getElementById('marca')?.value || '').toUpperCase(),
            modelo: (document.getElementById('modelo')?.value || '').toUpperCase(),
            tipo: (document.getElementById('tipo')?.value || '').toUpperCase(),
            clase: (document.getElementById('clase')?.value || '').toUpperCase(),
            color: (document.getElementById('color')?.value || '').toUpperCase(),
            s_carroceria: (document.getElementById('serialCarroceria')?.value || '').toUpperCase(),
            s_motor: (document.getElementById('serialMotor')?.value || '').toUpperCase(),
            estatus_ficha: (document.getElementById('estatus')?.value || '').toUpperCase(),
            dependencia: (document.getElementById('dependencia')?.value || '').toUpperCase(),
            causa: document.getElementById('causa')?.value || '',
            mecanica: document.getElementById('mecanica')?.value || '',
            diagnostico: document.getElementById('diagnostico')?.value || '',
            ubicacion: document.getElementById('ubicacion')?.value || '',
            tapiceria: document.getElementById('tapiceria')?.value || '',
            cauchos: document.getElementById('cauchos')?.value || '',
            luces: document.getElementById('luces')?.value || '',
            observaciones: document.getElementById('observaciones')?.value || '',
            creado_por: document.getElementById('userEmail')?.textContent || 'usuario@institucion.com',
            fecha_creacion: new Date().toISOString()
        };

        // 2. Subir fotos a Supabase Storage
        const fotoUrls = {
            foto1_url: null,
            foto2_url: null,
            foto3_url: null,
            foto4_url: null
        };

        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById('foto' + i);
            if (input && input.files && input.files[0]) {
                const url = await subirFotoSupabase(input.files[0], placaValue, i);
                fotoUrls['foto' + i + '_url'] = url;
            }
        }

        // 3. Insertar en Supabase
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .insert([{
                ...fichaData,
                ...fotoUrls
            }])
            .select();

        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }

        console.log('✅ Ficha guardada exitosamente:', data);
        mostrarAlerta('✅ Ficha técnica guardada exitosamente en Supabase', 'success');

        setTimeout(() => {
            limpiarBusqueda();
        }, 1500);

    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        if (supabaseClient) {
            const { data } = await supabaseClient.auth.getSession();
            const session = data?.session;
            if (session?.user?.email) {
                const userEmail = document.getElementById('userEmail');
                if (userEmail) {
                    userEmail.textContent = session.user.email;
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ================= CERRAR SESIÓN =================
async function cerrarSesion() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        try {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '../index.html';
        }
    }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    const btnGuardar = document.getElementById('btnGuardar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) btnGuardar.addEventListener('click', guardarFicha);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarBusqueda);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    cargarUsuario();
    console.log('✅ Inicialización completada');
});
