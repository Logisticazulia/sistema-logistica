/**
* GESTIÓN DE USUARIOS Y PERMISOS
* Sistema RBAC para administración de roles
*/
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let usuarioActual = null;
let roles = [];
let modulos = [];
let botones = [];
let permisos = [];

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
    await verificarSesion();
    await cargarDatosIniciales();
    cargarUsuarios();
    cargarRoles();
});

// ================= VERIFICAR SESIÓN =================
async function verificarSesion() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../../index.html';
            return;
        }
        
        usuarioActual = session.user;
        document.getElementById('userEmail').textContent = session.user.email.split('@')[0];
        
        // Verificar si es administrador
        const { data: perfil } = await supabaseClient
            .from('perfiles')
            .select('*, roles(nombre)')
            .eq('id', session.user.id)
            .single();
        
        if (!perfil || perfil.roles.nombre !== 'administrador') {
            showAlert('error', '❌ No tienes permisos para acceder a esta página');
            setTimeout(() => {
                window.location.href = '../../dashboard.html';
            }, 2000);
            return;
        }
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '../../index.html';
    }
}

// ================= CARGAR DATOS INICIALES =================
async function cargarDatosIniciales() {
    await cargarRolesDB();
    await cargarModulos();
    await cargarBotones();
    await cargarPermisos();
}

async function cargarRolesDB() {
    const { data, error } = await supabaseClient.from('roles').select('*');
    if (!error) roles = data;
}

async function cargarModulos() {
    const { data, error } = await supabaseClient.from('modulos').select('*').order('orden');
    if (!error) modulos = data;
}

async function cargarBotones() {
    const { data, error } = await supabaseClient.from('botones').select('*, modulos(nombre)').order('orden');
    if (!error) botones = data;
}

async function cargarPermisos() {
    const { data, error } = await supabaseClient.from('permisos').select('*, roles(nombre), botones(nombre)');
    if (!error) permisos = data;
}

// ================= PESTAÑAS =================
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'permisos') {
        cargarPermisosRol();
    }
}

// ================= USUARIOS =================
async function cargarUsuarios() {
    const { data, error } = await supabaseClient
        .from('perfiles')
        .select('*, roles(nombre)')
        .order('created_at', { ascending: false });
    
    if (error) {
        showAlert('error', 'Error cargando usuarios');
        return;
    }
    
    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = data.map(user => `
        <tr>
            <td>${user.email}</td>
            <td>${user.nombre || 'N/A'}</td>
            <td><span class="role-badge role-${user.roles?.nombre || 'consultor'}">${user.roles?.nombre || 'Sin rol'}</span></td>
            <td>${user.activo ? '✅ Activo' : '❌ Inactivo'}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editarUsuario('${user.id}')">✏️</button>
                ${user.id !== usuarioActual.id ? `<button class="btn-action btn-delete" onclick="eliminarUsuario('${user.id}')">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// ================= PERMISOS =================
async function cargarPermisosRol() {
    const rolSeleccionado = document.getElementById('selectRolPermisos').value;
    
    if (!rolSeleccionado) {
        document.getElementById('permisosContainer').innerHTML = '<p style="text-align: center; color: #666;">Seleccione un rol para ver/editar permisos</p>';
        return;
    }
    
    const rol = roles.find(r => r.nombre === rolSeleccionado);
    if (!rol) return;
    
    const permisosRol = permisos.filter(p => p.rol_id === rol.id);
    
    const container = document.getElementById('permisosContainer');
    container.innerHTML = modulos.map(modulo => {
        const botonesModulo = botones.filter(b => b.modulo_id === modulo.id);
        
        return `
            <div class="permiso-card">
                <div class="permiso-header">
                    <span class="permiso-icon">${modulo.icono}</span>
                    <h3 class="permiso-title">${modulo.nombre}</h3>
                </div>
                <div class="permiso-botones">
                    ${botonesModulo.map(boton => {
                        const permiso = permisosRol.find(p => p.boton_id === boton.id);
                        return `
                            <div class="permiso-item">
                                <div class="permiso-item-info">
                                    <span class="permiso-item-icon">${boton.icono}</span>
                                    <span class="permiso-item-name">${boton.nombre}</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" 
                                        ${permiso?.puede_ver ? 'checked' : ''} 
                                        onchange="actualizarPermiso('${rol.id}', '${boton.id}', 'puede_ver', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

async function actualizarPermiso(rolId, botonId, tipoPermiso, valor) {
    try {
        // Verificar si existe el permiso
        const existe = permisos.find(p => p.rol_id === rolId && p.boton_id === botonId);
        
        if (existe) {
            await supabaseClient
                .from('permisos')
                .update({ [tipoPermiso]: valor })
                .eq('id', existe.id);
        } else {
            await supabaseClient
                .from('permisos')
                .insert([{
                    rol_id: rolId,
                    boton_id: botonId,
                    puede_ver: valor,
                    puede_crear: false,
                    puede_editar: false,
                    puede_eliminar: false
                }]);
        }
        
        await cargarPermisos();
        showAlert('success', 'Permiso actualizado correctamente');
    } catch (error) {
        console.error('Error actualizando permiso:', error);
        showAlert('error', 'Error actualizando permiso');
    }
}

// ================= ROLES =================
async function cargarRoles() {
    const { data, error } = await supabaseClient.from('roles').select('*');
    
    if (error) {
        showAlert('error', 'Error cargando roles');
        return;
    }
    
    const tbody = document.getElementById('rolesTableBody');
    tbody.innerHTML = data.map(rol => `
        <tr>
            <td><span class="role-badge role-${rol.nombre}">${rol.nombre}</span></td>
            <td>${rol.descripcion || 'N/A'}</td>
            <td>${rol.usuarios_count || 0}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editarRol('${rol.id}')">✏️</button>
            </td>
        </tr>
    `).join('');
}

// ================= MODAL =================
function openModal(tipo) {
    document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).style.display = 'block';
}

function closeModal(tipo) {
    document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).style.display = 'none';
    document.getElementById(`form${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).reset();
}

// ================= ALERTAS =================
function showAlert(type, message) {
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    
    alertSuccess.style.display = 'none';
    alertError.style.display = 'none';
    
    if (type === 'success') {
        document.getElementById('successMessage').textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => alertSuccess.style.display = 'none', 3000);
    } else {
        document.getElementById('errorMessage').textContent = message;
        alertError.style.display = 'flex';
        setTimeout(() => alertError.style.display = 'none', 3000);
    }
}

// ================= CERRAR SESIÓN =================
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '../../index.html';
});

// ================= CERRAR MODAL AL CLICK FUERA =================
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
