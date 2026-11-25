# PROBOSQUE · Portal de programas forestales

Proyecto escolar de **Formulación y Evaluación de Proyectos de Investigación**. Es un solo sistema para los 6 programas de PROBOSQUE (Guardabosques, Procarbono, Manejo Forestal Sustentable, PSAHEM, Plantaciones Sustentables y Restauración Hidrológico-Forestal).

| Parte | Tecnología | Carpeta |
|---|---|---|
| Backend / API | Django 5.2 + Django REST Framework + GeoDjango | `backend/` |
| Base de datos | PostgreSQL 16 + PostGIS (en Docker) | `docker-compose.yml` |
| Frontend | React 18 + Vite | `frontend/probosque-registro/` |
| Documentos | Reglas de operación, historias de usuario, arquitectura | `docs/` |

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 18 o más reciente
- Git

## Cómo levantarlo la primera vez

> Guía completa para el equipo (acceso, datos de prueba, base de datos, ramas y problemas comunes): [docs/GUIA_EQUIPO.md](docs/GUIA_EQUIPO.md)

```bash
git clone https://github.com/nicolas090705/probosque.git
cd probosque

# 1. Base de datos y backend (la primera vez tarda: descarga PostGIS y GDAL)
docker compose up -d --build

# 2. Crear las tablas y cargar el catálogo de programas
docker compose exec backend python manage.py migrate

# 3. Usuario para el admin de Django (opcional)
docker compose exec backend python manage.py createsuperuser

# 4. Datos de prueba: 6 convocatorias abiertas y 6 solicitudes en distintos estados
docker compose exec backend python manage.py datos_prueba

# 5. Frontend
cd frontend/probosque-registro
npm install
npm run dev
```

| Qué | Dirección |
|---|---|
| Portal (React) | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Documentación de la API (Swagger) | http://localhost:8000/api/docs/ |
| Admin de Django | http://localhost:8000/admin/ |

## Comandos frecuentes

| Comando | Qué hace |
|---|---|
| `docker compose up -d` | Levanta la base y el backend |
| `docker compose logs backend` | Muestra los errores del backend |
| `docker compose exec backend python manage.py makemigrations` | Crea migraciones después de cambiar un modelo |
| `docker compose exec backend python manage.py migrate` | Aplica las migraciones |
| `docker compose exec backend python manage.py datos_prueba` | Carga datos de prueba (no duplica si ya estaban) |
| `docker compose exec backend python manage.py test registro aprobacion` | Corre las pruebas del backend |
| `npm test` (en `frontend/probosque-registro`) | Corre las pruebas del frontend |
| `docker compose down` | Apaga todo y **conserva** los datos |
| `docker compose down -v` | Apaga todo y **borra** la base de datos |

## Cómo trabajar en equipo

1. Antes de empezar: `git pull` para traer lo último.
2. Crea una rama para tu trabajo: `git switch -c nombre-de-tu-cambio`.
3. Haz commits pequeños con mensajes claros.
4. Sube tu rama (`git push -u origin nombre-de-tu-cambio`) y abre un Pull Request en GitHub.

Los archivos que suben los usuarios (`backend/media/`), `node_modules/` y `.venv/` no se guardan en Git: cada quien los genera en su computadora.

## Organización del backend

Un backend Django con una app por módulo:

| App | Módulo | Servicios |
|---|---|---|
| `registro` | 1 · Convocatoria y registro | 1.1 a 1.3 |
| `aprobacion` | 2 · Aprobación | 2.1 a 2.9 |
| `seguimiento` | 3 · Seguimiento | 3.1 a 3.3 (pendiente) |
| `finanzas` | 4 · Finanzas | 4.1 y 4.2 (pendiente) |
| `cierre` | 5 · Cierre | 5.1 a 5.5 (pendiente) |
