PROBOSQUE · Programa Estatal de Guardabosques

# Arquitectura del sistema

Un solo sistema para los 6 programas, construido como monolito modular: una aplicación Django dividida en cinco módulos, una base de datos y un frontend en React.

Backend

Django + Django REST Frameworkcon GeoDjango para las consultas geográficas

Base de datos

PostgreSQL + PostGISuna sola base para los 6 programas

Frontend

Reactpantallas por rol, consume la API

Despliegue

Docker Compose, lo mínimobase de datos y backend en contenedores

## Componentes

El navegador habla con React, React con la API de Django y Django con la base de datos. Los cinco módulos usan los mismos servicios compartidos. Lo que está dentro del recuadro punteado corre en Docker.

## Módulos y necesidades de Guardabosques

Cada app de Django agrupa los servicios de un módulo. La columna de la derecha muestra qué necesidades de Guardabosques se resuelven ahí.

| App | Servicios | Necesidades |
| --- | --- | --- |
| `registro` | 1.1, 1.2 | **N1** Solicitud Única  **N5** Plazos del trámite  **N8** Persona cobeneficiaria |
| `aprobacion` | 2.1 a 2.9 | **N2** Resultado de la solicitud  **N4** Expedientes digitales  **N7** Contrato de adhesión y firma  **N11** Dictamen técnico  **N14** Dictamen jurídico  **N17** Zonas críticas y Bosque de Agua  **N18** Listado de factibles y autorización del CASPEG  **N21** Lista de espera y sustituciones  **N22** CLABE interbancaria |
| `seguimiento` | 3.1, 3.2 | **N3** Reportes mensuales  **N6** Zonas estratégicas (Anexo Técnico)  **N9** Causas de incumplimiento |
| `finanzas` | 4.1, 4.2 | **N15** Notificaciones de conflicto o cambio de uso  **N16** Reintegro de recursos  **N20** Disponibilidad presupuestal |
| `cierre` | 5.1, 5.2, 5.3 | **N12** Padrón de personas beneficiarias  **N13** Informe de resultados al CASPEG  **N19** Graduación y cierre del PEG |
| `sin módulo` | ninguno | **N10** Proteger los datos personales: queda fuera porque no se implementa control de acceso |

## Modelo de datos

Tres diagramas que se leen en orden: del registro al contrato, la ejecución y los pagos, y el presupuesto con el padrón y el cierre. Solicitud y Contrato son los dos puntos de unión.

registro aprobación seguimiento finanzas cierre **◆** campo geográfico (PostGIS) consulta espacial `1` uno · `N` muchos

### A. Del registro al contrato

Una Solicitud pertenece a un Programa y a un Núcleo agrario, tiene sus Personas, Documentos y Dictámenes, entra a un Listado que decide el CASPEG en una Sesión, y si se aprueba genera un Contrato. La línea punteada es la consulta del servicio 2.2.

### B. Ejecución y pagos

Del Contrato salen la cuenta bancaria, las ministraciones, los reportes mensuales con su evidencia fotográfica y los reintegros.

### C. Presupuesto, padrón y cierre

El Programa lleva su presupuesto por ejercicio, su cierre aprobado por el CASPEG y el padrón de personas. Una Persona puede tener incumplimientos que la suspenden o le dan de baja.

## Dónde entra PostGIS

PostGIS se usa en tres campos y todos sirven al servicio 2.2:

- `NucleoAgrario.ubicacion`: dónde está el núcleo.
- `ZonaEspecial.geometria`: polígonos de zonas críticas, Bosque de Agua, ANP y zonas estratégicas. Se cargan una vez desde GeoJSON.
- `Evidencia.ubicacion`: dónde se tomó cada foto del Anexo Técnico.

Con esos campos, el cruce que pide el servicio 2.2 es una línea de GeoDjango. La respuesta marca la solicitud como zona crítica, Bosque de Agua o estratégica, y resuelve N6 y N17.

```
# Servicio 2.2: ¿en qué zonas especiales cae este núcleo?
ZonaEspecial.objects.filter(
    geometria__intersects=nucleo.ubicacion
)
```

## Reglas de negocio que se vuelven validaciones

| Necesidad | Regla | Dónde vive |
| --- | --- | --- |
| N11 | Dictamen técnico y jurídico en máximo 45 días hábiles | Campo `fecha_limite_dictamen` en Solicitud y aviso cuando se acerca el plazo |
| N7 | Contrato firmado en 10 días hábiles después de la aprobación | Campo `plazo` en Contrato |
| N21 | Solo hay sustitución por baja, aprobada por el CASPEG | Validación en ListadoSolicitud |
| N22 | CLABE de 18 dígitos con dígito de control | Validador en CuentaBancaria |
| N19 | La graduación se registra solo después del acuerdo de cierre del CASPEG | Validación en CierreEjercicio |

## Alcance y Docker

### Qué no incluye esta arquitectura

- **Sin seguridad.** No hay inicio de sesión ni permisos. La persona elige su rol y el frontend le muestra las pantallas de ese rol.
- **N10 queda sin cubrir.** Proteger los datos personales exige control de acceso, que el equipo decidió no implementar.
- **Integraciones simuladas.** El Padrón Único, la validación de CLABE y el correo se resuelven con datos de ejemplo.

### Docker, lo mínimo

Solo la base de datos y el backend. Así nadie instala PostGIS ni GDAL, que son las dos instalaciones que más fallan al usar GeoDjango. React se corre normal con `npm`. El día a día son dos comandos: `docker compose up` y `docker compose down`.

```
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: probosque
      POSTGRES_USER: probosque
      POSTGRES_PASSWORD: probosque
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]

  backend:
    build: ./backend          # Dockerfile con Python y GDAL
    command: python manage.py runserver 0.0.0.0:8000
    volumes: ["./backend:/app"]
    ports: ["8000:8000"]
    depends_on: [db]

volumes:
  pgdata:
```