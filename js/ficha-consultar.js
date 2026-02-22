// ============================================
// CONSULTAR FICHA TÉCNICA - VERSIÓN FINAL CORREGIDA
// ============================================

let vehiculosDB = [];
let vehiculoSeleccionado = null;
let resultadosActuales = []; // Para manejar índices correctamente

// Datos de ejemplo del CSV (fallback)
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
        
        const stored = localStorage.getItem('vehiculosDB');
        const storedTime = localStorage.getItem('vehiculosDB_time');
        const now = new Date().getTime();
        
        if (stored && storedTime && (now - storedTime) < 300000) {
            vehiculosDB = JSON.parse(stored);
            console.log('✅ Base de datos cargada desde localStorage:', vehiculosDB.length, 'vehículos');
            if (vehiculosDB.length > 0) {
                resultadosActuales = [...vehiculosDB];
                mostrarResultados(resultadosActuales);
            }
            return;
        }
        
        const posiblesRutas = [
            '/sistema-logistica/data/fichas_tecnicas_rows.csv',
            '../data/fichas_tecnicas_rows.csv',
            '../../data/fichas_tecnicas_rows.csv',
            'data/fichas_tecnicas_rows.csv',
            './fichas_tecnicas_rows.csv'
        ];
        
        let csvText = null;
        
        for (const ruta of posiblesRutas) {
            try {
                const response = await fetch(ruta);
                if (response.ok) {
                    csvText = await response.text();
                    console.log(`✅ CSV cargado desde: ${ruta}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (csvText) {
            vehiculosDB = parseCSV(csvText);
            console.log(`✅ ${vehiculosDB.length} vehículos cargados desde CSV`);
        } else {
            console.warn('⚠️ No se pudo cargar CSV, usando datos de ejemplo');
            vehiculosDB = [...datosEjemplo];
        }
        
        if (vehiculosDB.length > 0) {
            console.log('📋 Primer vehículo:', vehiculosDB[0]);
        }
        
        localStorage.setItem('vehiculosDB', JSON.stringify(vehiculosDB));
        localStorage.setItem('vehiculosDB_time', now.toString());
        
        resultadosActuales = [...vehiculosDB];
        mostrarResultados(resultadosActuales);
        
    } catch (error) {
        console.error('❌ Error al cargar base de datos:', error);
        vehiculosDB = [...datosEjemplo];
        resultadosActuales = [...vehiculosDB];
        mostrarResultados(resultadosActuales);
        console.log('✅ Usando datos de ejemplo:', vehiculosDB.length, 'vehículos');
    }
}

function parseCSV(csvText) {
    if (!csvText || csvText.trim() === '') return [];
    
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
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
    
    resultadosActuales = vehiculosDB.filter(v =>
        (v.placa && v.placa.toUpperCase().includes(searchTerm)) ||
        (v.facsimil && v.facsimil.toUpperCase().includes(searchTerm)) ||
        (v.s_carroceria && v.s_carroceria.toUpperCase().includes(searchTerm)) ||
        (v.s_motor && v.s_motor.toUpperCase().includes(searchTerm)) ||
        (v.marca && v.marca.toUpperCase().includes(searchTerm)) ||
        (v.modelo && v.modelo.toUpperCase().includes(searchTerm))
    );
    
    if (resultadosActuales.length > 0) {
        mostrarResultados(resultadosActuales);
        mostrarAlerta(`✅ Se encontraron ${resultadosActuales.length} vehículo(s)`, 'success');
    } else {
        mostrarResultados([]);
        mostrarAlerta(`❌ No se encontró: ${searchTerm}`, 'error');
    }
}

function mostrarResultados(resultados) {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) {
        console.error('❌ No se encontró tbody');
        return;
    }
    
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
        
        // ✅ IMPORTANTE: Guardamos el índice original del vehículo en vehiculosDB
        const indiceOriginal = vehiculosDB.indexOf(v);
        
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
                    <button class="btn-view" onclick="verFichaPorPlaca('${v.placa}')">👁️ Ver</button>
                    <button class="btn-print" onclick="imprimirFichaPorPlaca('${v.placa}')">🖨️</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ✅ NUEVA FUNCIÓN: Buscar vehículo por placa para evitar problemas de índice
function verFichaPorPlaca(placa) {
    const vehiculo = vehiculosDB.find(v => v.placa === placa);
    if (vehiculo) {
        verFichaData(vehiculo);
    } else {
        mostrarAlerta('❌ No se pudo cargar la ficha', 'error');
    }
}

function imprimirFichaPorPlaca(placa) {
    const vehiculo = vehiculosDB.find(v => v.placa === placa);
    if (vehiculo) {
        verFichaData(vehiculo);
        setTimeout(() => window.print(), 500);
    }
}

// ✅ FUNCIÓN PRINCIPAL CORREGIDA: Recibe el objeto vehículo directamente
function verFichaData(vehiculo) {
    if (!vehiculo) {
        console.error('❌ Vehículo no encontrado');
        mostrarAlerta('❌ Error al cargar ficha', 'error');
        return;
    }
    
    console.log('👁️ Mostrando ficha de:', vehiculo.placa);
    vehiculoSeleccionado = vehiculo;
    
    // ✅ Verificar que cada elemento existe antes de asignar
    const setId = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 'N/A';
    };
    
    // Llenar modal con datos del CSV
    setId('modalMarca', vehiculo.marca);
    setId('modalModelo', vehiculo.modelo);
    setId('modalTipo', vehiculo.tipo);
    setId('modalClase', vehiculo.clase);
    setId('modalSerialCarroceria', vehiculo.s_carroceria);
    setId('modalSerialMotor', vehiculo.s_motor);
    setId('modalColor', vehiculo.color);
    setId('modalPlaca', vehiculo.placa);
    setId('modalFacsimilar', vehiculo.facsimil);
    setId('modalEstatus', vehiculo.estatus_ficha);
    setId('modalDependencia', vehiculo.dependencia);
    setId('modalCausa', vehiculo.causa);
    setId('modalMecanica', vehiculo.mecanica);
    setId('modalDiagnostico', vehiculo.diagnostico);
    setId('modalUbicacion', vehiculo.ubicacion);
    setId('modalTapiceria', vehiculo.tapiceria);
    setId('modalCauchos', vehiculo.cauchos);
    setId('modalLuces', vehiculo.luces);
    setId('modalObservaciones', vehiculo.observaciones || 'Sin observaciones');
    setId('modalFechaCreacion', vehiculo.fecha_creacion || vehiculo.created_at || 'N/A');
    setId('modalCreadoPor', vehiculo.creado_por || 'N/A');
    
    // Estilo para estatus
    const estatusEl = document.getElementById('modalEstatus');
    if (estatusEl) {
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
    }
    
    // Cargar fotos
    cargarFotosModal(vehiculo);
    
    // Mostrar modal
    const modal = document.getElementById('fichaModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Función legacy para compatibilidad (redirige a la nueva)
function verFicha(index) {
    if (resultadosActuales[index]) {
        verFichaData(resultadosActuales[index]);
    }
}

function cargarFotosModal(vehiculo) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('modalImg' + i);
        const box = document.getElementById('modalBox' + i);
        const span = box?.querySelector('span');
        
        const fotoUrl = vehiculo[`foto${i}_url`];
        
        if (img && box && span) {
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
}

function cerrarModal() {
    const modal = document.getElementById('fichaModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    vehiculoSeleccionado = null;
}

function imprimirFicha() {
    window.print();
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
        resultadosActuales = [...vehiculosDB];
        mostrarResultados(resultadosActuales);
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
