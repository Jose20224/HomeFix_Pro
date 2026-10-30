const endpoint = (summary, secured = true, body, parameters) => ({
  summary, ...(secured ? { security: [{ bearerAuth: [] }] } : { security: [] }),
  ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: body } } } } : {}),
  ...(parameters ? { parameters } : {}),
  responses: { 200: { description: 'Operación exitosa' }, 201: { description: 'Registro creado' }, 400: { description: 'Datos inválidos' }, 401: { description: 'Token requerido o inválido' }, 403: { description: 'No autorizado' }, 404: { description: 'Registro no encontrado' }, 409: { description: 'Conflicto de estado o duplicado' } },
});
const string = { type: 'string' };
const integer = { type: 'integer', minimum: 1 };
const object = properties => ({ type: 'object', properties });
const pathId = [{ in: 'path', name: 'id', required: true, schema: integer }];
const paths = {};
const add = (url, method, summary, body, secured = true) => {
  paths[url] ||= {};
  paths[url][method] = endpoint(summary, secured, body, url.includes('{id}') ? pathId : undefined);
};
add('/api/auth/register', 'post', 'Registrar cliente, técnico o empresa', object({ email: string, password: { type: 'string', minLength: 8 }, fullName: string, role: { type: 'string', enum: ['CLIENTE', 'TECNICO', 'EMPRESA'] } }), false);
add('/api/auth/login', 'post', 'Iniciar sesión', object({ email: string, password: string }), false);
add('/api/auth/me', 'get', 'Perfil actual');
add('/api/auth/me', 'put', 'Actualizar perfil; specialty y bio solo para técnicos', object({ fullName: string, phone: string, address: string, specialty: { type: 'string', description: 'Código de una categoría, por ejemplo PLOMERIA' }, bio: { type: 'string', maxLength: 1000 } }));
add('/api/services/categories', 'get', 'Categorías', null, false);
add('/api/services/categories', 'post', 'Crear categoría (administrador)', object({ name: string, icon: string, description: string }));
add('/api/services/categories/{id}', 'put', 'Actualizar categoría (administrador)', object({ name: string, icon: string, description: string }));
add('/api/services/technicians', 'get', 'Directorio de técnicos activos y verificados');
add('/api/requests', 'post', 'Crear solicitud (cliente)', object({ categoryId: integer, title: string, description: string, address: string, neighborhood: string, urgency: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA'] } }));
for (const name of ['mine', 'available', 'all']) add('/api/requests/' + name, 'get', name === 'all' ? 'Todas las solicitudes (administrador)' : name === 'mine' ? 'Mis solicitudes' : 'Solicitudes disponibles sin domicilios');
add('/api/requests/{id}', 'get', 'Detalle para participantes o administrador');
add('/api/requests/{id}/accept', 'put', 'Aceptar solicitud (técnico verificado)');
add('/api/requests/{id}/status', 'put', 'Avanzar estado (técnico asignado o administrador)', object({ status: { type: 'string', enum: ['EN_PROGRESO', 'FINALIZADO'] } }));
add('/api/requests/{id}/cancel', 'put', 'Cancelar antes del inicio (cliente propietario o administrador)');
add('/api/reviews', 'post', 'Calificar un servicio propio finalizado', object({ requestId: integer, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: string }));
add('/api/reviews/technician/{id}', 'get', 'Reseñas públicas sin datos privados del servicio', null, false);
add('/api/schedule', 'post', 'Agendar servicio asignado propio', object({ requestId: integer, scheduledDate: { type: 'string', format: 'date-time' }, notes: string }));
add('/api/schedule/mine', 'get', 'Mi agenda');
add('/api/schedule/{id}', 'put', 'Modificar cita propia', object({ scheduledDate: { type: 'string', format: 'date-time' }, notes: string }));
add('/api/schedule/{id}', 'delete', 'Cancelar cita propia');
for (const name of ['', '/unread-count']) add('/api/notifications' + name, 'get', 'Mis notificaciones');
for (const name of ['/read-all', '/{id}/read']) add('/api/notifications' + name, 'put', 'Marcar notificaciones propias');
add('/api/verification/pending', 'get', 'Verificaciones pendientes (administrador)');
for (const action of ['approve', 'reject']) add('/api/verification/{id}/' + action, 'put', 'Revisar documentos (administrador)', action === 'reject' ? object({ reason: string }) : undefined);
paths['/api/verification/upload'] = { post: {
  ...endpoint('Enviar cédula y antecedentes (técnico)'),
  requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['cedula', 'policeRecord'], properties: { cedula: { type: 'string', format: 'binary' }, policeRecord: { type: 'string', format: 'binary' } } } } } },
} };
add('/uploads/{filename}', 'get', 'Descargar documento (propietario o administrador)');
paths['/uploads/{filename}'].get.parameters = [{ in: 'path', name: 'filename', required: true, schema: string }];
paths['/uploads/{filename}'].get.responses[200] = { description: 'Documento', content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } } };
add('/api/users', 'get', 'Usuarios (administrador)');
add('/api/users', 'post', 'Crear usuario (administrador)', object({ email: string, fullName: string, password: string, role: string }));
add('/api/users/{id}', 'get', 'Detalle de usuario (administrador)');
add('/api/users/{id}', 'put', 'Editar usuario (administrador)', object({ fullName: string, phone: string, address: string }));
add('/api/users/{id}/toggle', 'put', 'Activar o desactivar otro usuario (administrador)');
add('/api/users/companies/pending', 'get', 'Empresas pendientes (administrador)');
add('/api/users/companies/{id}/verification', 'put', 'Verificar empresa (administrador)', object({ status: { type: 'string', enum: ['VERIFICADO', 'RECHAZADO'] } }));
for (const name of ['overview', 'by-category', 'by-status', 'trend']) add('/api/reports/' + name, 'get', 'Reporte ' + name + ' (administrador)');
add('/api/companies/mine', 'get', 'Mi empresa');
add('/api/companies/mine', 'put', 'Actualizar empresa propia', object({ name: string, address: string, ruc: string }));
add('/api/companies/mine/employees', 'get', 'Empleados de mi empresa');
add('/api/companies/mine/employees', 'post', 'Agregar técnico registrado', object({ email: string, role: string }));
add('/api/companies/mine/employees/{id}', 'delete', 'Retirar empleado sin servicios activos de la empresa');
add('/api/companies/mine/jobs', 'get', 'Servicios asignados por mi empresa');
add('/api/companies/mine/assign', 'post', 'Asignar servicio disponible a empleado verificado', object({ requestId: integer, technicianId: integer }));
add('/api/companies/mine/jobs/{id}/status', 'put', 'Avanzar estado de servicio de mi empresa', object({ status: { type: 'string', enum: ['EN_PROGRESO', 'FINALIZADO'] } }));
add('/api/health', 'get', 'Comprobar API y conexión a PostgreSQL', null, false);
module.exports = {
  openapi: '3.0.0', info: { title: 'HomeFix Pro API', version: '1.1.0' },
  servers: [{ url: process.env.PUBLIC_API_URL || '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths,
};
