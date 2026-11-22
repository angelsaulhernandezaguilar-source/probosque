from django.contrib import admin

from .models import Dictamen


@admin.register(Dictamen)
class DictamenAdmin(admin.ModelAdmin):
    list_display = ['solicitud', 'tipo', 'resultado', 'fecha']
    list_filter = ['tipo', 'resultado']
    search_fields = ['solicitud__folio']
