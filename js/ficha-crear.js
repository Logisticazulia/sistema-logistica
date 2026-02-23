/**
 * FICHA TÉCNICA DE VEHÍCULOS - BÚSQUEDA DESDE SUPABASE
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// Función para inicializar Supabase
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Librería Supabase no cargada');
        return false;
    }
    
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_KEY;
    
    if (!url || !key) {
        console.error('❌ Configuración de Supabase no encontrada');
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('✅ Supabase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        return false;
    }
}

// ================= ESTADO =================
const fotosData = { foto1: null, foto2: null, foto3: null, foto4: null };

// ================= FUNCIONES DE UTILIDAD =================
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ================= BÚSQUEDA DESDE SUPABASE =================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    const searchTerm = searchInput.value.trim().toUpperCase();
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo en Supabase:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        // ✅ CONSULTA A SUPABASE - BUSCA EN LOS 4 CAMPOS
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},placa.ilike.%${searchTerm}%,facsimil.ilike.%${searchTerm}%,s_carroceria.ilike.%${searchTerm}%,s_motor.ilike.%${searchTerm}%`)
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
        
        // ✅ VEHÍCULO ENCONTRADO
        const vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        // Llenar formulario con los datos encontrados
        llenarFormulario(vehiculo);
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
        'facsimil': 'facsimilar',
        'situacion': 'estatus',
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
    
    actualizarVistaPrevia();
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    // Limpiar formulario
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    // Limpiar vista previa
    actualizarVistaPrevia();
    
    // Limpiar fotos
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
}

// ================= VISTA PREVIA DE FOTOS =================
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
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
            
            // Guardar en base64
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

// ================= ACTUALIZAR VISTA PREVIA =================
function actualizarVistaPrevia() {
    const campos = [
        'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 
        'color', 'placa', 'facsimilar', 'serialMotor', 'dependencia',
        'estatus', 'causa', 'mecanica', 'diagnostico', 'ubicacion',
        'tapiceria', 'cauchos', 'luces', 'observaciones'
    ];
    
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        const preview = document.getElementById('preview' + campo.charAt(0).toUpperCase() + campo.slice(1));
        if (preview && input) {
            preview.textContent = input.value || '';
        }
    });
}

// ================= GUARDAR FICHA =================
function guardarFicha() {
    const form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    const fichaData = {
        marca: document.getElementById('marca')?.value || '',
        modelo: document.getElementById('modelo')?.value || '',
        tipo: document.getElementById('tipo')?.value || '',
        clase: document.getElementById('clase')?.value || '',
        serialCarroceria: document.getElementById('serialCarroceria')?.value || '',
        serialMotor: document.getElementById('serialMotor')?.value || '',
        color: document.getElementById('color')?.value || '',
        placa: document.getElementById('placa')?.value || '',
        facsimilar: document.getElementById('facsimilar')?.value || '',
        estatus: document.getElementById('estatus')?.value || '',
        dependencia: document.getElementById('dependencia')?.value || '',
        causa: document.getElementById('causa')?.value || '',
        mecanica: document.getElementById('mecanica')?.value || '',
        diagnostico: document.getElementById('diagnostico')?.value || '',
        ubicacion: document.getElementById('ubicacion')?.value || '',
        tapiceria: document.getElementById('tapiceria')?.value || '',
        cauchos: document.getElementById('cauchos')?.value || '',
        luces: document.getElementById('luces')?.value || '',
        observaciones: document.getElementById('observaciones')?.value || '',
        fotos: { ...fotosData },
        fechaCreacion: new Date().toISOString()
    };
    
    // Guardar en localStorage
    let fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
    fichas.push(fichaData);
    localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));
    
    mostrarAlerta('✅ Ficha técnica guardada exitosamente', 'success');
}

// ================= LIMPIAR FORMULARIO =================
function limpiarFormulario() {
    if (confirm('¿Está seguro de limpiar el formulario?')) {
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
        mostrarAlerta('🔄 Formulario limpiado', 'success');
    }
}

// ================= IMPRIMIR =================
function imprimirFicha() {
    window.print();
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        if (supabaseClient) {
            const { data } = await supabaseClient.auth.getSession();
            const session = data?.session;
            
            if (session) {
                const { data: perfilData } = await supabaseClient
                    .from('perfiles')
                    .select('email')
                    .eq('id', session.user.id)
                    .single();
                
                if (perfilData?.email) {
                    const userEmail = document.getElementById('userEmail');
                    if (userEmail) userEmail.textContent = perfilData.email;
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    // Inicializar Supabase primero
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    // Inicializar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Event listeners para botones
    const btnGuardar = document.getElementById('btnGuardar');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) btnGuardar.addEventListener('click', guardarFicha);
    if (btnImprimir) btnImprimir.addEventListener('click', imprimirFicha);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFormulario);
    
    // Permitir buscar con Enter
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarVehiculo();
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
    
    // Cargar usuario
    cargarUsuario();
    
    console.log('✅ Inicialización completada');
});
