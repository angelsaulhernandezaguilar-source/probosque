# PROBOSQUE · Ingreso y seguimiento de convocatorias 2026

Frontend en React del portal de programas forestales de PROBOSQUE
(Protectora de Bosques del Estado de México). Consume la API de Django de `backend/`.

Proyecto de la materia Formulación de Proyectos Informáticos (ESCOM-IPN).

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) 18 o más reciente.

Primero levanta el backend desde la raíz del repositorio (`docker compose up -d`). Luego:

```powershell
cd frontend/probosque-registro
npm install      # la primera vez y cada que cambie package.json (ahora usa leaflet y jspdf)
npm run dev      # abre la dirección que aparece, normalmente http://localhost:5173
```

Para apagarlo, `Ctrl + C` en la terminal.

| Comando | Para qué |
|---------|----------|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm test` | Pruebas de las reglas de negocio |
| `npm run build` | Genera la carpeta `dist/` lista para publicar |
| `npm run preview` | Sirve lo que quedó en `dist/` |

## Qué hace

Cubre el flujo de la convocatoria, de la publicación a los listados del Comité:

1. La **Dirección General** publica la convocatoria con su periodo de registro.
2. La **persona solicitante** crea su cuenta, llena la Solicitud Única, carga sus documentos y el
   polígono de su predio, y recibe un folio con su **acuse en PDF**.
3. La **delegación regional** coteja la documentación de los municipios que atiende. Si la acepta,
   pasa a dictamen jurídico. Si la rechaza, el solicitante tiene 5 días hábiles para subsanar.
4. La **Unidad Jurídica** emite dictamen favorable o desfavorable y lo descarga **en PDF**.
5. La **Instancia Ejecutora / Comité** consolida el listado: captura el techo presupuestal y cada
   solicitud aprobada le va restando su monto; las que ya no alcanzan quedan en lista de espera.
6. El solicitante consulta en cualquier momento en qué paso va, en "Mis solicitudes".

## Inicio de sesión y pantallas por rol

La barra superior muestra quién tiene la sesión iniciada y solo las secciones de su rol
(`src/datos/usuarios.js`). Una ruta de otro rol responde "Sin acceso".

| Ruta | Pantalla | Rol |
|------|----------|-----|
| `#/` | Convocatorias publicadas | Público |
| `#/ingresar` | Inicio de sesión y alta de solicitantes | Público |
| `#/registro/:id` | Registro a la convocatoria | Persona solicitante |
| `#/estatus` | Mis solicitudes: ruta del trámite, polígono, datos e historial | Persona solicitante |
| `#/acuse/:folio` | Acuse de recepción (pantalla y PDF) | Solicitante y Delegación |
| `#/publicar` | Publicación de convocatorias | Dirección General |
| `#/recepcion` | Recepción de expedientes de su delegación, con estado | Delegación Regional |
| `#/dictamenes` | Emisión de dictámenes jurídicos | Unidad Jurídica |
| `#/dictamen/:folio` | Dictamen jurídico (pantalla y PDF) | Unidad Jurídica y Comité |
| `#/listados` | Consolidación y aprobación de listados | Instancia Ejecutora / Comité |

Cuentas de demostración del personal (contraseña `probosque2026`, también salen en la pantalla de ingreso):

| Correo | Rol |
|--------|-----|
| `direccion@probosque.test` | Dirección General |
| `delegacion.toluca@probosque.test` (una por delegación: `delegacion.amecameca@...`, `delegacion.valle.de.bravo@...`) | Delegación Regional |
| `juridico@probosque.test` | Unidad Jurídica |
| `comite@probosque.test` | Instancia Ejecutora / Comité |

Las personas solicitantes crean su cuenta en `#/ingresar`. Ven las solicitudes registradas con el
correo de su cuenta: para ver las de `datos_prueba`, crea una cuenta con `solicitante1@datos-prueba.mx`.

> El backend todavía no tiene autenticación. La sesión se valida en el navegador
> (`src/estado/Sesion.jsx`); cuando exista `/api/login/` solo cambia ese archivo.

## Reglas aplicadas

- **Delegación según el municipio:** el municipio se elige de la lista de los 125 y la delegación se
  asigna sola con la tabla de las Reglas de Operación (`src/datos/municipios.js`).
- **Predio único:** no se puede registrar dos veces el mismo predio (nombre + municipio) en una convocatoria.
- **Segunda persona beneficiaria:** siempre se designa; en núcleos agrarios es el secretario(a) o tesorero(a).
- **Refrendo:** solo son obligatorios la CURP, el FO-PB-502 y el polígono.
- **Sin CLABE ni observaciones** en la solicitud: los datos bancarios se capturan después de la aprobación.
- **Polígono:** se dibuja sobre un mapa (Leaflet + OpenStreetMap) con el GeoJSON que regresa la API.
- **Plantaciones:** $10,000/ha (plantación, 1 a 150 ha), $5,000/ha (mantenimiento, 0.5 a 150 ha),
  navideño sin recurso económico. Dos ministraciones: 70% y 30%.
- **Plazos:** subsanar 5 días hábiles; dictámenes 45 días hábiles (la fecha sale en el acuse).
- **Listados:** orden cronológico; aprueba mientras alcance el techo presupuestal y el resto va a lista de espera.

## Estructura del código

```
src/
├── App.jsx                  Rutas protegidas por rol, barra con el usuario y conexión de vistas y estado
├── App.css                  Sistema visual: colores, tipografías, botones, campos y paneles
├── api/cliente.js           Único archivo que conoce la dirección del backend
├── estado/
│   ├── Almacen.jsx          Datos de la API de Django (convocatorias, solicitudes, dictámenes)
│   ├── Sesion.jsx           Usuario con sesión iniciada
│   └── listados.js          Listados del Comité (en el navegador hasta que exista la API)
├── datos/
│   ├── catalogos.js         Programas, delegaciones, conceptos de apoyo y estados
│   ├── camposFormulario.js  Formularios FO-PB-501A / 501B por programa
│   ├── municipios.js        Municipios que atiende cada delegación
│   └── usuarios.js          Roles, secciones por rol y cuentas de demostración
├── vistas/                  Vistas de trabajo; solo dibujan y avisan por props
│   ├── PublicacionConvocatorias.jsx / RegistroConvocatoria.jsx
│   ├── RecepcionSolicitudes.jsx / EmisionDictamenes.jsx
│   └── PanelSolicitudes.css     Bandeja compartida por Recepción y Dictámenes
├── paginas/                 Convocatorias, Ingreso, Estatus (Mis solicitudes), Documento, Listados
├── componentes/             ZonaArchivo, MapaPredio (polígono), DocumentoOficial (acuse y dictamen)
└── utilidades/
    ├── reglas.js            Superficie, montos, días hábiles, fechas y predio repetido
    ├── listados.js          Asignación del techo presupuestal y folios de proyecto
    ├── documentos.js        Contenido del acuse y del dictamen
    └── pdf.js               Convierte un documento en PDF (jsPDF)
```

## Diseño

- **Color:** verde pino sobre fondo salvia; ámbar para lo pendiente y rojo para lo no factible.
- **Tipografía:** Bricolage Grotesque en títulos y Public Sans en texto, cargadas desde
  Google Fonts. Sin internet se usa la fuente del sistema.
- **Bandejas en dos columnas:** lista a la izquierda y expediente a la derecha.
- Se adapta a pantallas de celular.

## Límites del prototipo

- La sesión, las cuentas de solicitantes y los listados del Comité viven en el navegador: faltan en el
  backend la autenticación y los modelos de presupuesto y listados (y que el predio único y la
  delegación por municipio se validen también en Django).
- Los días hábiles saltan sábados y domingos, pero no días festivos.
- Quedan fuera el dictamen técnico (SIG), la publicación de resultados, el contrato de adhesión,
  los pagos y la verificación en campo.
