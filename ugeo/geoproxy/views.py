from django.shortcuts import render
from django.http import HttpResponse

import TileStache

# Create your views here.

def vectorTile(request, layer_name, zoom, col, row, extension):
  config = 'geoproxy/tilestache.cfg'
  layer = TileStache.requestLayer2(config, layer_name)
  coord = TileStache.Coordinate(int(row), int(col), int(zoom))
  status_code, headers, content = layer.getTileResponse(coord, extension, ignore_cached=True)
  try:
      callback = request.REQUEST['callback']
  except KeyError:
      callback = None
  if callback and 'json' in headers['Content-Type']:
      headers['Content-Type'] = 'application/javascript; charset=utf-8'
      content = '%s(%s)' % (callback, content)
  return HttpResponse(content=content, content_type=headers.get('Content-Type'), status=status_code)

def mapTile(request, layer_name, zoom, col, row, extension):
  pass

def tileWMS(request):
  pass

def mapWMS(request):
  pass


##### preview #####

def previewVectorTile(request):
  config = 'geoproxy/tilestache.cfg'
  layer_name = request.REQUEST['layer']
  layer = TileStache.requestLayer2(config, layer_name)
  bWGS84 = isinstance(layer.projection, TileStache.Geography.WGS84)
  return render(request, 'map/preview.html',
                {'layer': layer, 'bWGS84': bWGS84})

def previewMapTile(request):
  layer_name = request.REQUEST['layer']
  pass

def previewWMS(request):
  map = request.REQUEST['map']
  pass
