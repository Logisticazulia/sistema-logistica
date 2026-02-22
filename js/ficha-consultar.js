// ============================================
// CONSULTAR FICHA TÉCNICA DE VEHÍCULOS - LÓGICA
// ============================================

// Base de datos de vehículos
let vehiculosDB = [];
let vehiculoSeleccionado = null;

// ============================================
// CARGA DE DATOS DESDE CSV
// ============================================

async function cargarBaseDeDatos() {
    try {
        // Intentar cargar desde localStorage primero
        const stored = localStorage.getItem('vehiculosDB');
        if (stored) {
            vehiculosDB = JSON.parse(stored);
            console.log('✅ Base de datos cargada desde localStorage:', vehiculosDB.length, 'vehículos');
            return;
        }
        
        // Cargar desde CSV con el nombre correcto de tu tabla
        const response = await fetch('../data/fichas_tecnicas_rows.csv');
        if (!response.ok) throw new Error('CSV no encontrado');
        
        const csvText = await response.text();
        vehiculosDB = parseCSV(csvText);
        
        // Guardar en localStorage para futuras consultas
        localStorage.setItem('vehiculosDB', JSON.stringify(vehiculosDB));
        console.log('✅ Base de datos cargada desde CSV:', vehiculosDB.length, 'vehículos');
    } catch (error) {
        console.error('❌ Error al cargar base de datos:', error);
        mostrarAlerta('⚠️ No se pudo cargar la base de datos', 'error');
    }
}

// Parsear CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i]);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
        });
        result.push(obj);
    }
    return result;
}

// Parsear línea CSV con soporte para comillas
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

// ============================================
// BÚSQUEDA DE VEHÍCULOS
// ============================================

async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    if (vehiculosDB.length === 0) {
        mostrarAlerta('⏳ Cargando base de datos...', 'info');
        await cargarBaseDeDatos();
    }
    
    // Buscar usando los nombres exactos del CSV fichas_tecnicas
    const resultados = vehiculosDB.filter(v =>
        (v.placa && v.placa.toUpperCase().includes(searchTerm)) ||
        (v.facsimil && v.facsimil.toUpperCase().includes(searchTerm)) ||
        (v.s_carroceria && v.s_carroceria.toUpperCase().includes(searchTerm)) ||
        (v.s_motor && v.s_motor.toUpperCase().includes(searchTerm)) ||
        (v.marca && v.marca.toUpperCase().includes(searchTerm)) ||
        (v.modelo && v.modelo.toUpperCase().includes(searchTerm))
    );
    
    if (resultados.length > 0) {
        mostrarResultados(resultados);
        mostrarAlerta(`✅ Se encontraron ${resultados.length} vehículo(s)`, 'success');
    } else {
        mostrarResultados([]);
        mostrarAlerta(`❌ No se encontró: ${searchTerm}`, 'error');
    }
}

// Mostrar resultados en tabla
function mostrarResultados(resultados) {
    const tbody = document.getElementById('resultsBody');
    
    if (resultados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                    📭 No se encontraron vehículos.
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    resultados.forEach((v, index) => {
        const estatusClass = v.estatus_ficha && v.estatus_ficha.toUpperCase().includes('OPER') 
            ? 'style="color: #28a745; font-weight: bold;"' 
            : 'style="color: #dc3545; font-weight: bold;"';
        
        const dependenciaCorta = v.dependencia ? 
            (v.dependencia.length > 40 ? v.dependencia.substring(0, 40) + '...' : v.dependencia) 
            : 'N/A';
        
        html += `
            <tr>
                <td><strong>${v.placa || 'N/A'}</strong></td>
                <td>${v.marca || 'N/A'}</td>
                <td>${v.modelo || 'N/A'}</td>
                <td>${v.tipo || 'N/A'}</td>
                <td>${v.color || 'N/A'}</td>
                <td ${estatusClass}>${v.estatus_ficha || 'N/A'}</td>
                <td>${dependenciaCorta}</td>
                <td>
                    <button class="btn-view" onclick="verFicha(${index})">👁️ Ver</button>
                    <button class="btn-print" onclick="imprimirFichaDirecta(${index})">🖨️</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ============================================
// VISTA DETALLADA (MODAL)
// ============================================

function verFicha(index) {
    const vehiculo = vehiculosDB[index];
    if (!vehiculo) {
        mostrarAlerta('❌ Error al cargar ficha', 'error');
        return;
    }
    
    vehiculoSeleccionado = vehiculo;
    
    // Mapeo exacto de campos del CSV fichas_tecnicas
    document.getElementById('modalMarca').textContent = vehiculo.marca || 'N/A';
    document.getElementById('modalModelo').textContent = vehiculo.modelo || 'N/A';
    document.getElementById('modalTipo').textContent = vehiculo.tipo || 'N/A';
    document.getElementById('modalClase').textContent = vehiculo.clase || 'N/A';
    document.getElementById('modalSerialCarroceria').textContent = vehiculo.s_carroceria || 'N/A';
    document.getElementById('modalSerialMotor').textContent = vehiculo.s_motor || 'N/A';
    document.getElementById('modalColor').textContent = vehiculo.color || 'N/A';
    document.getElementById('modalPlaca').textContent = vehiculo.placa || 'N/A';
    document.getElementById('modalFacsimilar').textContent = vehiculo.facsimil || 'N/A';
    document.getElementById('modalEstatus').textContent = vehiculo.estatus_ficha || 'N/A';
    document.getElementById('modalDependencia').textContent = vehiculo.dependencia || 'N/A';
    document.getElementById('modalCausa').textContent = vehiculo.causa || 'N/A';
    document.getElementById('modalMecanica').textContent = vehiculo.mecanica || 'N/A';
    document.getElementById('modalDiagnostico').textContent = vehiculo.diagnostico || 'N/A';
    document.getElementById('modalUbicacion').textContent = vehiculo.ubicacion || 'N/A';
    document.getElementById('modalTapiceria').textContent = vehiculo.tapiceria || 'N/A';
    document.getElementById('modalCauchos').textContent = vehiculo.cauchos || 'N/A';
    document.getElementById('modalLuces').textContent = vehiculo.luces || 'N/A';
    document.getElementById('modalObservaciones').textContent = vehiculo.observaciones || 'Sin observaciones';
    document.getElementById('modalFechaCreacion').textContent = vehiculo.fecha_creacion || vehiculo.created_at || 'N/A';
    document.getElementById('modalCreadoPor').textContent = vehiculo.creado_por || 'N/A';
    
    // Estilo para estatus
    const estatusEl = document.getElementById('modalEstatus');
    if (vehiculo.estatus_ficha?.toUpperCase().includes('OPER')) {
        estatusEl.style.color = '#28a745';
        estatusEl.style.background = '#d4edda';
        estatusEl.style.padding = '8px';
        estatusEl.style.borderRadius = '4px';
    } else {
        estatusEl.style.color = '#dc3545';
        estatusEl.style.background = '#f8d7da';
        estatusEl.style.padding = '8px';
        estatusEl.style.borderRadius = '4px';
    }
    
    // Cargar fotos usando foto1_url, foto2_url, etc. del CSV
    cargarFotosModal(vehiculo);
    
    document.getElementById('fichaModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cargar fotos desde URLs de Supabase (foto1_url, foto2_url, etc.)
function cargarFotosModal(vehiculo) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('modalImg' + i);
        const box = document.getElementById('modalBox' + i);
        const span = box.querySelector('span');
        
        // Usar las columnas foto1_url, foto2_url, etc. del CSV
        const fotoUrl = vehiculo[`foto${i}_url`];
        
        if (fotoUrl && fotoUrl.trim() !== '' && fotoUrl !== 'null') {
            img.src = fotoUrl;
            img.style.display = 'block';
            span.style.display = 'none';
            img.onerror = function() {
                this.style.display = 'none';
                span.style.display = 'block';
            };
        } else {
            img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

function cerrarModal() {
    document.getElementById('fichaModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    vehiculoSeleccionado = null;
}

function imprimirFicha() {
    window.print();
}

function imprimirFichaDirecta(index) {
    verFicha(index);
    setTimeout(() => window.print(), 500);
}

// ============================================
// UTILIDADES
// ============================================

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    document.getElementById('resultsBody').innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                📭 No hay vehículos registrados.
            </td>
        </tr>
    `;
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target === document.getElementById('fichaModal')) {
        cerrarModal();
    }
}

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
});

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    cargarBaseDeDatos();
    
    // Buscar con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarVehiculo();
        });
    }
    
    // Cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Cerrar sesión?')) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }
    
    // Cargar usuario SOLO si Supabase está disponible
    if (typeof supabase !== 'undefined' && supabase.auth) {
        cargarUsuario();
    }
});

// Función segura para cargar usuario
async function cargarUsuario() {
    try {
        if (typeof supabase === 'undefined' || !supabase.auth) {
            console.log('⚠️ Supabase no disponible, usando usuario por defecto');
            return;
        }
        
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        
        if (session?.user?.id) {
            const {  perfilData } = await supabase
                .from('perfiles')
                .select('email')
                .eq('id', session.user.id)
                .single();
            
            if (perfilData?.email) {
                document.getElementById('userEmail').textContent = perfilData.email;
            }
        }
    } catch (error) {
        console.warn('⚠️ No se pudo cargar usuario:', error.message);
        // No romper la aplicación, continuar con usuario por defecto
    }
}
