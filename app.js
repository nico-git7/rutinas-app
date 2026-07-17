const URL_BASE = 'https://rutinas-app-yg31.onrender.com';type app.js

// Referencias del DOM
const formRutina = document.getElementById('form-rutina');
const listaRutinas = document.getElementById('lista-rutinas');
const seccionEjercicios = document.getElementById('ejercicios-section');
const rutinaActivaNombre = document.getElementById('rutina-activa-nombre');
const rutinaIdActual = document.getElementById('rutina-id-actual');
const formEjercicio = document.getElementById('form-ejercicio');
const listaEjercicios = document.getElementById('lista-ejercicios');
const btnRegistrarEntrenamiento = document.getElementById('btn-registrar-entrenamiento');
const listaHistorial = document.getElementById('lista-historial');

// Cargar rutinas al iniciar
document.addEventListener('DOMContentLoaded', obtenerRutinas);

// --- CRUD 1: RUTINAS ---

async function obtenerRutinas() {
    try {
        const response = await axios.get(`${URL_BASE}/rutinas`);
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
        await axios.post(`${URL_BASE}/rutinas`, { nombre, dias });
        formRutina.reset();
        obtenerRutinas(); 
    } catch (error) {
        console.error("Error al crear rutina:", error);
    }
});

async function eliminarRutina(id) {
    if(!confirm('¿Seguro que quieres eliminar esta rutina y todos sus datos?')) return;
    
    try {
        // Eliminación en cascada: Ejercicios
        const resEjercicios = await axios.get(`${URL_BASE}/ejercicios?rutinaId=${id}`);
        for (const ej of resEjercicios.data) {
            await axios.delete(`${URL_BASE}/ejercicios/${ej.id}`);
        }
        
        // Eliminación en cascada: Historial
        const resHistorial = await axios.get(`${URL_BASE}/historial?rutinaId=${id}`);
        for (const hist of resHistorial.data) {
            await axios.delete(`${URL_BASE}/historial/${hist.id}`);
        }
        
        // Eliminar la rutina en sí
        await axios.delete(`${URL_BASE}/rutinas/${id}`);
        
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
    obtenerEjercicios(id);
    obtenerHistorial(id);
}

// --- CRUD 2: EJERCICIOS ---

async function obtenerEjercicios(rutinaId) {
    try {
        const response = await axios.get(`${URL_BASE}/ejercicios?rutinaId=${rutinaId}`);
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
            <p>${ej.series} series x ${ej.repeticiones} reps</p>
            <p>Descanso: ${ej.descanso}</p>
            <div class="card-actions">
                <button class="btn-eliminar" onclick="eliminarEjercicio('${ej.id}')">Eliminar</button>
            </div>
        `;
        listaEjercicios.appendChild(div);
    });
}

formEjercicio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rutinaId = document.getElementById('rutina-id-actual').value;
    const nuevoEjercicio = {
        rutinaId: rutinaId,
        nombre: document.getElementById('nombre-ejercicio').value,
        series: parseInt(document.getElementById('series-ejercicio').value),
        repeticiones: parseInt(document.getElementById('reps-ejercicio').value),
        descanso: document.getElementById('descanso-ejercicio').value
    };

    try {
        await axios.post(`${URL_BASE}/ejercicios`, nuevoEjercicio);
        formEjercicio.reset();
        obtenerEjercicios(rutinaId);
    } catch (error) {
        console.error("Error al crear ejercicio:", error);
    }
});

async function eliminarEjercicio(id) {
    try {
        await axios.delete(`${URL_BASE}/ejercicios/${id}`);
        obtenerEjercicios(rutinaIdActual.value);
    } catch (error) {
        console.error("Error al eliminar ejercicio:", error);
    }
}

// --- CRUD 3: HISTORIAL ---

async function obtenerHistorial(rutinaId) {
    try {
        const response = await axios.get(`${URL_BASE}/historial?rutinaId=${rutinaId}`);
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
            fecha: new Date().toLocaleDateString(),
            observacion: observacion
        };

        try {
            await axios.post(`${URL_BASE}/historial`, nuevoRegistro);
            obtenerHistorial(rutinaId);
        } catch (error) {
            console.error("Error al registrar historial:", error);
        }
    }
});

async function eliminarHistorial(id) {
    if(!confirm('¿Borrar este registro del historial?')) return;
    try {
        await axios.delete(`${URL_BASE}/historial/${id}`);
        obtenerHistorial(rutinaIdActual.value);
    } catch (error) {
        console.error("Error al eliminar historial:", error);
    }
}