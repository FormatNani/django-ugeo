from django.conf.urls import patterns, include, url
from djgeojson.views import GeoJSONLayerView
from djgeojson.views import TiledGeoJSONLayerView
from . import views
from models import PanoPointData


class PanoGeoJSONView(GeoJSONLayerView):
    precision = 4   # float

urlpatterns = patterns('',
  url(r'^init.xml$', 'panorama.views.init'),
  url(r'^(?P<pano_name>[\w-]+).xml$', 'panorama.views.panoInfo'),
  url(r'^(?P<lon>[\d.]+),(?P<lat>[\d.]+).xml$', 'panorama.views.panoInfo2'),
  url(r'^(?P<lon>[\d.]+),(?P<lat>[\d.]+)$', 'panorama.views.nearPano'),
  url(r'^(?P<pano_name>[\w-]+)/poi.xml$', 'panorama.views.panoPOI'),
  url(r'^(?P<pano_name>[\w-]+)/(?P<face>[0-5]).xml$', 'panorama.views.imageDescription'),
  url(r'^(?P<pano_name>[\w-]+)/(?P<face>[0-5])/(?P<zoom>\d+)/(?P<col>\d+)_(?P<row>\d+).(?P<extension>\w+)$', 'panorama.views.panoTile'),
  url(r'^preview.html?', 'panorama.views.previewPano'),

  url(r'^points.geojson$', PanoGeoJSONView.as_view(model=PanoPointData), name='points'),
  url(r'^points/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+).geojson$',
    TiledGeoJSONLayerView.as_view(model=PanoPointData)),

)
