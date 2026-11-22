# SimpleRouter (y no DefaultRouter) para no duplicar la página raíz /api/, que ya la pone registro.
from rest_framework.routers import SimpleRouter

from .views import DictamenViewSet, ExpedienteViewSet

router = SimpleRouter()
router.register('expedientes', ExpedienteViewSet)   # /api/expedientes/<id>/aceptar/ y /rechazar/
router.register('dictamenes', DictamenViewSet)      # /api/dictamenes/

urlpatterns = router.urls
