/**
 * SISTEMA RBAC - CONTROL DE ACCESO POR ROLES
 * Sistema de Logística - CPNB Zulia
 */

const RBAC = {
    usuario: null,
    perfil: null,
    rol: null,
    permisos: [],
    
    // ================= INICIALIZACIÓN =================
    async init() {
        try {
            const {  { session } } = await supabase.auth.getSession();
            
            if (!session) {
                return false;
            }
            
            this.usuario = session.user;
            
            // Obtener perfil y rol
            const {  perfil, error } = await supabase
                .from('perfiles')
                .select('*, roles(nombre, descripcion)')
                .eq('id', session.user.id)
                .single();
            
            if (error || !perfil) {
                console.error('Error obteniendo perfil:', error);
                return false;
            }
            
            this.perfil = perfil;
            this.rol = perfil.roles?.nombre || 'consultor';
            
            // Obtener permisos
            await this.cargarPermisos();
            
            return true;
        } catch (error) {
            console.error('Error inicializando RBAC:', error);
            return false;
        }
    },
    
    // ================= CARGAR PERMISOS =================
    async cargarPermisos() {
        try {
            const { data, error } = await supabase
                .from('permisos')
                .select('*, botones(ruta, nombre), roles(nombre)')
                .eq('rol_id', this.perfil.rol_id);
            
            if (error) throw error;
            
            this.permisos = data || [];
        } catch (error) {
            console.error('Error cargando permisos:', error);
            this.permisos = [];
        }
    },
    
    // ================= VERIFICAR PERMISOS =================
    tienePermiso(ruta, accion = 'puede_ver') {
        const permiso = this.permisos.find(p => 
            p.botones?.ruta === ruta
        );
        
        if (!permiso) return false;
        
        return permiso[accion] === true;
    },
    
    puedeVer(ruta) {
        return this.tienePermiso(ruta, 'puede_ver');
    },
    
    puedeCrear(ruta) {
        return this.tienePermiso(ruta, 'puede_crear');
    },
    
    puedeEditar(ruta) {
        return this.tienePermiso(ruta, 'puede_editar');
    },
    
    puedeEliminar(ruta) {
        return this.tienePermiso(ruta, 'puede_eliminar');
    },
    
    // ================= ES ADMINISTRADOR =================
    esAdministrador() {
        return this.rol === 'administrador';
    },
    
    esModerador() {
        return this.rol === 'moderador';
    },
    
    esConsultor() {
        return this.rol === 'consultor';
    },
    
    // ================= PROTEGER PÁGINA =================
    async protegerPagina(rutaRequerida) {
        const autorizado = await this.init();
        
        if (!autorizado) {
            window.location.href = '../index.html';
            return false;
        }
        
        if (rutaRequerida && !this.puedeVer(rutaRequerida)) {
            alert('❌ No tienes permisos para acceder a esta página');
            window.location.href = '../dashboard.html';
            return false;
        }
        
        return true;
    },
    
    // ================= OCULTAR ELEMENTOS SIN PERMISO =================
    ocultarSinPermiso() {
        document.querySelectorAll('[data-requiere-permiso]').forEach(element => {
            const ruta = element.getAttribute('data-requiere-permiso');
            const accion = element.getAttribute('data-accion') || 'puede_ver';
            
            if (!this.tienePermiso(ruta, accion)) {
                element.style.display = 'none';
            }
        });
    },
    
    // ================= MOSTRAR INFORMACIÓN DE USUARIO =================
    mostrarInfoUsuario() {
        const userEmail = document.getElementById('userEmail');
        const userRole = document.getElementById('userRole');
        
        if (userEmail && this.usuario) {
            userEmail.textContent = this.usuario.email.split('@')[0];
            userEmail.title = this.usuario.email;
        }
        
        if (userRole && this.rol) {
            userRole.textContent = this.rol.toUpperCase();
            userRole.className = `role-badge role-${this.rol}`;
        }
    }
};

// ================= FUNCIONES GLOBALES =================
async function verificarSesion() {
    return await RBAC.init();
}

async function protegerPagina(ruta) {
    return await RBAC.protegerPagina(ruta);
}

function ocultarBotonesSinPermiso() {
    RBAC.ocultarSinPermiso();
}

function mostrarInfoUsuario() {
    RBAC.mostrarInfoUsuario();
}
