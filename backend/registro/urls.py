# El router crea las rutas de cada ViewSet:
#   /api/convocatorias/       GET (lista)  y POST (crear)
#   /api/convocatorias/<id>/  GET (una)    y PATCH (modificar)
from rest_framework.routers import DefaultRouter

from .views import ConvocatoriaViewSet, DocumentoViewSet, ProgramaViewSet, SolicitudViewSet

router = DefaultRouter()
router.register('programas', ProgramaViewSet)
router.register('convocatorias', ConvocatoriaViewSet)
router.register('solicitudes', SolicitudViewSet)
router.register('documentos', DocumentoViewSet)

urlpatterns = router.urls
