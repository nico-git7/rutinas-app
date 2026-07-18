const URL_BASE = 'https://rutinas-app-yg31.onrender.com';

// El "600" antes del nombre del recurso le dice al backend:
// "cada rutina/ejercicio/historial pertenece a un usuario, y solo ese usuario puede verlo o editarlo"
const RUTINAS_PATH = '600/rutinas';
const EJERCICIOS_PATH = '600/ejercicios';
const HISTORIAL_PATH = '600/historial';

// --- Estado de sesión ---
let authToken = localStorage.getItem('authToken') || null;
let authUserEmail = localStorage.getItem('authUserEmail') || null;
let authUserId = localStorage.getItem('authUserId') || null;

function apiConfig() {
    return { headers: { Authorization: `Bearer ${authToken}` } };
}

// --- Referencias del DOM: Auth ---
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const usuarioInfo = document.getElementById('usuario-info');
const usuarioEmailSpan = document.getElementById('usuario-email');
const btnLogout = document.getElementById('btn-logout');

const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const btnMostrarRegistro = document.getElementById('btn-mostrar-registro');
const btnMostrarLogin = document.getElementById('btn-mostrar-login');
const volverALoginContainer = document.getElementById('volver-a-login-container');
const authError = document.getElementById('auth-error');

const btnIrAdmin = document.getElementById('btn-ir-admin');
const adminLoginSection = document.getElementById('admin-login-section');
const adminPanelSection = document.getElementById('admin-panel-section');
const formAdminLogin = document.getElementById('form-admin-login');
const btnVolverLoginDesdeAdmin = document.getElementById('btn-volver-login-desde-admin');
const btnCerrarAdmin = document.getElementById('btn-cerrar-admin');
const adminUsuariosLista = document.getElementById('admin-usuarios-lista');
const adminLoginError = document.getElementById('admin-login-error');

let claveAdminActual = null;

// --- Referencias del DOM: App ---
const formRutina = document.getElementById('form-rutina');
const listaRutinas = document.getElementById('lista-rutinas');
const seccionEjercicios = document.getElementById('ejercicios-section');
const rutinaActivaNombre = document.getElementById('rutina-activa-nombre');
const rutinaIdActual = document.getElementById('rutina-id-actual');
const formEjercicio = document.getElementById('form-ejercicio');
const listaEjercicios = document.getElementById('lista-ejercicios');
const btnRegistrarEntrenamiento = document.getElementById('btn-registrar-entrenamiento');
const listaHistorial = document.getElementById('lista-historial');
const btnSubmitRutina = document.getElementById('btn-submit-rutina');
const btnCancelarRutina = document.getElementById('btn-cancelar-rutina');
const btnSubmitEjercicio = document.getElementById('btn-submit-ejercicio');
const btnCancelarEjercicio = document.getElementById('btn-cancelar-ejercicio');

let editandoRutinaId = null;
let editandoEjercicioId = null;
let rutinasCache = [];
let ejerciciosCache = [];

// =========================================================
// AUTENTICACIÓN
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        mostrarApp();
    } else {
        mostrarAuth();
    }
});

function mostrarAuth() {
    authSection.classList.remove('hidden');
    appContent.classList.add('hidden');
    usuarioInfo.classList.add('hidden');
}

function mostrarApp() {
    authSection.classList.add('hidden');
    appContent.classList.remove('hidden');
    usuarioInfo.classList.remove('hidden');
    usuarioEmailSpan.textContent = authUserEmail || '';
    obtenerRutinas();
}

function mostrarErrorAuth(mensaje) {
    authError.textContent = mensaje;
    authError.classList.remove('hidden');
}

function ocultarErrorAuth() {
    authError.classList.add('hidden');
    authError.textContent = '';
}

btnMostrarRegistro.addEventListener('click', () => {
    formLogin.classList.add('hidden');
    formRegistro.classList.remove('hidden');
    btnMostrarRegistro.parentElement.classList.add('hidden');
    volverALoginContainer.classList.remove('hidden');
    ocultarErrorAuth();
});

btnMostrarLogin.addEventListener('click', () => {
    formRegistro.classList.add('hidden');
    formLogin.classList.remove('hidden');
    btnMostrarRegistro.parentElement.classList.remove('hidden');
    volverALoginContainer.classList.add('hidden');
    ocultarErrorAuth();
});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarErrorAuth();
    const email = document.getElementById('email-login').value;
    const password = document.getElementById('password-login').value;

    try {
        const response = await axios.post(`${URL_BASE}/login`, { email, password });
        guardarSesion(response.data.accessToken, email, response.data.user.id);
        formLogin.reset();
        mostrarApp();
    } catch (error) {
        mostrarErrorAuth('Email o contraseña incorrectos.');
    }
});

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarErrorAuth();
    const secretoAdmin = document.getElementById('secreto-admin').value;
    const email = document.getElementById('email-registro').value;
    const password = document.getElementById('password-registro').value;

    try {
        const response = await axios.post(`${URL_BASE}/register`, { email, password }, {
            headers: { 'x-admin-secret': secretoAdmin }
        });
        guardarSesion(response.data.accessToken, email, response.data.user.id);
        formRegistro.reset();
        mostrarApp();
    } catch (error) {
        if (error.response && error.response.status === 403) {
            mostrarErrorAuth('Clave de administrador incorrecta.');
        } else if (error.response && error.response.status === 400) {
            mostrarErrorAuth('Ese email ya está registrado.');
        } else {
            mostrarErrorAuth('No se pudo crear la cuenta. Probá de nuevo.');
        }
    }
});

function guardarSesion(token, email, userId) {
    authToken = token;
    authUserEmail = email;
    authUserId = userId;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUserEmail', email);
    localStorage.setItem('authUserId', userId);
}

btnLogout.addEventListener('click', () => {
    authToken = null;
    authUserEmail = null;
    authUserId = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUserEmail');
    localStorage.removeItem('authUserId');
    mostrarAuth();
});

// =========================================================
// PANEL DE ADMINISTRADOR
// =========================================================

btnIrAdmin.addEventListener('click', () => {
    authSection.classList.add('hidden');
    adminLoginSection.classList.remove('hidden');
});

btnVolverLoginDesdeAdmin.addEventListener('click', () => {
    adminLoginSection.classList.add('hidden');
    authSection.classList.remove('hidden');
});

formAdminLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminLoginError.classList.add('hidden');
    const clave = document.getElementById('clave-admin-panel').value;

    try {
        const response = await axios.get(`${URL_BASE}/admin/usuarios`, {
            headers: { 'x-admin-secret': clave }
        });
        claveAdminActual = clave;
        formAdminLogin.reset();
        adminLoginSection.classList.add('hidden');
        adminPanelSection.classList.remove('hidden');
        renderizarPanelAdmin(response.data);
    } catch (error) {
        adminLoginError.textContent = 'Clave incorrecta.';
        adminLoginError.classList.remove('hidden');
    }
});

async function renderizarPanelAdmin(usuarios) {
    let rutinas = [];
    try {
        const response = await axios.get(`${URL_BASE}/admin/rutinas`, {
            headers: { 'x-admin-secret': claveAdminActual }
        });
        rutinas = response.data;
    } catch (error) {
        console.error('Error al obtener rutinas para el panel de admin:', error);
    }

    adminUsuariosLista.innerHTML = '';
    usuarios.forEach(usuario => {
        const rutinasDeEsteUsuario = rutinas.filter(r => String(r.userId) === String(usuario.id));
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${usuario.email}</h3>
            <p><strong>${rutinasDeEsteUsuario.length}</strong> rutina(s) creada(s)</p>
            <ul>
                ${rutinasDeEsteUsuario.map(r => `<li>${r.nombre} (${r.dias.join(', ')})</li>`).join('') || '<li>Sin rutinas todavía</li>'}
            </ul>
            <div class="card-actions">
                <button onclick="resetearPasswordUsuario('${usuario.id}', '${usuario.email}')">Resetear Contraseña</button>
            </div>
        `;
        adminUsuariosLista.appendChild(div);
    });
}

async function resetearPasswordUsuario(userId, email) {
    const nuevaContrasena = prompt(`Nueva contraseña para ${email} (mínimo 6 caracteres):`);
    if (!nuevaContrasena) return;
    if (nuevaContrasena.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        await axios.post(`${URL_BASE}/admin/reset-password`,
            { userId, nuevaContrasena },
            { headers: { 'x-admin-secret': claveAdminActual } }
        );
        alert(`Contraseña de ${email} actualizada correctamente.`);
    } catch (error) {
        alert('No se pudo actualizar la contraseña.');
    }
}

btnCerrarAdmin.addEventListener('click', () => {
    claveAdminActual = null;
    adminPanelSection.classList.add('hidden');
    authSection.classList.remove('hidden');
});

// =========================================================
// CRUD 1: RUTINAS
// =========================================================

async function obtenerRutinas() {
    try {
        const response = await axios.get(`${URL_BASE}/${RUTINAS_PATH}`, apiConfig());
        rutinasCache = response.data;
        renderizarRutinas(response.data);
    } catch (error) {
        console.error("Error al obtener rutinas:", error);
    }
}

function renderizarRutinas(rutinas) {
    listaRutinas.innerHTML = '';
    rutinas.forEach(rutina => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${rutina.nombre}</h3>
            <p><strong>Días:</strong> ${rutina.dias.join(', ')}</p>
            <div class="card-actions">
                <button onclick="verDetalleRutina('${rutina.id}', '${rutina.nombre}')">Ver Ejercicios</button>
                <button onclick="editarRutina('${rutina.id}')">Editar</button>
                <button class="btn-eliminar" onclick="eliminarRutina('${rutina.id}')">Eliminar</button>
            </div>
        `;
        listaRutinas.appendChild(div);
    });
}

formRutina.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-rutina').value;
    const dias = document.getElementById('dias-rutina').value.split(',').map(d => d.trim());

    try {
        if (editandoRutinaId) {
            await axios.patch(`${URL_BASE}/${RUTINAS_PATH}/${editandoRutinaId}`, { nombre, dias }, apiConfig());
        } else {
            await axios.post(`${URL_BASE}/${RUTINAS_PATH}`, { nombre, dias, userId: authUserId }, apiConfig());
        }
        cancelarEdicionRutina();
        obtenerRutinas();
    } catch (error) {
        console.error("Error al guardar rutina:", error);
    }
});

function editarRutina(id) {
    const rutina = rutinasCache.find(r => String(r.id) === String(id));
    if (!rutina) return;

    editandoRutinaId = id;
    document.getElementById('nombre-rutina').value = rutina.nombre;
    document.getElementById('dias-rutina').value = rutina.dias.join(', ');
    btnSubmitRutina.textContent = 'Guardar Cambios';
    btnCancelarRutina.classList.remove('hidden');
    document.getElementById('nombre-rutina').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelarEdicionRutina() {
    editandoRutinaId = null;
    formRutina.reset();
    btnSubmitRutina.textContent = 'Crear Rutina';
    btnCancelarRutina.classList.add('hidden');
}

btnCancelarRutina.addEventListener('click', cancelarEdicionRutina);

async function eliminarRutina(id) {
    if (!confirm('¿Seguro que quieres eliminar esta rutina y todos sus datos?')) return;

    try {
        const resEjercicios = await axios.get(`${URL_BASE}/${EJERCICIOS_PATH}?rutinaId=${id}`, apiConfig());
        for (const ej of resEjercicios.data) {
            await axios.delete(`${URL_BASE}/${EJERCICIOS_PATH}/${ej.id}`, apiConfig());
        }

        const resHistorial = await axios.get(`${URL_BASE}/${HISTORIAL_PATH}?rutinaId=${id}`, apiConfig());
        for (const hist of resHistorial.data) {
            await axios.delete(`${URL_BASE}/${HISTORIAL_PATH}/${hist.id}`, apiConfig());
        }

        await axios.delete(`${URL_BASE}/${RUTINAS_PATH}/${id}`, apiConfig());

        obtenerRutinas();
        seccionEjercicios.classList.add('hidden');
    } catch (error) {
        console.error("Error al eliminar rutina en cascada:", error);
    }
}

function verDetalleRutina(id, nombre) {
    rutinaIdActual.value = id;
    rutinaActivaNombre.textContent = nombre;
    seccionEjercicios.classList.remove('hidden');
    cancelarEdicionEjercicio();
    obtenerEjercicios(id);
    obtenerHistorial(id);
}

// =========================================================
// CRUD 2: EJERCICIOS
// =========================================================

async function obtenerEjercicios(rutinaId) {
    try {
        const response = await axios.get(`${URL_BASE}/${EJERCICIOS_PATH}?rutinaId=${rutinaId}`, apiConfig());
        ejerciciosCache = response.data;
        renderizarEjercicios(response.data);
    } catch (error) {
        console.error("Error al obtener ejercicios:", error);
    }
}

function renderizarEjercicios(ejercicios) {
    listaEjercicios.innerHTML = '';
    ejercicios.forEach(ej => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h4>${ej.nombre}</h4>
            <p>${ej.series} series x ${ej.repeticiones} reps${ej.peso ? ' — ' + ej.peso + ' kg' : ''}</p>
            <p>Descanso: ${ej.descanso}</p>
            <div class="card-actions">
                <button onclick="editarEjercicio('${ej.id}')">Editar</button>
                <button class="btn-eliminar" onclick="eliminarEjercicio('${ej.id}')">Eliminar</button>
            </div>
        `;
        listaEjercicios.appendChild(div);
    });
}

formEjercicio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rutinaId = document.getElementById('rutina-id-actual').value;
    const pesoValor = document.getElementById('peso-ejercicio').value;
    const datosEjercicio = {
        rutinaId: rutinaId,
        userId: authUserId,
        nombre: document.getElementById('nombre-ejercicio').value,
        series: parseInt(document.getElementById('series-ejercicio').value),
        repeticiones: parseInt(document.getElementById('reps-ejercicio').value),
        peso: pesoValor ? parseFloat(pesoValor) : null,
        descanso: document.getElementById('descanso-ejercicio').value
    };

    try {
        if (editandoEjercicioId) {
            await axios.patch(`${URL_BASE}/${EJERCICIOS_PATH}/${editandoEjercicioId}`, datosEjercicio, apiConfig());
        } else {
            await axios.post(`${URL_BASE}/${EJERCICIOS_PATH}`, datosEjercicio, apiConfig());
        }
        cancelarEdicionEjercicio();
        obtenerEjercicios(rutinaId);
    } catch (error) {
        console.error("Error al guardar ejercicio:", error);
    }
});

function editarEjercicio(id) {
    const ejercicio = ejerciciosCache.find(e => String(e.id) === String(id));
    if (!ejercicio) return;

    editandoEjercicioId = id;
    document.getElementById('nombre-ejercicio').value = ejercicio.nombre;
    document.getElementById('series-ejercicio').value = ejercicio.series;
    document.getElementById('reps-ejercicio').value = ejercicio.repeticiones;
    document.getElementById('peso-ejercicio').value = ejercicio.peso || '';
    document.getElementById('descanso-ejercicio').value = ejercicio.descanso;
    btnSubmitEjercicio.textContent = 'Guardar Cambios';
    btnCancelarEjercicio.classList.remove('hidden');
    document.getElementById('nombre-ejercicio').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelarEdicionEjercicio() {
    editandoEjercicioId = null;
    formEjercicio.reset();
    btnSubmitEjercicio.textContent = 'Agregar Ejercicio';
    btnCancelarEjercicio.classList.add('hidden');
}

btnCancelarEjercicio.addEventListener('click', cancelarEdicionEjercicio);

async function eliminarEjercicio(id) {
    try {
        await axios.delete(`${URL_BASE}/${EJERCICIOS_PATH}/${id}`, apiConfig());
        obtenerEjercicios(rutinaIdActual.value);
    } catch (error) {
        console.error("Error al eliminar ejercicio:", error);
    }
}

// =========================================================
// CRUD 3: HISTORIAL
// =========================================================

async function obtenerHistorial(rutinaId) {
    try {
        const response = await axios.get(`${URL_BASE}/${HISTORIAL_PATH}?rutinaId=${rutinaId}`, apiConfig());
        const historialInvertido = response.data.reverse();
        renderizarHistorial(historialInvertido);
    } catch (error) {
        console.error("Error al obtener historial:", error);
    }
}

function renderizarHistorial(historial) {
    listaHistorial.innerHTML = '';
    historial.forEach(registro => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${registro.fecha}</strong> - ${registro.observacion || 'Completado'}</span>
            <button class="btn-eliminar" onclick="eliminarHistorial('${registro.id}')">X</button>
        `;
        listaHistorial.appendChild(li);
    });
}

btnRegistrarEntrenamiento.addEventListener('click', async () => {
    const rutinaId = document.getElementById('rutina-id-actual').value;
    const observacion = prompt("¿Alguna observación para el entrenamiento? (Opcional)");

    if (observacion !== null) {
        const nuevoRegistro = {
            rutinaId: rutinaId,
            userId: authUserId,
            fecha: new Date().toLocaleDateString(),
            observacion: observacion
        };

        try {
            await axios.post(`${URL_BASE}/${HISTORIAL_PATH}`, nuevoRegistro, apiConfig());
            obtenerHistorial(rutinaId);
        } catch (error) {
            console.error("Error al registrar historial:", error);
        }
    }
});

async function eliminarHistorial(id) {
    if (!confirm('¿Borrar este registro del historial?')) return;
    try {
        await axios.delete(`${URL_BASE}/${HISTORIAL_PATH}/${id}`, apiConfig());
        obtenerHistorial(rutinaIdActual.value);
    } catch (error) {
        console.error("Error al eliminar historial:", error);
    }
}