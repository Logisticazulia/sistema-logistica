// ================= CONFIGURACIÓN =================
let supabase;
let currentUser = null;

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();
    await checkAuth();
    setupEventListeners();
    loadPartsTable();
    setTodayDate();
});

async function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
    }
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;
}

function setupEventListeners() {
    // Formulario
    document.getElementById('partsForm').addEventListener('submit', handleSubmit);
    
    // Búsqueda de vehículo por placa
    document.getElementById('placa').addEventListener('blur', searchVehicle);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_parte').value = today;
}

// ================= BUSCAR VEHÍCULO POR PLACA =================
async function searchVehicle() {
    const placa = document.getElementById('placa').value.trim().toUpperCase();
    if (placa.length < 6) return;

    try {
        const { data, error } = await supabase
            .from('vehiculos')
            .select('marca, modelo, tipo, unidad_administrativa')
            .eq('placa', placa)
            .single();

        if (data && !error) {
            document.getElementById('marca').value = data.marca || '';
            document.getElementById('modelo').value = data.modelo || '';
            document.getElementById('tipo').value = data.tipo || '';
            document.getElementById('unidad_administrativa').value = data.unidad_administrativa || '';
        }
    } catch (error) {
        console.error('Error buscando vehículo:', error);
    }
}

// ================= REGISTRAR PARTE =================
async function handleSubmit(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.classList.add('loading');
    btnSubmit.disabled = true;

    try {
        const formData = {
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            tipo: document.getElementById('tipo').value,
            categoria: document.getElementById('categoria').value,
            prioridad: document.getElementById('prioridad').value,
            estado: document.getElementById('estado').value,
            fecha_parte: document.getElementById('fecha_parte').value,
            descripcion: document.getElementById('descripcion').value.trim(),
            observaciones: document.getElementById('observaciones').value.trim(),
            unidad_administrativa: document.getElementById('unidad_administrativa').value,
            ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim(),
            responsable_nombre: document.getElementById('responsable_nombre').value.trim(),
            responsable_cedula: document.getElementById('responsable_cedula').value.trim(),
            n_tramite: document.getElementById('n_tramite').value.trim(),
            fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
            costo_estimado: document.getElementById('costo_estimado').value || null,
            taller_proveedor: document.getElementById('taller_proveedor').value.trim(),
            created_by: currentUser?.email
        };

        // Validaciones básicas
        if (!formData.placa || !formData.categoria || !formData.prioridad || 
            !formData.estado || !formData.fecha_parte || !formData.descripcion) {
            showAlert('error', 'Por favor complete todos los campos requeridos');
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
            return;
        }

        const { error } = await supabase
            .from('partes_vehiculos')
            .insert([formData]);

        if (error) throw error;

        showAlert('success', 'Parte registrado exitosamente');
        document.getElementById('partsForm').reset();
        setTodayDate();
        loadPartsTable();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Error al registrar el parte: ' + error.message);
    } finally {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
    }
}

// ================= CARGAR TABLA DE PARTES =================
async function loadPartsTable() {
    const tbody = document.getElementById('partsTableBody');
    
    try {
        const { data, error } = await supabase
            .from('partes_vehiculos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">
                        No hay partes registrados
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(parte => `
            <tr>
                <td>#${parte.id}</td>
                <td><strong>${parte.placa}</strong></td>
                <td>${parte.categoria}</td>
                <td>
                    <span class="status-badge ${getPriorityClass(parte.prioridad)}">
                        ${parte.prioridad}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${getStatusClass(parte.estado)}">
                        ${parte.estado}
                    </span>
                </td>
                <td>${formatDate(parte.fecha_parte)}</td>
                <td>${parte.responsable_nombre || '-'}</td>
                <td>
                    <button class="btn btn-sm" onclick="viewPart(${parte.id})">👁️</button>
                    <button class="btn btn-sm" onclick="editPart(${parte.id})">✏️</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando partes:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #dc2626;">
                    Error cargando los datos
                </td>
            </tr>
        `;
    }
}

// ================= UTILIDADES =================
function getPriorityClass(priority) {
    const classes = {
        'BAJA': 'cerrado',
        'MEDIA': 'en-proceso',
        'ALTA': 'en-proceso',
        'URGENTE': 'abierto'
    };
    return classes[priority] || 'en-proceso';
}

function getStatusClass(status) {
    const classes = {
        'ABIERTO': 'abierto',
        'EN_PROCESO': 'en-proceso',
        'CERRADO': 'cerrado'
    };
    return classes[status] || 'en-proceso';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE');
}

function showAlert(type, message) {
    const alertEl = type === 'success' 
        ? document.getElementById('alertSuccess')
        : document.getElementById('alertError');
    const messageEl = type === 'success'
        ? document.getElementById('successMessage')
        : document.getElementById('errorMessage');
    
    messageEl.textContent = message;
    alertEl.style.display = 'flex';
    
    setTimeout(() => {
        alertEl.style.display = 'none';
    }, 5000);
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '../login.html';
}

function viewPart(id) {
    // Implementar vista detallada
    alert('Ver parte #' + id);
}

function editPart(id) {
    // Implementar edición
    alert('Editar parte #' + id);
}
