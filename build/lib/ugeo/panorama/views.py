from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse

from django.contrib.gis.measure import D
from django.contrib.gis.geos import *

# Create your views here.
from panorama import PANO_CONFIG
from models import PanoPointData, PanoLineData
from libpano import *
import cStringIO

##### functions #####
def getNeighbours(pano, distance = 2.0, minDistanceBetweenPanos=3.0):

  neightour_names = []

  # qs = PanoLineData.objects.filter(geom__touches=pano.geom)
  qs = PanoLineData.objects.filter(geom__distance_lt=(pano.geom, D(m=distance)))
  for line in qs:
    if (line.start != pano.name) and (not line.start in neightour_names):
      neightour_names.append(line.start)
    if (line.end != pano.name) and (not line.end in neightour_names):
      neightour_names.append(line.end)

  neighbours = []
  qs = PanoPointData.objects.filter(name__in=neightour_names).distance(pano.geom).order_by('distance')
  for pano in qs:
    if pano.distance > minDistanceBetweenPanos:
        neighbour = DotDict()
        neighbour.name = pano.name
        neighbour.lon = pano.geom.x
        neighbour.lat = pano.geom.y
        neighbour.alt = pano.altitude
        neighbour.direction = getDirection(pano)
        neighbours.append(neighbour)

  return neighbours

# for xflip = true
# convert to position angle
def getDirection(pano):
    return float(pano.attitude_z)+180.0

def getNearPano(point,  distance = 5.0):
    qs = PanoPointData.objects.filter(geom__distance_lt=(point, D(m=distance))).distance(point).order_by('distance')
    if len(qs) > 0:
        return qs[0]
    else:
        return None

def getPanoInfo(pano):
    info = DotDict()
    info.name = pano.name
    info.lon = pano.geom.x
    info.lat = pano.geom.y
    info.alt = pano.altitude
    info.direction = getDirection(pano)
    return info

def getPOIs(pano):
    pois = []
    return pois

##### web services #####

def init(request):
  # pano = get_object_or_404(PanoPointData, name=pano_name)
  return render(request, 'panorama/init.xml', {'debug':PANO_CONFIG["DEBUG"]})

def imageDescription(request, pano_name, face):
  # pano = get_object_or_404(PanoPointData, name=pano_name)
  # width = pano.width
  # height = pano.height
  width = 1720
  height = 1720
  deepZoomDes = DeepZoomImageDescriptor(width, height)
  output = cStringIO.StringIO()
  content = deepZoomDes.save()
  return HttpResponse(content, content_type="text/xml", status=200)

def nearPano(request, lon, lat):
    try:
        distance = float(request.REQUEST['distance'])
    except:
        distance = 5.0
    try:
        callback = request.REQUEST['callback']
    except KeyError:
        callback = None

    point = fromstr('POINT(%s %s)'%(lon, lat), srid=4326)
    pano = getNearPano(point, distance)
    if pano:
        content = pano.name
    else:
        content = 'null'

    if callback:
        content_type = 'application/javascript; charset=utf-8'
        content = '%s("%s")' % (callback, content)
    else:
        content_type = 'text/plain'

    return HttpResponse(content=content, content_type=content_type, status=200)

def panoInfo(request, pano_name):
    try:
        distance = float(request.REQUEST['distance'])
    except:
        distance = 2.0
    pano = get_object_or_404(PanoPointData, name=pano_name)
    info = getPanoInfo(pano)
    neighbours = getNeighbours(pano, distance)
    pois = getPOIs(pano)
    return render(request, 'panorama/pano.xml',
                    {
                        'pano':info,
                        'neighbours':neighbours,
                        'pois':pois,
                    })

def panoInfo2(request, lon, lat):
    try:
        buffer = float(request.REQUEST['buffer'])
        distance = float(request.REQUEST['distance'])
    except:
        buffer = 5.0
        distance = 2.0
    point = fromstr('POINT(%s %s)'%(lon, lat), srid=4326)
    pano = getNearPano(point, distance)
    info = getPanoInfo(pano)
    neighbours = getNeighbours(pano, distance)
    pois = getPOIs(pano)
    return render(request, 'panorama/pano.xml',
                    {
                        'pano':info,
                        'neighbours':neighbours,
                        'pois':pois,
                    })

def panoPOI(request, pano_name):
    pano = get_object_or_404(PanoPointData, name=pano_name)
    pois = getPOIs(pano)
    return render(request, 'panorama/poi.xml',{'pois':pois})

def panoTile(request, pano_name, face, zoom, col, row, extension):
  ds_pano = PANO_CONFIG["panostore"]
  pano_store = PanoTileStore.load(ds_pano)
  tilecoord = TileCoord(int(col), int(row), int(zoom))
  tile = PanoTile(pano_name, int(face), tilecoord)
  tile = pano_store.get_tile(tile)
  if tile:
    return HttpResponse(tile.data, content_type="image/jpeg", status=200)
  else:
    return HttpResponse(content_type="image/jpeg", status=404)


##### preview #####
def previewPano(request):
  #pano_name = request.REQUEST['pano']
  # camera = request.REQUEST['camera']
  # pano = get_object_or_404(PanoPointData, name=pano_name)
  #return render(request, 'panorama/preview.html', {'pano_name': pano_name})
  return render(request, 'panorama/preview.html')
