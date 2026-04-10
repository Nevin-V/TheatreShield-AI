from django.urls import path
from . import views

urlpatterns = [
    path('alerts', views.alerts_view, name='alerts_view'),
    path('alert', views.alert_view, name='alert_view'),
    path('kdm/generate', views.generate_kdm, name='kdm_generate'),
    path('kdm/validate', views.validate_kdm, name='kdm_validate'),
]
