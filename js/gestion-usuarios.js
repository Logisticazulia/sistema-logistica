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
    console.log('Inicializando gestión de usuarios...');
    await verificarSesion();
    await cargarDatosIniciales();
    cargarUsuarios();
    cargarRoles();
    setupEventListeners();
});

// ================= VERIFICAR SESIÓN =================
async function verificarSesion() {
    try {
        const {  { session }, error } = await supabaseClient.auth.getSession();
        
        if (!session) {
            console.log('No hay sesión activa, redirigiendo...');
            window.location.href = '../index.html';
            return;
        }
        
        usuarioActual = session.user;
        const emailElement = document.getElementById('userEmail');
        if (emailElement) {
            emailElement.textContent = session.user.email.split('@')[0];
        }
        
        // Verificar si es administrador
        const {  perfil } = await supabaseClient
            .from('perfiles')
            .select('*, roles(nombre)')
            .eq('id', session.user.id)
            .single();
        
        if (!perfil || perfil.roles?.nombre !== 'administrador') {
            showAlert('error', '❌ No tienes permisos para acceder a esta página');
            setTimeout(() => {
                window.location.href = '../dashboard.html';
            }, 2000);
            return;
        }
        
        console.log('Usuario administrador verificado:', session.user.email);
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '../index.html';
    }
}

// ================= CARGAR DATOS INICIALES =================
async function cargarDatosIniciales() {
    await cargarRolesDB();
    await cargarModulos();
    await cargarBotones();
    await cargarPermisosDB();
}

async function cargarRolesDB() {
    try {
        const { data, error } = await supabaseClient.from('roles').select('*');
        if (!error && data) {
            roles = data;
            console.log('Roles cargados:', roles.length);
        }
    } catch (error) {
        console.error('Error cargando roles:', error);
    }
}

async function cargarModulos() {
    try {
        const { data, error } = await supabaseClient.from('modulos').select('*').order('orden');
        if (!error && data) {
            modulos = data;
            console.log('Módulos cargados:', modulos.length);
        }
    } catch (error) {
        console.error('Error cargando módulos:', error);
    }
}

async function cargarBotones() {
    try {
        const { data, error } = await supabaseClient.from('botones').select('*, modulos(nombre)').order('orden');
        if (!error && data) {
            botones = data;
            console.log('Botones cargados:', botones.length);
        }
    } catch (error) {
        console.error('Error cargando botones:', error);
    }
}

async function cargarPermisosDB() {
    try {
        const { data, error } = await supabaseClient.from('permisos').select('*, roles(nombre), botones(nombre)');
        if (!error && data) {
            permisos = data;
            console.log('Permisos cargados:', permisos.length);
        }
    } catch (error) {
        console.error('Error cargando permisos:', error);
    }
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
    try {
        const tbody = document.getElementById('usuariosTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="margin-top: 10px; color: #666;">Cargando usuarios...</p>
                </td>
            </tr>
        `;
        
        const { data, error } = await supabaseClient
            .from('perfiles')
            .select('*, roles(nombre)')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error cargando usuarios:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #dc2626;">
                        Error cargando usuarios: ${error.message}
                    </td>
                </tr>
            `;
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                        No hay usuarios registrados
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.map(user => `
            <tr>
                <td>${user.email || 'N/A'}</td>
                <td>${user.nombre || 'N/A'}</td>
                <td><span class="role-badge role-${user.roles?.nombre || 'consultor'}">${user.roles?.nombre || 'Sin rol'}</span></td>
                <td>${user.activo ? '✅ Activo' : '❌ Inactivo'}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarUsuario('${user.id}')">✏️</button>
                    ${user.id !== usuarioActual?.id ? `<button class="btn-action btn-delete" onclick="eliminarUsuario('${user.id}')">🗑️</button>` : ''}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error en cargarUsuarios:', error);
        showAlert('error', 'Error cargando usuarios');
    }
}

// ================= PERMISOS =================
async function cargarPermisosRol() {
    const rolSeleccionado = document.getElementById('selectRolPermisos').value;
    const container = document.getElementById('permisosContainer');
    
    if (!rolSeleccionado) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                Seleccione un rol para configurar sus permisos
            </div>
        `;
        return;
    }
    
    const rol = roles.find(r => r.nombre === rolSeleccionado);
    if (!rol) {
        container.innerHTML = '<p style="color: #dc2626;">Rol no encontrado</p>';
        return;
    }
    
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="loading-spinner"></div><p style="margin-top: 10px;">Cargando permisos...</p></div>';
    
    const permisosRol = permisos.filter(p => p.rol_id === rol.id);
    
    setTimeout(() => {
        container.innerHTML = modulos.map(modulo => {
            const botonesModulo = botones.filter(b => b.modulo_id === modulo.id);
            
            if (botonesModulo.length === 0) return '';
            
            return `
                <div class="permiso-card">
                    <div class="permiso-header">
                        <span class="permiso-icon">${modulo.icono || '📁'}</span>
                        <h3 class="permiso-title">${modulo.nombre}</h3>
                    </div>
                    <div class="permiso-botones">
                        ${botonesModulo.map(boton => {
                            const permiso = permisosRol.find(p => p.boton_id === boton.id);
                            return `
                                <div class="permiso-item">
                                    <div class="permiso-item-info">
                                        <span class="permiso-item-icon">${boton.icono || '📄'}</span>
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
    }, 300);
}

async function actualizarPermiso(rolId, botonId, tipoPermiso, valor) {
    try {
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
        
        await cargarPermisosDB();
        showAlert('success', 'Permiso actualizado correctamente');
    } catch (error) {
        console.error('Error actualizando permiso:', error);
        showAlert('error', 'Error actualizando permiso');
    }
}

// ================= ROLES =================
async function cargarRoles() {
    try {
        const tbody = document.getElementById('rolesTableBody');
        
        const { data, error } = await supabaseClient.from('roles').select('*');
        
        if (error) {
            console.error('Error cargando roles:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #dc2626;">
                        Error cargando roles
                    </td>
                </tr>
            `;
            return;
        }
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #666;">
                        No hay roles registrados
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.map(rol => `
            <tr>
                <td><span class="role-badge role-${rol.nombre}">${rol.nombre}</span></td>
                <td>${rol.descripcion || 'N/A'}</td>
                <td>-</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarRol('${rol.id}')">✏️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error en cargarRoles:', error);
    }
}

// ================= MODAL =================
function openModal(tipo) {
    const modal = document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(tipo) {
    const modal = document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        const form = document.getElementById(`form${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
        if (form) form.reset();
    }
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
    // Formulario de usuario
    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarUsuario();
        });
    }
    
    // Botón logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
        });
    }
    
    // Cerrar modal al hacer click fuera
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// ================= GUARDAR USUARIO =================
async function guardarUsuario() {
    const email = document.getElementById('usuarioEmail').value;
    const nombre = document.getElementById('usuarioNombre').value;
    const rol = document.getElementById('usuarioRol').value;
    const password = document.getElementById('usuarioPassword').value;
    const activo = document.getElementById('usuarioActivo').value === 'true';
    
    if (!email || !rol) {
        showAlert('error', 'Email y rol son obligatorios');
        return;
    }
    
    try {
        // Crear usuario en Auth
        const {  userData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: password || 'Cambio123',
            email_confirm: true
        });
        
        if (authError) throw authError;
        
        // Crear perfil
        const rolData = roles.find(r => r.nombre === rol);
        
        const { error: perfilError } = await supabaseClient
            .from('perfiles')
            .insert([{
                id: userData.user.id,
                email: email,
                nombre: nombre,
                rol: rolData?.id,
                activo: activo
            }]);
        
        if (perfilError) throw perfilError;
        
        showAlert('success', 'Usuario creado exitosamente');
        closeModal('usuario');
        cargarUsuarios();
        
    } catch (error) {
        console.error('Error guardando usuario:', error);
        showAlert('error', 'Error: ' + error.message);
    }
}

// ================= EDITAR USUARIO =================
function editarUsuario(id) {
    console.log('Editar usuario:', id);
    openModal('usuario');
    document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = id;
}

// ================= ELIMINAR USUARIO =================
async function eliminarUsuario(id) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('perfiles')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showAlert('success', 'Usuario eliminado exitosamente');
        cargarUsuarios();
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showAlert('error', 'Error: ' + error.message);
    }
}

// ================= EDITAR ROL =================
function editarRol(id) {
    console.log('Editar rol:', id);
    showAlert('error', 'Función en desarrollo');
}

// ================= ALERTAS =================
function showAlert(type, message) {
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    
    if (alertSuccess) alertSuccess.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    
    if (type === 'success') {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) successMessage.textContent = message;
        if (alertSuccess) {
            alertSuccess.style.display = 'flex';
            setTimeout(() => alertSuccess.style.display = 'none', 3000);
        }
    } else {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.textContent = message;
        if (alertError) {
            alertError.style.display = 'flex';
            setTimeout(() => alertError.style.display = 'none', 3000);
        }
    }
}
