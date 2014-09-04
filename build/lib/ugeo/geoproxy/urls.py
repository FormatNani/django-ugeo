from django.conf.urls import patterns, include, url
from . import views

urlpatterns = patterns('',

  url(r'^vectortile/(?P<layer_name>[\w-]+)/(?P<zoom>\d+)/(?P<col>\d+)/(?P<row>\d+).(?P<extension>\w+)$', 'geoproxy.views.vectorTile'),
  url(r'^vectortile/preview.html?', 'geoproxy.views.previewVectorTile'),

  url(r'^maptile/(?P<layer_name>[\w-]+)/(?P<zoom>\d+)/(?P<col>\d+)/(?P<row>\d+).(?P<extension>\w+)$', 'geoproxy.views.mapTile'),
  url(r'^maptile/preview.html?', 'geoproxy.views.previewMapTile'),

  url(r'^tile/wms?', 'geoproxy.views.tileWMS'),
  url(r'^map/wms?', 'geoproxy.views.mapWMS'),
  url(r'^wms/preview.html?', 'geoproxy.views.previewWMS'),

)
