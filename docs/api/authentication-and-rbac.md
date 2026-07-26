# Autenticacion y RBAC

## JWT

El backend firma JWT con `JWT_SECRET` mediante `jwt-simple`. El payload de una sesion incluye:

```json
{
  "id": "<userId>",
  "nombre": "Ana",
  "email": "ana@example.com",
  "permisoSistema": "Administrador",
  "iat": 1700000000,
  "exp": 1700086400
}
```

El ejemplo representa la sesion actual de login, que dura un dia porque `createSessionToken` normaliza un valor omitido a 1. `JWT_EXPIRES_IN_DAYS` queda como fallback del firmador y no modifica esa ruta mientras el controlador mantenga dicha normalizacion.

El middleware:

1. Lee `Authorization`.
2. Elimina comillas y prefijo `Bearer`.
3. Verifica firma y expiracion.
4. Exige `payload.id`.
5. Vuelve a cargar el usuario desde MongoDB.
6. Rechaza estado `bloqueado`.
7. Comprueba el permiso requerido por la ruta.

Esto permite invalidar acceso mediante bloqueo sin esperar la expiracion del JWT.

## Roles

| Rol | Capacidades principales |
|---|---|
| `Administrador` | Gestion completa, staff, estadisticas y eliminacion de usuarios. |
| `Celador` | Operacion de escaneo, usuarios, registros, alertas y visitantes. |
| `Usuario` | Perfil autenticado; no opera el dashboard administrativo. |

`rolAcademico` no es un permiso. Valores como Estudiante, Docente o Visitante describen la relacion academica.

## Estados

| Estado | Efecto |
|---|---|
| `activo` | Usuario habilitado y/o sesion operativa. |
| `inactivo` | Sin actividad actual; puede autenticarse salvo reglas de visitante. |
| `bloqueado` | Login y endpoints protegidos rechazados con `USER_BLOCKED`. |

Login/logout solo sincronizan automaticamente el estado de Administrador y Celador. Los movimientos de acceso y tickets gobiernan otros cambios.

## Visitantes

Ademas de password correcto y no estar bloqueado, un usuario con `rolAcademico=Visitante` necesita un documento en `visitor_tickets` cuyo `expiresAt` sea futuro. Sin ticket recibe `403`.

## Matriz de acceso

| Grupo | Publico | Usuario | Celador | Administrador |
|---|:---:|:---:|:---:|:---:|
| Login y registro/OCR visitante | Si | Si | Si | Si |
| Perfil/logout | No | Si | Si | Si |
| Escaneo, usuarios y registros | No | No | Si | Si |
| Estadisticas de acceso/faciales | No | No | No | Si |
| Crear staff | No | No | No | Si |
| Update/delete usuario | No | No | No | Si |
| Uploads | Si | Si | Si | Si |

Los uploads son publicos en la implementacion actual porque el registro de visitantes los necesita. Deben protegerse con rate limiting, validacion adicional o URLs firmadas antes de una exposicion publica amplia.

## Token tecnico

`POST /auth/token` compara `TOKEN_ACCESS_KEY` y `TOKEN_SECRET_KEY` y emite un JWT con `scope: service-token`. Actualmente ese token no contiene `id`; el middleware de usuario exige `payload.id`, por lo que no sirve para rutas protegidas ordinarias. No lo trate como reemplazo de una sesion administrativa.

## Errores de sesion

Sin header:

```json
{
  "status": "error",
  "message": "No se encontro cabecera de autenticacion"
}
```

Usuario bloqueado:

```json
{
  "status": "error",
  "code": "USER_BLOCKED",
  "message": "Tu acceso ha sido bloqueado. Comunicate con el administrador."
}
```

El frontend escucha `USER_BLOCKED`, limpia la sesion y redirige al login.

## Recomendaciones

- Sustituya todos los secretos de ejemplo.
- Use HTTPS.
- Rote JWT y credenciales tecnicas al cambiar responsables.
- No almacene JWT en logs ni URLs.
- Considere cookies HttpOnly y proteccion CSRF para un endurecimiento futuro.
- Agregue rate limiting a login, tokens, uploads, OCR y reconocimiento facial.
