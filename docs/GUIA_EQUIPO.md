# Guía para el equipo · Cómo empezar a trabajar en PROBOSQUE

Esta guía explica, paso a paso, lo que necesitas para descargar el proyecto, levantarlo en tu computadora, cargar datos de prueba y subir tus cambios sin chocar con los demás.

Repositorio: https://github.com/nicolas090705/probosque

---

## 1. Acceso al repositorio

1. Crea una cuenta en [GitHub](https://github.com/) si no tienes.
2. Pásale tu **nombre de usuario** a Angel (es lo que aparece en `github.com/<tu-usuario>`).
3. Angel te invita desde *Settings → Collaborators → Add people*.
4. Acepta la invitación desde el correo que te llega o desde https://github.com/notifications.

> Mientras no aceptes la invitación puedes **descargar** el código (el repositorio es público), pero **no subir** cambios.

---

## 2. Programas que necesitas

| Programa | Para qué |
|---|---|
| [Git](https://git-scm.com/) | Descargar y subir el código (en Windows trae **Git Bash**) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Base de datos (PostgreSQL + PostGIS) y backend (Django) |
| [Node.js](https://nodejs.org/) 18 o más reciente | Frontend (React) |
| [VS Code](https://code.visualstudio.com/) (recomendado) | Editar el código |

No necesitas instalar Python, PostgreSQL ni GDAL: vienen dentro de Docker.

Configura tu nombre en Git **una sola vez**, con tus datos (el correo debe ser el de tu cuenta de GitHub):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo-de-github@ejemplo.com"
```

> Si la computadora es compartida, en lugar de `--global` configúralo solo dentro de la carpeta del proyecto (quita `--global` y corre los comandos estando en `probosque/`).

---

## 3. Levantar el proyecto la primera vez

### 3.1 Descargar el código

```bash
git clone https://github.com/nicolas090705/probosque.git
cd probosque
```

**Deberías ver** una carpeta `probosque` con `backend/`, `frontend/`, `docs/` y `docker-compose.yml`.

### 3.2 Base de datos y backend

Abre Docker Desktop y espera a que diga **Engine running**. Luego, desde la carpeta `probosque`:

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos: descarga PostGIS y arma la imagen con GDAL.

```bash
docker compose ps
```

**Deberías ver** `probosque-db-1` en **Up (healthy)** y `probosque-backend-1` en **Up**.

### 3.3 Crear las tablas

```bash
docker compose exec backend python manage.py migrate
```

Crea todas las tablas y carga el catálogo de los 6 programas. **Deberías ver** varias líneas `Applying ... OK`.

### 3.4 Usuario para el admin de Django (opcional)

```bash
docker compose exec backend python manage.py createsuperuser
```

Te pide usuario, correo (puede ir vacío) y contraseña.

### 3.5 Cargar los datos de prueba

Ver la sección 4.

### 3.6 Frontend

En **otra** terminal (esta se queda ocupada mientras React corre):

```bash
cd probosque/frontend/probosque-registro
npm install
npm run dev
```

**Deberías ver** `Local: http://localhost:5173/`.

### 3.7 Dónde entrar

| Qué | Dirección |
|---|---|
| Portal (React) | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Documentación de la API (Swagger) | http://localhost:8000/api/docs/ |
| Admin de Django | http://localhost:8000/admin/ |

Si el portal dice "No se pudo conectar con el servidor", el backend no está corriendo: revisa el paso 3.2.

---

## 4. Datos de prueba

Git guarda el **código**, no los datos de la base ni los archivos subidos (`backend/media/`). Por eso, al clonar, tu base empieza vacía. Para no capturar todo a mano, corre:

```bash
docker compose exec backend python manage.py datos_prueba
```

**Deberías ver** algo así (los números del folio pueden variar):

```
Convocatoria abierta: Plantaciones Sustentables
...
  PS-2026-0001     Recibida en la delegación
  RHF-2026-0002    Documentación incompleta, en plazo para subsanar
  PSAH-2026-0003   Documentación completa, en dictamen
  CC-2026-0004     Dictamen jurídico favorable
  RHF-2026-0005    No factible
  PEG-2026-0006    Recibida en la delegación
Listo: 6 convocatorias abiertas y 6 solicitudes de prueba.
```

### Qué carga

- **Una convocatoria abierta por programa** (los 6), cada una con su **RO real** en PDF (tomada de `docs/reglas-operacion/`). Abren el 1 de enero del año en curso y cierran 90 días después de cargar los datos. Si el programa ya tenía una convocatoria abierta, se usa esa y no se crea otra.
- **6 solicitudes**, una en cada paso del trámite, para que todas las pantallas tengan algo que mostrar:

| Programa | Estado | Para probar |
|---|---|---|
| Plantaciones | Recibida | Recepción: aceptar o rechazar |
| Restauración | Subsanación | Mis solicitudes: reemplazar archivos y reenviar |
| Servicios Ambientales | En dictamen | Dictámenes: favorable o desfavorable |
| Capturando Carbono | Jurídico favorable | Dictamen en PDF y Listados (techo presupuestal) |
| Restauración | No factible | Dictamen desfavorable con su motivo |
| Guardabosques | Recibida | Recepción (Guardabosques aún no tiene formulario en React) |

- Cada solicitud trae el polígono de ejemplo (`docs/pruebas/predio_las_trancas.kml`, Amecameca), una identificación y una CURP de prueba en PDF, y una CLABE válida.
- Los correos terminan en `@datos-prueba.mx`. Así el comando reconoce que ya cargó los datos: **si lo corres dos veces, no duplica nada**.

### Entrar al portal con cada rol

El portal pide iniciar sesión y muestra solo las pantallas del rol (el detalle está en `frontend/probosque-registro/README.md`):

- **Personal de PROBOSQUE:** en **Ingresar** están las cuentas de demostración (Dirección General, una ventanilla por delegación, Unidad Jurídica y Comité). Todas usan la contraseña `probosque2026`. Cada ventanilla solo ve los expedientes de su delegación.
- **Solicitante de prueba:** en **Ingresar → Crea tu cuenta** usa el correo de la solicitud que quieras ver, de `solicitante1@datos-prueba.mx` a `solicitante6@datos-prueba.mx` (en el orden de la tabla), y entra a **Mis solicitudes**. Ahí están el estatus, el polígono en el mapa y el acuse en PDF.

### Volver a empezar desde cero

> ⚠️ **Esto borra toda tu base de datos local** (solo la tuya, no la de los demás).

```bash
docker compose down -v
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py datos_prueba
```

---

## 5. Ver la base de datos

### Desde la terminal

```bash
docker compose exec db psql -U probosque -d probosque
```

> En Git Bash, si sale `the input device is not a TTY`, antepón `winpty`:
> `winpty docker compose exec db psql -U probosque -d probosque`

| Comando dentro de `psql` | Qué hace |
|---|---|
| `\dt public.*` | Lista las tablas del proyecto (sin las `tiger.*` que trae PostGIS) |
| `\d registro_solicitud` | Columnas de una tabla |
| `\x auto` | Registros largos en vertical |
| `\q` | Salir |

Tablas: `registro_programa`, `registro_convocatoria`, `registro_solicitud`, `registro_documento` y `aprobacion_dictamen`.

```sql
SELECT id, folio, estado, nombres, delegacion FROM registro_solicitud ORDER BY id;
```

Consulta suelta sin entrar a `psql`:

```bash
docker compose exec db psql -U probosque -d probosque -c "SELECT folio, estado FROM registro_solicitud;"
```

### Con interfaz gráfica

[DBeaver](https://dbeaver.io/) → nueva conexión PostgreSQL:

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Base | `probosque` |
| Usuario | `probosque` |
| Contraseña | `probosque` |

Las tablas están en *probosque → Schemas → public → Tables*. También puedes usar el admin de Django (http://localhost:8000/admin/).

---

## 6. Cómo trabajar sin pisarnos

### Antes de empezar, siempre

```bash
git pull
```

Trae lo que subieron los demás. Después del `pull`:

| Si cambió… | Corre |
|---|---|
| Algún archivo en `migrations/` | `docker compose exec backend python manage.py migrate` |
| `backend/requirements.txt` o el `Dockerfile` | `docker compose up -d --build` |
| `frontend/probosque-registro/package.json` | `npm install` (en `frontend/probosque-registro`) |

### Cada quien en su rama

No trabajes directo en `main`. Crea una rama para tu cambio:

```bash
git switch -c nombre-del-cambio
```

Al terminar:

```bash
git add -A
git commit -m "Qué cambié"
git push -u origin nombre-del-cambio
```

Luego en GitHub abre un **Pull Request** de tu rama hacia `main`. Alguien lo revisa y lo une. Así `main` siempre funciona.

Para volver a `main` y traer lo último:

```bash
git switch main
git pull
```

### Reglas para no chocar

- **Avisa en el grupo antes de tocar archivos compartidos.** Los que más conflictos causan:
  - `frontend/probosque-registro/src/App.jsx`
  - `frontend/probosque-registro/src/datos/camposFormulario.js`
  - `backend/registro/models.py` y `backend/aprobacion/models.py`
- **Migraciones:** si dos personas corren `makemigrations` en la misma app al mismo tiempo, salen dos `0004_...` que chocan. Una sola persona cambia los modelos de cada app a la vez; los cambios de modelos del backend se coordinan con Angel.
- **No subas** `node_modules/`, `.venv/`, `backend/media/` ni archivos `.env`. El `.gitignore` ya los excluye.
- Commits pequeños y con mensajes claros: "Formulario de Guardabosques en React" es mejor que "cambios".

---

## 7. Apagar al terminar

```bash
# En la terminal de React
Ctrl + C

# Desde la carpeta probosque: apaga Docker y CONSERVA los datos
docker compose down
```

> ⚠️ `docker compose down -v` (con `-v`) **borra** la base de datos. Úsalo solo si quieres empezar de cero.

---

## 8. Problemas comunes

| Problema | Solución |
|---|---|
| El portal dice "No se pudo conectar con el servidor" | Docker apagado: abre Docker Desktop y corre `docker compose up -d` |
| `docker compose ps` no muestra el backend | `docker compose logs backend` y lee el último error |
| Error `relation "registro_..." does not exist` | Faltan migraciones: `docker compose exec backend python manage.py migrate` |
| Docker Desktop no arranca tras apagar mal la PC (error con `sailor-ingest.sock`) | Ciérralo por completo y vuelve a abrirlo. **Nunca** uses "Reset to factory defaults": borra los datos |
| En Git Bash, `curl` manda mal los acentos | Envía el JSON desde un archivo UTF-8: `curl --data-binary @archivo.json` |
| En Git Bash, rutas como `/tmp` dentro de `docker compose exec` se convierten en rutas de Windows | Antepón `MSYS_NO_PATHCONV=1` al comando |
| Puerto 5173 ocupado | Vite usa el siguiente (5174); revisa la dirección que muestra `npm run dev` |

---

## 9. Para entender el proyecto

- `README.md`: resumen y comandos.
- `CLAUDE.md` / `AGENTS.md`: contexto completo (decisiones del equipo, modelo de datos, estado de cada historia de usuario). Si usas Claude Code o Codex, los leen solos.
- `docs/analisis/Historias_de_usuario.pdf`: historias de usuario.
- `docs/reglas-operacion/`: Reglas de Operación de los 6 programas.
