/**
* MIDDLEWARE DE AUTENTICACIÓN Y PERMISOS
* Se incluye en TODAS las páginas protegidas
*/

const PERMISOS_REQUERIDOS = {
    'transporte.html': 'transporte_ver',
    'planilla.html': 'planilla_ver',
    'planilla-consultar.html': 'planilla_consultar',
    'planilla-registrar.html': 'planilla_crear',
    'planilla-modificar.html': 'planilla_editar',
    'ficha.html': 'transporte_ficha',
    'acta.html': 'transporte_acta',
    'inspeccion.html': 'transporte_inspeccion',
    'gestion-usuarios.html': 'admin_usuarios'
};

async function verificarPermisoPagina() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            window.location.href = '../../index.html';
            return false;
        }
        
        // Obtener perfil del usuario
        const { data: perfil } = await supabaseClient
            .from('perfiles')
            .select('*, roles(nombre)')
            .eq('id', session.user.id)
            .single();
        
        if (!perfil) {
            window.location.href = '../../index.html';
            return false;
        }
        
        // Administrador tiene acceso total
        if (perfil.roles.nombre === 'administrador') {
            return true;
        }
        
        // Verificar permisos específicos
        const paginaActual = window.location.pathname.split('/').pop();
        const permisoRequerido = PERMISOS_REQUERIDOS[paginaActual];
        
        if (!permisoRequerido) {
            return true; // Página sin restricción
        }
        
        const { data: permiso } = await supabaseClient
            .from('permisos')
            .select('puede_ver')
            .eq('rol_id', perfil.rol_id)
            .eq('boton_id', permisoRequerido)
            .single();
        
        if (!permiso?.puede_ver) {
            window.location.href = '../../dashboard.html';
            alert('No tienes permisos para acceder a esta página');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error verificando permiso:', error);
        window.location.href = '../../index.html';
        return false;
    }
}

// Ocultar botones sin permiso
async function ocultarBotonesSinPermiso() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;
    
    const { data: perfil } = await supabaseClient
        .from('perfiles')
        .select('*, roles(nombre)')
        .eq('id', session.user.id)
        .single();
    
    if (!perfil || perfil.roles.nombre === 'administrador') return;
    
    const { data: permisos } = await supabaseClient
        .from('permisos')
        .select('botones(ruta)')
        .eq('rol_id', perfil.rol_id)
        .eq('puede_ver', true);
    
    const rutasPermitidas = permisos.map(p => p.botones.ruta);
    
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (rutasPermitidas.some(ruta => href.includes(ruta))) {
            // Permitido
        } else {
            link.closest('.module-card, .transporte-btn, .planilla-btn')?.style.display = 'none';
        }
    });
}
