// ============================================
// CONSULTAR FICHA TÉCNICA - VERSIÓN CORREGIDA
// ============================================

let vehiculosDB = [];
let vehiculoSeleccionado = null;

// Datos de ejemplo del CSV (fallback si no carga el archivo)
const datosEjemplo = [
    {
        id: "2",
        vehiculo_id: "2286",
        placa: "8888",
        facsimil: "YYYYYYYYYY",
        marca: "HHHHHHH",
        modelo: "HHHHHHHHHHHH",
        tipo: "TRIMOVIL",
        clase: "ESPECIAL",
        color: "HHHHHHHHHHH",
        s_carroceria: "DDDD",
        s_motor: "MANGOOOOOOOOOOO",
        estatus_ficha: "OPERATIVA",
        dependencia: "hhhhhhhhhhhhhh",
        causa: "dddddddddddddddd",
        mecanica: "iii",
        diagnostico: "hhhhhhhhhhh",
        ubicacion: "iiii",
        tapiceria: "iii",
        cauchos: "ii",
        luces: "ii",
        observaciones: "iiii",
        foto1_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771648846243_foto1_8888.jpg",
        foto2_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771648847379_foto2_8888.jpg",
        foto3_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771648847673_foto3_8888.jpg",
        foto4_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771648848133_foto4_8888.jpg",
        fecha_creacion: "2026-02-21 01:11:07.481",
        creado_por: "logistica@gmail.com"
    },
    {
        id: "3",
        vehiculo_id: "2284",
        placa: "123456",
        facsimil: "TTT",
        marca: "TTT",
        modelo: "TT",
        tipo: "TRACCION DE SANGRE",
        clase: "ESPECIAL",
        color: "1521",
        s_carroceria: "TTT",
        s_motor: "TTT",
        estatus_ficha: "OPERATIVA",
        dependencia: "SERVICIOS GENERALES",
        causa: "asd",
        mecanica: "asd",
        diagnostico: "asd",
        ubicacion: "51120",
        tapiceria: "asd",
        cauchos: "asd",
        luces: "asd",
        observaciones: "512631230",
        foto1_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771643769402_foto1_123456.jpg",
        foto2_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771643770947_foto2_123456.jpg",
        foto3_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771643771591_foto3_123456.jpg",
        foto4_url: "https://wwrknqfyjelwbvfnfshq.supabase.co/storage/v1/object/public/fichas-tecnicas/ficha_1771643773075_foto4_123456.jpg",
        fecha_creacion: "2026-02-21 03:16:14.078",
        creado_por: "logistica@gmail.com"
    }
];

// Cargar base de datos
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
        
        // Intentar cargar desde CSV con diferentes rutas
        const posiblesRutas = [
            '/sistema-logistica/data/fichas_tecnicas_rows.csv',
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
            }
        }
        
        if (csvText) {
            // Parsear CSV
            vehiculosDB = parseCSV(csvText);
            console.log(`✅ ${vehiculosDB.length} vehículos cargados desde CSV`);
        } else {
            console.warn('⚠️ No se pudo cargar CSV, usando datos de ejemplo');
            vehiculosDB = [...datosEjemplo];
        }
        
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
        // Usar datos de ejemplo como último recurso
        vehiculosDB = [...datosEjemplo];
        mostrarResultados(vehiculosDB);
        console.log('✅ Usando datos de ejemplo:', vehiculosDB.length, 'vehículos');
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
        console.error('❌ No se encontró el tbody');
        return;
    }
    
    console.log(`📋 Mostrando ${resultados.length} resultados`);
    
    if (resultados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                    📭 No hay vehículos registrados.
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

// Ver ficha detallada
function verFicha(index) {
    const vehiculo = vehiculosDB[index];
    
    if (!vehiculo) {
        console.error('❌ Vehículo no encontrado');
        mostrarAlerta('❌ Error al cargar ficha', 'error');
        return;
    }
    
    console.log('👁️ Mostrando ficha de:', vehiculo.placa);
    vehiculoSeleccionado = vehiculo;
    
    // Llenar modal
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
    document.getElementById('modalFechaCreacion').textContent = vehiculo.fecha_creacion || 'N/A';
    document.getElementById('modalCreadoPor').textContent = vehiculo.creado_por || 'N/A';
    
    // Estilo estatus
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
    
    document.getElementById('fichaModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cargar fotos
function cargarFotosModal(vehiculo) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('modalImg' + i);
        const box = document.getElementById('modalBox' + i);
        const span = box.querySelector('span');
        
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
    
    if (vehiculosDB.length > 0) {
        mostrarResultados(vehiculosDB);
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('fichaModal');
    if (event.target === modal) {
        cerrarModal();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando consulta de fichas...');
    cargarBaseDeDatos();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarVehiculo();
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('¿Cerrar sesión?')) {
                localStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }
    
    console.log('✅ Sistema inicializado');
});
