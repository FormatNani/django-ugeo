from django.contrib.gis import admin
# from leaflet.admin import LeafletGeoAdmin

# Register your models here.

from models import PanoPointData,PanoLineData

# admin.site.register(PanoPointData, LeafletGeoAdmin)
# admin.site.register(PanoLineData, LeafletGeoAdmin)
admin.site.register(PanoPointData, admin.OSMGeoAdmin)
admin.site.register(PanoLineData, admin.OSMGeoAdmin)
