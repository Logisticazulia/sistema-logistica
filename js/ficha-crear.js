/**
 * FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN CORREGIDA
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// Función para inicializar Supabase de forma segura
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Librería Supabase no cargada');
        return false;
    }
    
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_KEY;
    
    if (!url || !key) {
        console.error('❌ Configuración de Supabase no encontrada');
        console.log('SUPABASE_URL:', url);
        console.log('SUPABASE_KEY:', key ? '***' : 'undefined');
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
let vehiculosDB = [];

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

// ================= CARGAR BASE DE DATOS =================
async function cargarBaseDeDatos() {
    try {
        // Intentar cargar desde localStorage primero
        const stored = localStorage.getItem('vehiculosDB');
        if (stored) {
            vehiculosDB = JSON.parse(stored);
            console.log('✅ Base de datos cargada desde localStorage:', vehiculosDB.length, 'vehículos');
            return true;
        }
        
        // Cargar desde CSV
        console.log('📥 Cargando desde CSV...');
        const response = await fetch('../data/vehiculos_rows.csv');
        if (!response.ok) throw new Error('No se pudo cargar el CSV');
        
        const csvText = await response.text();
        vehiculosDB = parseCSV(csvText);
        
        // Guardar en localStorage
        localStorage.setItem('vehiculosDB', JSON.stringify(vehiculosDB));
        console.log('✅ Base de datos cargada desde CSV:', vehiculosDB.length, 'vehículos');
        return true;
        
    } catch (error) {
        console.error('❌ Error al cargar base de datos:', error);
        mostrarAlerta('⚠️ No se pudo cargar la base de datos', 'error');
        return false;
    }
}

// ================= BÚSQUEDA DE VEHÍCULO =================
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
    
    console.log('🔍 Buscando vehículo:', searchTerm);
    
    // Cargar base de datos si no está cargada
    if (vehiculosDB.length === 0) {
        mostrarAlerta('⏳ Cargando base de datos...', 'info');
        const cargado = await cargarBaseDeDatos();
        if (!cargado) return;
    }
    
    // Buscar en todos los campos relevantes
    const vehiculo = vehiculosDB.find(v => {
        const placa = (v.placa || '').toString().toUpperCase();
        const facsimil = (v.facsimil || '').toString().toUpperCase();
        const sCarroceria = (v.s_carroceria || '').toString().toUpperCase();
        const sMotor = (v.s_motor || '').toString().toUpperCase();
        const id = (v.id || '').toString();
        
        return placa === searchTerm || placa.includes(searchTerm) ||
               facsimil === searchTerm || facsimil.includes(searchTerm) ||
               sCarroceria === searchTerm || sCarroceria.includes(searchTerm) ||
               sMotor === searchTerm || sMotor.includes(searchTerm) ||
               id === searchTerm;
    });
    
    if (vehiculo) {
        llenarFormulario(vehiculo);
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo}`, 'success');
    } else {
        mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
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
    
    Object.entries(mapeoCampos).forEach(([csvField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[csvField]) {
            if (element.tagName === 'SELECT') {
                const matchingOption = Array.from(element.options).find(opt =>
                    opt.value.toUpperCase() === vehiculo[csvField].toUpperCase()
                );
                if (matchingOption) element.value = matchingOption.value;
            } else {
                element.value = vehiculo[csvField];
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

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    // Inicializar Supabase primero
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible, usando solo CSV/localStorage');
    }
    
    // Cargar base de datos
    cargarBaseDeDatos();
    
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
