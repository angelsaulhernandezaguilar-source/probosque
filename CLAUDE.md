# CLAUDE.md · PROBOSQUE / Programa Estatal de Guardabosques (PEG)

Contexto para Claude Code. Responde siempre en **español**.

---

## 1. Quién trabaja aquí y cómo quiero que me ayudes

- Desarrollador: **Angel**. Mi parte es el **backend** (Django, base de datos). El frontend en React lo hace otro compañero.
- Experiencia: proyectos con Node.js y JavaScript; Django básico (ya hice una práctica); poca experiencia con React. **Docker es nuevo para mí** y lo uso de forma mínima.
- Entorno: Windows, VS Code, terminal **Git Bash** (antes usaba PowerShell) y Docker Desktop.
- La computadora es compartida: la identidad de Git está configurada **por repositorio**. Antes de un commit o push, revisa `git config user.name` y no cambies la configuración global.

### Modo profesor
- Dame el código hecho **y explícame qué hace cada parte o función**. No me dejes ejercicios de práctica.
- Paso a paso, con un punto de verificación al final de cada paso ("deberías ver X; si sale error, pégalo completo").
- Usa analogías con Node/Express cuando ayuden.
- Soluciones **ligeras**: es un proyecto escolar con poco tiempo. Nada de sobreingeniería.
- Avísame antes de cualquier comando que borre datos (por ejemplo `docker compose down -v`).

---

## 2. El proyecto

- Materia: **Formulación y Evaluación de Proyectos de Investigación**.
- Objetivo: tomar información de PROBOSQUE, encontrar un problema real de la institución y desarrollar un software que lo resuelva. Es un **portal web**, no una app móvil.
- Equipo: **6 programas, un solo sistema**. Cada integrante analizó un programa con su convocatoria y sus Reglas de Operación (RO). **El mío es Guardabosques (PEG).** Los otros: Capturando Carbono (Procarbono), Manejo Forestal Sustentable, Pago por Servicios Ambientales Hidrológicos (PSAHEM), Plantaciones Sustentables y Restauración Hidrológico-Forestal.

### Etapas ya entregadas
1. Diagrama de actividades UML con carriles, hecho en **PlantUML** (no draw.io).
2. Tabla de necesidades de Guardabosques: **22 necesidades** (`necesidades_GuardaBosques_v5.xlsx`).
3. Módulos y servicios: **un archivo general con los servicios de los 6 programas** (ya cerrado).
4. Matriz de trazabilidad necesidades × servicios (`Matriz_Trazabilidad_Guardabosques.xlsx`).
5. Historias de usuario con formato `HU-<servicio>-<nn>` (por ejemplo `HU-5.1-01`), con rol, actividad, criterios de aceptación y referencia al numeral de las RO.
6. Propuesta de arquitectura de software (sección 4).

**Etapa actual:** construir el sistema real en la carpeta `probosque/` (ver sección 9).

---

## 3. Decisiones cerradas (no las reabras salvo que yo lo pida)

- **El archivo general de servicios no se mueve.** El equipo no quiere más funcionalidad. Lo que falte se resuelve como validación dentro de un servicio existente, no como servicio nuevo.
- **Sin seguridad:** no hay login, ni permisos, ni tablas de Usuario o Auditoría. La persona elige su rol y el frontend le muestra sus pantallas. Por eso la **N10 (proteger datos personales) queda sin cubrir a propósito**.
- Prioridad de necesidades: "si no se resuelve, el sistema no funciona", **no** por cuántas veces aparece en la convocatoria. Ya no hay prioridad Baja, solo Alta y Media.
- Stack: Django + Django REST Framework + GeoDjango, PostgreSQL con PostGIS, React.
- Docker: **uso mínimo** (base de datos y backend en Docker Compose; React corre normal con `npm`).
- Una sola base de datos y una sola API para los 6 programas; cada solicitud lleva su `programa`.
- Diagramas en PlantUML.

---

## 4. Arquitectura

**Estilo:** monolito modular. Un backend Django dividido en apps (una por módulo) y un frontend React que lo consume por API.

| Capa | Tecnología | Qué hace |
|---|---|---|
| Presentación | React | Pantallas por rol |
| API | Django REST Framework | Expone los servicios y valida reglas de negocio |
| Lógica | Apps de Django por módulo | `registro` (1.x), `aprobacion` (2.x), `seguimiento` (3.x), `finanzas` (4.x), `cierre` (5.x) |
| Datos | PostgreSQL + PostGIS | Expedientes, contratos, pagos, reportes, padrón y zonas |
| Archivos | Carpeta `media` de Django | Documentos, fotos con ubicación, PDF generados |
| Despliegue | Docker Compose | `db` (PostGIS) y `backend` (Python + GDAL) |

Librerías: `djangorestframework`, `django-cors-headers` (`CORS_ALLOW_ALL_ORIGINS = True` solo en desarrollo), `drf-spectacular` (documentación de la API), GeoDjango (requiere GDAL en el Dockerfile).
Para después: generación de PDF (contratos y dictámenes) y mapas con Leaflet (opcional).

### Modelo de datos

`Solicitud` es el centro: casi todo cuelga de ella. `Solicitud` y `Contrato` son los dos puntos de unión.

| Entidad | Datos clave | Necesidad |
|---|---|---|
| Programa | nombre, ejercicio fiscal | distingue los 6 programas |
| NucleoAgrario | nombre, municipio, `ubicacion` (PostGIS) | |
| Solicitud | folio, programa, núcleo, estado, fecha de recepción, `fecha_limite_dictamen` | N1, N5 |
| Documento | tipo, archivo | N4 |
| Persona | nombre, CURP, tipo (Guardabosque o cobeneficiaria), estado (activa, suspendida, baja) | N8, N9 |
| Dictamen | tipo (técnico o jurídico), resultado, observaciones, fecha | N11, N14 |
| SesionCASPEG | fecha, tipo (ordinaria o extraordinaria), acuerdos | |
| ListadoSolicitud | solicitud, sesión, resultado (factible, no factible, lista de espera), orden | N18, N21 |
| Contrato | solicitud, fecha de firma, plazo, estado | N7 |
| CuentaBancaria | CLABE, banco, titular | N22 |
| Ministracion | contrato, número, monto, estado, fecha de depósito | |
| ReporteMensual | contrato, mes, actividades, estado de revisión | N3 |
| Evidencia | reporte, foto, `ubicacion` (PostGIS), fecha | N6 |
| Incumplimiento | persona, causa, tipo (suspensión o baja), fecha | N9 |
| Reintegro | contrato, monto, estado, fecha | N16 |
| Notificacion | solicitud, tipo (conflicto o cambio de uso de suelo), fecha | N15 |
| ZonaEspecial | nombre, tipo (crítica, Bosque de Agua, ANP, estratégica), `geometria` (multipolígono) | N6, N17 |
| PresupuestoEjercicio | programa, ejercicio, monto autorizado, monto comprometido | N20 |
| Padron | persona, programa, ejercicio | N12 |
| CierreEjercicio | programa, ejercicio, acuerdo de cierre, fecha | N13, N19 |

```
Programa ──< Solicitud >── NucleoAgrario
               ├─< Documento
               ├─< Persona ──< Incumplimiento
               ├─< Dictamen (técnico / jurídico)
               ├─< ListadoSolicitud >── SesionCASPEG
               └── Contrato ─┬─< Ministracion
                             ├── CuentaBancaria
                             ├─< ReporteMensual ──< Evidencia
                             └─< Reintegro
```

**PostGIS solo se usa en tres campos:** `NucleoAgrario.ubicacion`, `ZonaEspecial.geometria` (se carga una vez desde GeoJSON o shapefile) y `Evidencia.ubicacion`. La consulta del servicio 2.2 es:

```python
ZonaEspecial.objects.filter(geometria__intersects=nucleo.ubicacion)
```

SRID 4326 (coordenadas GPS).

### Reglas de negocio que se vuelven validaciones

| Regla | Dónde vive |
|---|---|
| Dictaminación técnica y jurídica en máximo 45 días hábiles | `Solicitud.fecha_limite_dictamen` + alerta de plazo |
| Contrato firmado en 10 días hábiles tras la aprobación | `Contrato.plazo` |
| Documentación complementaria: se notifica dentro de 10 días naturales | Solicitud / Documento |
| Sustitución solo por baja y con aprobación del CASPEG | Validación en `ListadoSolicitud` |
| CLABE de 18 dígitos con dígito de control | Validador en `CuentaBancaria` |
| Graduación solo después del acuerdo de cierre del CASPEG | Validación en `CierreEjercicio` |

Validador de CLABE ya probado:

```python
def clabe_valida(clabe: str) -> bool:
    if len(clabe) != 18 or not clabe.isdigit():
        return False
    pesos = [3, 7, 1] * 6
    suma = sum((int(d) * p) % 10 for d, p in zip(clabe[:17], pesos))
    return int(clabe[17]) == (10 - suma % 10) % 10
```

---

## 5. Dominio: roles del PEG

- **Núcleo agrario:** presenta la Solicitud Única y propone a su Guardabosque.
- **Guardabosque (persona beneficiaria):** firma el contrato de adhesión, hace recorridos de vigilancia y entrega reportes mensuales (con Anexo Técnico si está en zona estratégica).
- **Delegación Regional Forestal:** recibe la solicitud, integra el expediente y recaba firmas y acuses.
- **Dirección de Protección Forestal (Instancia Ejecutora):** valida y digitaliza expedientes, dictamina técnicamente, emite el listado preliminar de factibles, elabora el contrato, integra el Padrón, solicita suspensiones y bajas, y hace las sustituciones.
- **Unidad Jurídica, de Igualdad de Género y Erradicación de la Violencia:** dictamen jurídico, reintegros y quejas.
- **Subdirección de Atención a Zonas Críticas:** zonas críticas y "Bosque de Agua".
- **CASPEG (Comité de Admisión y Seguimiento):** autoriza solicitudes, aprueba la lista de espera, el Padrón, bajas y sustituciones, y acuerda el cierre.
- **Dirección de Administración, Finanzas y de Gestión Documental:** emite los pagos por transferencia y administra la cuenta de reintegros.

---

## 6. Necesidades de Guardabosques (22) y su cobertura

X = el servicio la cubre · P = la cubre a medias.

| ID | Necesidad | Rol | Prioridad | Servicios |
|---|---|---|---|---|
| N1 | Presentar la Solicitud Única | Núcleo agrario | Alta | 1.2 X |
| N2 | Dar a conocer el resultado | Núcleo agrario | Media | 2.6 X |
| N3 | Entregar los reportes mensuales de actividades | Guardabosque | Alta | 3.1 P (falta evidencia georreferenciada y Anexo Técnico) |
| N4 | Integrar y digitalizar los expedientes | Delegación Regional Forestal | Alta | 2.1 X, 1.2 X |
| N5 | Controlar los plazos del trámite | Protección Forestal | Media | 1.1, 1.2, 2.8 P (nadie calcula los 45 días hábiles) |
| N6 | Identificar zonas estratégicas (Anexo Técnico) | Protección Forestal | Media | 2.2 X, 3.1 P |
| N7 | Elaborar el contrato de adhesión y recabar su firma | Protección Forestal | Alta | 2.7 X, 2.8 X |
| N8 | Designar a la persona cobeneficiaria | Protección Forestal | Media | 1.2 X |
| N9 | Seguir las causas de incumplimiento (suspensión y baja) | Protección Forestal | Alta | 3.2 P, 4.2 P (nadie lleva el estado de la persona) |
| N10 | Proteger los datos personales | Protección Forestal | Alta | **ninguno** (fuera de alcance: sin seguridad) |
| N11 | Emitir el dictamen técnico | Protección Forestal | Alta | 2.3 X |
| N12 | Integrar y actualizar el Padrón de personas beneficiarias | Protección Forestal | Media | 5.3 X |
| N13 | Informar al CASPEG los resultados finales y el informe anual | Protección Forestal | Media | 5.1 X |
| N14 | Emitir el dictamen jurídico | Unidad Jurídica | Alta | 2.4 X |
| N15 | Recibir notificaciones de conflicto o cambio de uso de suelo | Unidad Jurídica | Media | 4.2 X |
| N16 | Dar seguimiento al reintegro de los recursos | Unidad Jurídica | Media | 4.2 X |
| N17 | Identificar zonas críticas y "Bosque de Agua" | Zonas Críticas | Alta | 2.2 X |
| N18 | Integrar el listado de factibles y registrar la autorización del CASPEG | CASPEG | Alta | 2.5 X |
| N19 | Determinar la graduación y registrar el acuerdo de cierre | CASPEG | Media | 5.1 X, 5.2 P |
| N20 | Conocer la disponibilidad presupuestal | CASPEG | Alta | 2.5 P, 4.1 P |
| N21 | Gestionar la lista de espera y las sustituciones | CASPEG | Media | 2.5 P |
| N22 | Verificar la CLABE interbancaria | Administración y Finanzas | Alta | 2.9 P (captura, pero no valida) |

Resumen: 12 Alta y 10 Media. 13 cubiertas, 8 a medias y 1 sin servicio (N10).
Las "a medias" se completan en el código con las validaciones de la sección 4, sin agregar servicios.

---

## 7. Servicios del archivo general del equipo

Nombres resumidos; el texto oficial está en el archivo general.

| Módulo (app) | Servicios |
|---|---|
| 1 Convocatoria (`registro`) | 1.1 cierre del periodo de registro · 1.2 registro de documentos y datos (incluye cobeneficiario y días extra si falta documentación) · 1.3 carga de polígonos |
| 2 Aprobación (`aprobacion`) | 2.1 folio y expediente · 2.2 validación geográfica de zonas · 2.3 dictamen técnico · 2.4 dictamen jurídico · 2.5 listados con priorización, suficiencia presupuestal y lista de espera · 2.6 publicación y notificaciones · 2.7 elaboración del contrato · 2.8 firma del contrato en plazo · 2.9 captura de datos bancarios |
| 3 Seguimiento (`seguimiento`) | 3.1 bitácora y reporte periódico · 3.2 inspección de obligaciones · 3.3 entrega de planta |
| 4 Finanzas (`finanzas`) | 4.1 ministraciones · 4.2 sanciones, reintegros, lista de bloqueados, conflictos y cambio de uso de suelo |
| 5 Cierre (`cierre`) | 5.1 cierre de expediente e informe final · 5.2 verificación técnica final · 5.3 envío de datos al Padrón Único · 5.4 generación del certificado de graduación · 5.5 formalización del certificado |

**No aplican a Guardabosques** (quedan sin marcar en la matriz): 1.3, 3.3, 5.4 y 5.5. Pertenecen a otros programas.

---

## 8. Datos clave de las Reglas de Operación y la Convocatoria del PEG

- Apoyo: **$25,550.00 MXN anuales por Guardabosque**, en **hasta 4 ministraciones** según la disponibilidad presupuestal, por transferencia interbancaria, previa entrega de reportes mensuales (RO 7.1.1 y 7.2.1).
- Recepción de solicitudes: permanente durante el ejercicio fiscal; se atienden en orden cronológico (Convocatoria, Base QUINTA).
- Dictaminación técnica y jurídica: máximo **45 días hábiles**; luego pasa al CASPEG (Convocatoria, Base QUINTA, fracc. II).
- Documentación complementaria: se notifica dentro de **10 días naturales** (RO 10.1, fracc. VII).
- Contrato de adhesión: lo elabora la Instancia Ejecutora tras la aprobación del CASPEG; se firma en 10 días hábiles (RO 10.1, fracc. XII).
- Padrón: RO 8.1.5 y 10.1, fracc. X. Informe al CASPEG: RO 10.1, fracc. XVI y num. 15. Graduación y cierre: RO 8.2.
- Resultados publicados en https://probosque.edomex.gob.mx.

**Vacíos de las RO** (si el profe pregunta, se declaran como "por definir"): no definen qué son las "zonas estratégicas", ni el contenido del dictamen técnico; el num. 8.2 no define una verificación en campo para la graduación; el plazo del servicio 5.5 no está especificado.

---

## 9. Estado del código

### Proyecto: carpeta `probosque/`
Ruta: `~/Desktop/probosque`. Es la carpeta del proyecto real (antes se llamaba `rebanada`); no la trates como práctica ni como código desechable. Repositorio público en GitHub: https://github.com/nicolas090705/probosque (rama `main`). Identidad local del repo: `Angel Nicolas <anicolash2001@alumno.ipn.mx>`. `.gitattributes` fuerza fin de línea LF.

```
probosque/
├── docker-compose.yml            ← db (postgis/postgis:16-3.4, con healthcheck) y backend
├── backend/
│   ├── Dockerfile                ← Python 3.12 + GDAL 3.6
│   ├── requirements.txt          ← Django 5.2, DRF, DRF-GIS, django-filter, cors, drf-spectacular, psycopg
│   ├── config/                   ← settings y urls (admin/, api/, api/docs/, media/)
│   ├── registro/                 ← Módulo 1 · convocatoria y registro
│   ├── aprobacion/               ← Módulo 2 · aprobación (por ahora HU-2.1 y HU-2.4)
│   └── media/                    ← archivos subidos (RO, documentos, polígonos)
├── frontend/probosque-registro/  ← React 18 + Vite (npm run dev → http://localhost:5173)
└── docs/                         ← RO, Historias_de_usuario.pdf, arquitectura y pruebas/ (KML de ejemplo)
```

- Postgres: base, usuario y contraseña `probosque` (solo desarrollo), expuesto en `localhost:5432` (sirve para DBeaver).
- El backend espera a que `db` esté `healthy` (`pg_isready -h 127.0.0.1`) antes de arrancar.
- Settings: motor PostGIS, `es-mx`, `America/Mexico_City`, `MEDIA_ROOT = backend/media`, DRF **sin autenticación** (decisión del equipo), `DjangoFilterBackend` y Swagger en `/api/docs/`.

### Historias de usuario

| HU | Estado | Dónde |
|---|---|---|
| HU-1.1-01 Publicación de convocatorias | ✅ | `Convocatoria` + pantalla "Publicar". Guardabosques y MFS no tienen formulario en React: por ahora solo por Swagger o admin |
| HU-1.1-02 Consulta de convocatorias | ✅ | Lista con estado y descarga de las RO |
| HU-1.2-01 Solicitud y documentación | ✅ | `Solicitud` + `Documento`; valida periodo abierto y CLABE |
| HU-1.2-02 Ventanilla | 🟡 | Consulta en Recepción y admin; registrar desde ventanilla solo en el admin |
| HU-1.3-01 Información geográfica | ✅ | `registro/geo.py` lee KML, KMZ, GeoJSON o Shapefile en `.zip` → `Solicitud.poligono` y `ubicacion` |
| HU-2.1-01 Recepción de expedientes | ✅ | `/api/expedientes/<id>/aceptar/` y `/rechazar/` + pantalla Recepción |
| HU-2.4-01 Dictamen jurídico | ✅ | `Dictamen` + `/api/dictamenes/` + pantalla Dictámenes |

### Backend · app `registro` (módulo 1)
- Modelos: `Programa` (catálogo de 6 cargado en la migración 0002; `clave` = id que usa React), `Convocatoria`, `Solicitud`, `Documento`.
- `Solicitud`: folio `SIGLAS-AÑO-id` generado en `save()`; datos generales como columnas; `datos_programa` (JSONB) para lo que cambia por programa; `poligono` y `ubicacion` (PostGIS); `estado` + `historial` (JSON).
- Máquina de estados `Solicitud.TRANSICIONES`; el único camino para cambiar el estado es `cambiar_estado()`. Métodos: `aceptar_expediente()`, `pedir_subsanacion(faltantes)`, `reenviar_documentacion()`.
- Plazos (constantes en `models.py`, iguales para los 6 programas): `DIAS_SUBSANACION = 5` hábiles (RO RHF; la de PEG no lo define → por definir), `DIAS_AVISO_FALTANTES = 10` naturales (RO PEG 10.1 fracc. VII), `DIAS_DICTAMEN = 45` hábiles (Convocatoria PEG, Base QUINTA). `plazos.py` no descuenta festivos.
- Las reglas viven en los modelos (`clean()`); `ReglasDelModeloMixin` hace que los serializers las ejecuten, así aplican igual en la API y en el admin. `aplicar_regla()` convierte un `ValidationError` de Django en un 400.
- Rutas: `/api/programas/`, `/api/convocatorias/` (`?programa=`), `/api/solicitudes/` (`?folio=`, `?estado=`, `?delegacion=`, `?programa=`), `/api/solicitudes/<id>/reenviar/`, `/api/documentos/` (multipart).

### Backend · app `aprobacion` (módulo 2)
- `Dictamen`: tipo (`TECNICO` bloqueado hasta la HU-2.3-01, `JURIDICO`), resultado, observaciones (obligatorias si es desfavorable) y fecha. `save()` cambia el estado de la solicitud dentro de `transaction.atomic()`.
- Rutas: `/api/expedientes/<id>/aceptar/`, `/api/expedientes/<id>/rechazar/` (`{"faltantes": "..."}`) y `/api/dictamenes/`. Usa `SimpleRouter` para no duplicar la raíz `/api/`.

### Frontend · `frontend/probosque-registro`
- Lo bajé de un repositorio de GitHub que ya no se usará; su `.git` viejo quedó respaldado en `~/Desktop/probosque-respaldo/` (fuera del proyecto).
- `src/api/cliente.js` (`pedir()`, errores de DRF en texto) y `src/estado/Almacen.jsx` (única capa de datos: traduce camelCase ↔ snake_case con `COLUMNAS`; las pantallas reciben la misma forma de antes).
- Formularios por programa en `src/datos/camposFormulario.js`. Guardabosques: clave `guardabosques`, siglas `PEG`.

### Cambios respecto a la sección 4 (falta actualizar el documento de arquitectura)
- Nueva entidad `Convocatoria`.
- PostGIS también en `Solicitud.poligono` y `Solicitud.ubicacion`. `NucleoAgrario` aún no existe: los datos del solicitante están en `Solicitud`.
- `fecha_limite_dictamen` es propiedad calculada, no columna.
- La cobeneficiaria (N8) se captura en `datos_programa`, todavía no como `Persona`.

### Datos de prueba en la base
- Convocatorias: Plantaciones (con su RO real) y RHF.
- Solicitudes: `PS-2026-0001` (KML falso, sin polígono), `RHF-2026-0002` (RECIBIDA, con polígono) y `RHF-2026-0003` (prueba del flujo completo, JURIDICO_FAVORABLE).
- `docs/pruebas/predio_las_trancas.kml`: polígono ficticio en Amecameca.

### Pendientes conocidos
- Pantalla de ventanilla en React (HU-1.2-02) y formulario de Guardabosques.
- Recepción no muestra las solicitudes en subsanación. (Ya resuelto: en Mi estatus el solicitante reemplaza archivos al subsanar; `POST /api/solicitudes/<id>/reenviar/` acepta multipart y sustituye los documentos del mismo tipo.)
- Nada desecha la solicitud cuando vence el plazo de subsanación; solo se bloquea el reenvío.
- Invitar al equipo como colaboradores del repositorio (Settings → Collaborators).
- Siguientes HU del módulo 2: 2.2 (cruce con `ZonaEspecial`), 2.3 (dictamen técnico), 2.5 en adelante.

### Trampas conocidas en esta computadora
- En Git Bash, `curl` manda los acentos mal codificados: enviar JSON desde un archivo UTF-8 con `--data-binary @archivo.json`.
- En Git Bash, las rutas como `/tmp` dentro de `docker compose exec` se convierten a rutas de Windows: anteponer `MSYS_NO_PATHCONV=1`.
- Si Docker Desktop no arranca tras un apagado incorrecto (error con `sailor-ingest.sock`), cerrarlo y volver a abrirlo. Nunca usar "Reset to factory defaults": borra los volúmenes.

### Práctica anterior (otra carpeta, solo aprendizaje)
Antes hice un proyecto de práctica, también llamado `probosque`, con la app `guardabosques` y SQLite: modelo `Solicitud` (folio, nucleo_agrario, municipio, representante, puntaje, estatus, fecha_registro), admin, vista de lista y plantilla. **No es esta carpeta** ni forma parte del proyecto real.

### Comandos frecuentes (desde `probosque/`)

| Comando | Qué hace |
|---|---|
| `docker compose up -d` | Levanta todo (`--build` si cambió `requirements.txt` o el Dockerfile) |
| `docker compose ps` | Muestra qué contenedores corren |
| `docker compose logs backend` | Muestra los errores del backend |
| `docker compose exec backend python manage.py makemigrations` | Crea las migraciones |
| `docker compose exec backend python manage.py migrate` | Aplica las migraciones |
| `docker compose exec backend python manage.py startapp <nombre>` | Crea una app |
| `docker compose exec backend python manage.py createsuperuser` | Usuario para el admin |
| `docker compose exec backend python manage.py test registro aprobacion` | Corre las pruebas (usa una base temporal) |
| `docker compose exec db psql -U probosque -d probosque` | Entra a la base (`\dt` lista tablas, `\q` sale) |
| `npm run dev` (en `frontend/probosque-registro`) | Levanta React en http://localhost:5173 |
| `npm test` / `npm run build` (en `frontend/probosque-registro`) | Pruebas del frontend / compilación |
| `docker compose down` | Apaga y conserva los datos |
| `docker compose down -v` | Apaga y **borra los datos**: pedir confirmación |

---

## 10. Convenciones de código

- Modelos, campos y apps en español, sin acentos: `Solicitud`, `nucleo_agrario`, `fecha_registro`.
- Estados con `TextChoices`; `verbose_name_plural` para los plurales en español (Django pondría "Solicituds").
- Fechas y plazos en días hábiles o naturales según la regla; documenta el numeral de las RO en un comentario cuando una validación venga de ahí.
- El admin de Django puede servir de pantalla provisional para los roles internos (Jurídica, Administración) mientras React cubre las pantallas principales.

---

## 11. Documentos de referencia

Están en el proyecto de claude.ai "Probosque". Si los copio a `docs/` en este repo, consúltalos ahí antes de afirmar algo sobre las reglas:

- `ConvocaProgramaEstatalGuardabosques202603.pdf`
- `ReglasOperacionGuardabosques202603.pdf`
- `organigramaCompleto.pdf`
- RO de los otros programas: `ROCapturandoCarbono2026.pdf`, `RO_ManejoForestalSustentable.pdf`, `RO_PagoporServiciosAmbientalesHidrológicos.pdf`, `RO_PlantacionesSustentables2026.pdf`, `RO_Restauración Hidrológico-Forestal.pdf`
- Excel del equipo: `necesidades_GuardaBosques_v5.xlsx`, `Matriz_Trazabilidad_Guardabosques.xlsx` y el archivo general de servicios.
