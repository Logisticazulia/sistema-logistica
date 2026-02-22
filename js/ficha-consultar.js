// ============================================
// CONSULTAR FICHA TÉCNICA - LÓGICA CORREGIDA
// ============================================

let vehiculosDB = [];
let vehiculoSeleccionado = null;

// Cargar base de datos al iniciar
async function cargarBaseDeDatos() {
    try {
        console.log('🔄 Intentando cargar base de datos...');
        
        // Intentar cargar desde localStorage primero
        const stored = localStorage.getItem('vehiculosDB');
        const storedTime = localStorage.getItem('vehiculosDB_time');
        const now = new Date().getTime();
        
        // Si hay datos en localStorage y tienen menos de 5 minutos, usarlos
        if (stored && storedTime && (now - storedTime) < 300000) {
            vehiculosDB = JSON.parse(stored);
            console.log('✅ Base de datos cargada desde localStorage:', vehiculosDB.length, 'vehículos');
            if (vehiculosDB.length > 0) {
                mostrarResultados(vehiculosDB);
            }
            return;
        }
        
        // Cargar desde CSV - Probar diferentes rutas
        const posiblesRutas = [
            '../data/fichas_tecnicas_rows.csv',
            '../../data/fichas_tecnicas_rows.csv',
            'data/fichas_tecnicas_rows.csv',
            './fichas_tecnicas_rows.csv'
        ];
        
        let csvText = null;
        let rutaUsada = null;
        
        for (const ruta of posiblesRutas) {
            try {
                console.log(`🔍 Probando ruta: ${ruta}`);
                const response = await fetch(ruta);
                if (response.ok) {
                    csvText = await response.text();
                    rutaUsada = ruta;
                    console.log(`✅ CSV cargado desde: ${ruta}`);
                    break;
                }
            } catch (e) {
                console.log(`❌ Falló ruta: ${ruta}`);
                continue;
            }
        }
        
        if (!csvText) {
            throw new Error('No se pudo cargar el CSV desde ninguna ruta');
        }
        
        // Parsear CSV
        vehiculosDB = parseCSV(csvText);
        console.log(`✅ ${vehiculosDB.length} vehículos cargados desde CSV`);
        
        if (vehiculosDB.length > 0) {
            console.log('📋 Primer vehículo:', vehiculosDB[0]);
        }
        
        // Guardar en localStorage
        localStorage.setItem('vehiculosDB', JSON.stringify(vehiculosDB));
        localStorage.setItem('vehiculosDB_time', now.toString());
        
        // Mostrar todos los vehículos al cargar
        mostrarResultados(vehiculosDB);
        
    } catch (error) {
        console.error('❌ Error al cargar base de datos:', error);
        mostrarAlerta('⚠️ No se pudo cargar la base de datos', 'error');
    }
}

// Parsear CSV
function parseCSV(csvText) {
    if (!csvText || csvText.trim() === '') {
        console.error('❌ CSV vacío o nulo');
        return [];
    }
    
    const lines = csvText.trim().split('\n');
    console.log(`📄 Total de líneas en CSV: ${lines.length}`);
    
    if (lines.length < 2) {
        console.error('❌ CSV sin datos válidos');
        return [];
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    console.log('📋 Headers:', headers);
    
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
    
    console.log(`✅ ${result.length} registros parseados correctamente`);
    return result;
}

// Parsear línea CSV
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

// Buscar vehículo
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    console.log('🔍 Término de búsqueda:', searchTerm);
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    // Cargar base de datos si no está cargada
    if (vehiculosDB.length === 0) {
        mostrarAlerta('⏳ Cargando base de datos...', 'info');
        await cargarBaseDeDatos();
    }
    
    // Buscar en todos los campos
    const resultados = vehiculosDB.filter(v => {
        const match = 
            (v.placa && v.placa.toUpperCase().includes(searchTerm)) ||
            (v.facsimil && v.facsimil.toUpperCase().includes(searchTerm)) ||
            (v.s_carroceria && v.s_carroceria.toUpperCase().includes(searchTerm)) ||
            (v.s_motor && v.s_motor.toUpperCase().includes(searchTerm)) ||
            (v.marca && v.marca.toUpperCase().includes(searchTerm)) ||
            (v.modelo && v.modelo.toUpperCase().includes(searchTerm));
        
        if (match) {
            console.log('✅ Vehículo encontrado:', v.placa, v.marca, v.modelo);
        }
        
        return match;
    });
    
    console.log(`📊 Total de resultados: ${resultados.length}`);
    
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
    
    if (!tbody) {
        console.error('❌ No se encontró el tbody con id "resultsBody"');
        return;
    }
    
    console.log(`📋 Mostrando ${resultados.length} resultados en la tabla`);
    
    if (resultados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                    📭 No hay vehículos registrados. Realice una búsqueda.
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
    console.log('✅ Tabla actualizada correctamente');
}

// Ver ficha detallada
function verFicha(index) {
    // Buscar el vehículo en la base de datos completa, no solo en los resultados filtrados
    const vehiculo = vehiculosDB[index];
    
    if (!vehiculo) {
        console.error('❌ Vehículo no encontrado en índice:', index);
        mostrarAlerta('❌ Error al cargar ficha', 'error');
        return;
    }
    
    console.log('👁️ Mostrando ficha de:', vehiculo.placa);
    vehiculoSeleccionado = vehiculo;
    
    // Llenar modal con datos
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
    
    // Cargar fotos
    cargarFotosModal(vehiculo);
    
    // Mostrar modal
    document.getElementById('fichaModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cargar fotos
function cargarFotosModal(vehiculo) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('modalImg' + i);
        const box = document.getElementById('modalBox' + i);
        const span = box.querySelector('span');
        
        // Usar foto1_url, foto2_url, etc. del CSV
        const fotoUrl = vehiculo[`foto${i}_url`];
        
        console.log(`📸 Foto ${i}:`, fotoUrl);
        
        if (fotoUrl && fotoUrl.trim() !== '' && fotoUrl !== 'null') {
            img.src = fotoUrl;
            img.style.display = 'block';
            span.style.display = 'none';
            
            img.onerror = function() {
                console.warn(`⚠️ No se pudo cargar foto ${i}:`, fotoUrl);
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

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
}

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const alertDiv = document.getElementById('searchAlert');
    if (alertDiv) alertDiv.style.display = 'none';
    
    // Mostrar todos los vehículos
    if (vehiculosDB.length > 0) {
        mostrarResultados(vehiculosDB);
    } else {
        document.getElementById('resultsBody').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                    📭 No hay vehículos registrados.
                </td>
            </tr>
        `;
    }
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('fichaModal');
    if (event.target === modal) {
        cerrarModal();
    }
}

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando consulta de fichas...');
    
    // Cargar base de datos
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
    
    console.log('✅ Sistema de consulta inicializado');
});
