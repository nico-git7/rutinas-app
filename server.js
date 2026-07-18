const jsonServer = require('json-server');
const auth = require('json-server-auth');
const bcrypt = require('bcryptjs');

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.db = router.db;

server.use(middlewares);

// Clave secreta que solo vos conocés, necesaria para crear cuentas nuevas
// y para entrar al panel de administrador.
const ADMIN_SECRET = 'nicolas1234';

function verificarAdmin(req, res, next) {
  const secretoRecibido = req.headers['x-admin-secret'];
  if (secretoRecibido !== ADMIN_SECRET) {
    return res.status(403).json({ message: 'No autorizado.' });
  }
  next();
}

// Bloquear el auto-registro: solo se puede crear una cuenta nueva
// si la petición incluye la clave secreta correcta.
server.post('/register', verificarAdmin, (req, res, next) => {
  next();
});

// --- Panel de administrador ---

// Lista de todos los usuarios registrados (sin contraseñas)
server.get('/admin/usuarios', verificarAdmin, (req, res) => {
  const usuarios = server.db.get('users').value().map(u => ({ id: u.id, email: u.email }));
  res.json(usuarios);
});

// Todas las rutinas de todos los usuarios
server.get('/admin/rutinas', verificarAdmin, (req, res) => {
  const rutinas = server.db.get('rutinas').value();
  res.json(rutinas);
});

// Resetear la contraseña de un usuario
server.post('/admin/reset-password', verificarAdmin, (req, res) => {
  const { userId, nuevaContrasena } = req.body;
  if (!userId || !nuevaContrasena || nuevaContrasena.length < 6) {
    return res.status(400).json({ message: 'Datos inválidos.' });
  }
  const hash = bcrypt.hashSync(nuevaContrasena, 10);
  const usuario = server.db.get('users').find(u => String(u.id) === String(userId));
  if (!usuario.value()) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
  usuario.assign({ password: hash }).write();
  res.json({ message: 'Contraseña actualizada.' });
});

server.use(auth);
server.use(router);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Servidor con autenticación corriendo en el puerto ${port}`);
});