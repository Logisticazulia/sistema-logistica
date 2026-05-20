document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // INICIALIZACIÓN DE SUPABASE
    // ==========================================
    async function initSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 50) {
            await new Promise(res => setTimeout(res, 100));
            attempts++;
        }
        
        if (!window.supabase) {
            mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.');
            return null;
        }
        
        if (window.supabase.auth) return window.supabase;
        
        const createFn = window.supabase.createClient || window.createClient;
        if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
            try {
                window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
                return window.supabase;
            } catch (err) {
                console.error('❌ Error inicializando Supabase:', err);
                return null;
            }
        }
        return null;
    }

    const supabase = await initSupabase();
    if (!supabase) return;

    // ==========================================
    // VARIABLES GLOBALES
    // ==========================================
    let usuarioActual = null;
    
    // Elementos del DOM
    const searchInput = document.getElementById('searchInspection');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchText = btnSearch?.querySelector('.btn-search-text');
    const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
    const motoForm = document.getElementById('motoForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnClear = document.getElementById('btnClear');
    const recordIdInput = document.getElementById('recordId');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');

    // ==========================================
    // FUNCIONES DE UTILIDAD
    // ==========================================
    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => {
            if(el) el.style.display = 'none';
        });
        
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if(target) {
            const span = target.querySelector('span:last-child');
            if(span) span.textContent = mensaje;
            target.style.display = 'flex';
        }
        
        // Auto-ocultar después de 5 segundos
        if (tipo !== 'info') {
            setTimeout(() => {
                if(target) target.style.display = 'none';
            }, 5000);
        }
    }

    function toggleFormState(activo) {
        if (!motoForm) return;
        motoForm.style.opacity = activo ? '1' : '0.6';
        motoForm.style.pointerEvents = activo ? 'auto' : 'none';
        
        if (btnSubmit) {
            btnSubmit.disabled = !activo || !usuarioActual;
        }
    }

    // ==========================================
    // VERIFICAR SESIÓN
    // ==========================================
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            usuarioActual = user;
            const el = document.getElementById('userEmail');
            if(el) el.textContent = user.email || 'Usuario';
        }
    } catch (err) {
        console.warn('⚠️ Sesión no verificada:', err);
    }

    // ==========================================
    // FUNCIÓN DE BÚSQUEDA
    // ==========================================
    async function buscarInspeccion() {
        const q = searchInput?.value.trim();
        
        if(!q) {
            mostrarAlerta('info', 'Ingrese N° Inspección o Placa');
            return;
        }

        if(btnSearch) {
            btnSearch.disabled = true;
            if(btnSearchText) btnSearchText.style.display = 'none';
            if(btnSearchLoader) btnSearchLoader.style.display = 'inline';
        }
        
        mostrarAlerta('info', '🔍 Buscando...');

        try {
            const cleanQ = q.replace(/\s+/g, '').toUpperCase();
            
            const { data, error } = await supabase
                .from('inspecciones_pvr')
                .select('*')
                .or(`n_inspeccion.ilike.%${cleanQ}%,placa.ilike.%${cleanQ}%`)
                .limit(1)
                .maybeSingle();

            if(error) throw error;
            
            if(!data) {
                mostrarAlerta('error', '❌ Inspección no encontrada');
                toggleFormState(false);
                return;
            }

            // Cargar datos básicos
            recordIdInput.value = data.id;
            
            const camposBasicos = [
                'n_inspeccion', 'fecha_inspeccion', 'hora', 'motivo_inspeccion',
                'lugar', 'asignacion', 'supervision', 'placa', 'marca', 'modelo',
                'ano', 'color', 's_carroceria', 's_motor', 'n_identificacion',
                'observaciones', 'coord_nombre', 'coord_rango', 'coord_cedula',
                'coord_telefono', 'insp_nombre', 'insp_rango', 'insp_cedula', 'insp_telefono'
            ];

            camposBasicos.forEach(campo => {
                const el = document.getElementById(campo);
                if(el) {
                    el.value = data[campo] || '';
                }
            });

            // Cargar componentes desde JSONB
            const comps = data.componentes_moto || {};
            
            document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
                const nombreComponente = radio.name;
                const valorComponente = comps[nombreComponente];
                
                if (valorComponente) {
                    radio.checked = (radio.value === valorComponente);
                } else {
                    radio.checked = false;
                }
            });

            toggleFormState(true);
            updatePreview();
            mostrarAlerta('success', '✅ Inspección cargada. Edite y actualice.');
            
        } catch(err) {
            console.error('❌ Error en búsqueda:', err);
            mostrarAlerta('error', `Error: ${err.message}`);
        } finally {
            if(btnSearch) {
                btnSearch.disabled = false;
                if(btnSearchText) btnSearchText.style.display = 'inline';
                if(btnSearchLoader) btnSearchLoader.style.display = 'none';
            }
        }
    }

    // ==========================================
    // LIMPIAR FORMULARIO
    // ==========================================
    function limpiarFormulario() {
        if(searchInput) searchInput.value = '';
        if(motoForm) motoForm.reset();
        if(recordIdInput) recordIdInput.value = '';
        
        toggleFormState(false);
        updatePreview();
        mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
    }

    // ==========================================
    // ACTUALIZAR VISTA PREVIA
    // ==========================================
    function updatePreview() {
        const v = (id) => {
            const el = document.getElementById(id);
            return el?.value || '-';
        };
        
        const vs = (id) => {
            const el = document.getElementById(id);
            return el?.options[el.selectedIndex]?.text || '-';
        };

        // Datos básicos
        const pv_n_inspeccion = document.getElementById('pv_n_inspeccion');
        const pv_fecha = document.getElementById('pv_fecha');
        const pv_hora = document.getElementById('pv_hora');
        const pv_motivo = document.getElementById('pv_motivo');
        const pv_lugar = document.getElementById('pv_lugar');
        const pv_placa = document.getElementById('pv_placa');
        const pv_marca_modelo = document.getElementById('pv_marca_modelo');
        const pv_ano_tipo = document.getElementById('pv_ano_tipo');
        const pv_color = document.getElementById('pv_color');
        const pv_s_carroceria = document.getElementById('pv_s_carroceria');
        const pv_s_motor = document.getElementById('pv_s_motor');
        const pv_n_id = document.getElementById('pv_n_id');
        const pv_observaciones = document.getElementById('pv_observaciones');
        const pv_coord_nombre = document.getElementById('pv_coord_nombre');
        const pv_coord_rango = document.getElementById('pv_coord_rango');
        const pv_coord_cedula = document.getElementById('pv_coord_cedula');
        const pv_insp_nombre = document.getElementById('pv_insp_nombre');
        const pv_insp_rango = document.getElementById('pv_insp_rango');
        const pv_insp_cedula = document.getElementById('pv_insp_cedula');

        if(pv_n_inspeccion) pv_n_inspeccion.textContent = v('n_inspeccion');
        if(pv_fecha) pv_fecha.textContent = v('fecha_inspeccion');
        if(pv_hora) pv_hora.textContent = v('hora');
        if(pv_motivo) pv_motivo.textContent = v('motivo_inspeccion');
        if(pv_lugar) pv_lugar.textContent = `${v('lugar')} / ${v('asignacion')}`;
        if(pv_placa) pv_placa.textContent = v('placa');
        if(pv_marca_modelo) pv_marca_modelo.textContent = `${v('marca')} ${v('modelo')}`;
        if(pv_ano_tipo) pv_ano_tipo.textContent = `${v('ano')} - MOTO`;
        if(pv_color) pv_color.textContent = v('color');
        if(pv_s_carroceria) pv_s_carroceria.textContent = v('s_carroceria');
        if(pv_s_motor) pv_s_motor.textContent = v('s_motor');
        if(pv_n_id) pv_n_id.textContent = v('n_identificacion');
        if(pv_observaciones) pv_observaciones.textContent = v('observaciones') || 'Sin observaciones.';
        if(pv_coord_nombre) pv_coord_nombre.textContent = v('coord_nombre');
        if(pv_coord_rango) pv_coord_rango.textContent = vs('coord_rango');
        if(pv_coord_cedula) pv_coord_cedula.textContent = v('coord_cedula');
        if(pv_insp_nombre) pv_insp_nombre.textContent = v('insp_nombre');
        if(pv_insp_rango) pv_insp_rango.textContent = vs('insp_rango');
        if(pv_insp_cedula) pv_insp_cedula.textContent = v('insp_cedula');

        // Componentes
        const compGrid = document.getElementById('pv_comps_grid');
        if(compGrid) {
            compGrid.innerHTML = '';
            
            document.querySelectorAll('.inspection-item').forEach(item => {
                const labelEl = item.querySelector('.item-label');
                const radio = item.querySelector('input:checked');
                
                if (labelEl) {
                    const label = labelEl.textContent || '';
                    const val = radio?.value || 'NT';
                    const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
                    
                    const div = document.createElement('div');
                    div.className = 'pv-comp';
                    div.innerHTML = `
                        <div class="pv-comp-label">${label}</div>
                        <div class="pv-comp-status ${cls}">${val}</div>
                    `;
                    compGrid.appendChild(div);
                }
            });
        }
    }

    // ==========================================
    // OBTENER VALORES DE COMPONENTES
    // ==========================================
    function getComponentesMotoValues() {
        const componentes = {};
        
        document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
            if (!componentes[radio.name]) {
                componentes[radio.name] = 'NT'; // Valor por defecto
            }
            if (radio.checked) {
                componentes[radio.name] = radio.value;
            }
        });
        
        return componentes;
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    if(btnSearch) {
        btnSearch.addEventListener('click', buscarInspeccion);
    }
    
    if(searchInput) {
        searchInput.addEventListener('keypress', e => {
            if(e.key === 'Enter') buscarInspeccion();
        });
    }
    
    if(btnClear) {
        btnClear.addEventListener('click', limpiarFormulario);
    }
    
    if(motoForm) {
        motoForm.addEventListener('input', updatePreview);
        motoForm.addEventListener('change', updatePreview);
        
        motoForm.addEventListener('submit', async e => {
            e.preventDefault();
            
            if(!usuarioActual) {
                mostrarAlerta('error', '🔐 Inicie sesión para guardar');
                return;
            }
            
            if(!recordIdInput.value) {
                mostrarAlerta('error', 'Busque una inspección primero');
                return;
            }
            
            btnSubmit.disabled = true;
            
            try {
                const payload = {
                    fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
                    hora: document.getElementById('hora')?.value || null,
                    motivo: document.getElementById('motivo_inspeccion')?.value || null,
                    lugar: document.getElementById('lugar')?.value || null,
                    asignacion: document.getElementById('asignacion')?.value || null,
                    supervision: document.getElementById('supervision')?.value || null,
                    observaciones: document.getElementById('observaciones')?.value || null,
                    coord_nombre: document.getElementById('coord_nombre')?.value || null,
                    coord_rango: document.getElementById('coord_rango')?.value || null,
                    coord_cedula: document.getElementById('coord_cedula')?.value || null,
                    coord_telefono: document.getElementById('coord_telefono')?.value || null,
                    insp_nombre: document.getElementById('insp_nombre')?.value || null,
                    insp_rango: document.getElementById('insp_rango')?.value || null,
                    insp_cedula: document.getElementById('insp_cedula')?.value || null,
                    insp_telefono: document.getElementById('insp_telefono')?.value || null,
                    componentes_moto: getComponentesMotoValues()
                };

                // Eliminar campos null
                Object.keys(payload).forEach(key => {
                    if (payload[key] === null || payload[key] === undefined) {
                        delete payload[key];
                    }
                });

                const { error } = await supabase
                    .from('inspecciones_pvr')
                    .update(payload)
                    .eq('id', recordIdInput.value);
                    
                if(error) throw error;
                
                mostrarAlerta('success', '✅ Inspección de Moto actualizada');
                
                if(alertSuccess) {
                    alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                setTimeout(() => {
                    limpiarFormulario();
                }, 2000);
                
            } catch(err) {
                console.error('❌ Error al actualizar:', err);
                mostrarAlerta('error', `Error: ${err.message}`);
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    // Inicializar vista previa
    updatePreview();
    mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
});
