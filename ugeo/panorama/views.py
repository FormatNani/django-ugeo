
# -*- coding: utf-8 -*-

from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.core.exceptions import ObjectDoesNotExist

from django.contrib.gis.measure import D
from django.contrib.gis.geos import *

# Create your views here.
from panorama import PANO_CONFIG
from models import PanoPointData, PanoLineData, PanoPoiData, PanoTileData, PanoFreeData
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

def getFreePanos(pano0, tag = 0, buf = 50.0):
    frees = []
    qs = PanoFreeData.objects.filter(geom__distance_lt=(pano0.geom, D(m=buf)))
    for pano in qs:
        if pano.name == pano0.name:
            continue
        free = DotDict()
        free.name = pano.name
        free.title = pano.title
        free.tag = tag
        free.exid = int(pano.name[10:])
        free.lon = pano.geom.x
        free.lat = pano.geom.y
        free.alt = pano.altitude
        free.direction = getDirection(pano)
        # get near streetview pano
        point = fromstr('POINT(%s %s)'%(free.lon, free.lat), srid=PANO_CONFIG["srid"])
        panonear = None
        it = 1
        while panonear is None:
            panonear = getNearPano(point, near=buf*it)
            it = it + 1
        free.pano = panonear.name
        frees.append(free)
    return frees

def getPOIs(pano0, buf = 20.0):
    pois = []
    qs = PanoPoiData.objects.filter(geom__distance_lt=(pano0.geom, D(m=buf)))
    for pano in qs:
        poi = DotDict()
        poi.name = pano.name
        poi.exid = pano.exid
        poi.tag = 1
        poi.lon = pano.geom.x
        poi.lat = pano.geom.y
        poi.alt = pano.altitude
        # get near streetview pano
        point = fromstr('POINT(%s %s)'%(poi.lon, poi.lat), srid=PANO_CONFIG["srid"])
        panonear = None
        it = 1
        while panonear is None:
            panonear = getNearPano(point, near=buf*it)
            it = it + 1
        poi.pano = panonear.name
        pois.append(poi)
    return pois

# for xflip = true
# convert to position angle
def getDirection(pano):
    return float(pano.attitude_z)+180.0

def getNearPano(point,  near = 5.0):
    qs = PanoPointData.objects.filter(geom__distance_lt=(point, D(m=near))).distance(point).order_by('distance')
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
    info.nadir = "false"
    info.zenith = "false"
    return info

##### web services #####

def panoInit(request):
    # pano = get_object_or_404(PanoPointData, name=pano_name)
    return render(request, 'panorama/init.xml', {'debug':PANO_CONFIG["DEBUG"]})

def panoInfo(request, pano_name):
    try:
        buffer = float(request.REQUEST['buffer'])
        distance = float(request.REQUEST['distance'])
        # isFree = int(request.REQUEST['free'])
    except:
        buf = 50.0
        distance = 2.0
        # isFree = 0
    if pano_name.startswith('innerpano_'):
        pano = get_object_or_404(PanoFreeData, name=pano_name)
    else:
        pano = get_object_or_404(PanoPointData, name=pano_name)
    info = getPanoInfo(pano)
    if pano_name.startswith('innerpano_'):
        neighbours = []
        pois = []
        frees = getFreePanos(pano, 1, buf)
    else:
        neighbours = getNeighbours(pano, distance)
        pois = getPOIs(pano, buf)
        frees = getFreePanos(pano, 0, buf)
    return render(request, 'panorama/pano.xml',
                    {
                        'pano':info,
                        'neighbours':neighbours,
                        'frees':frees,
                        'pois':pois,
                    })

# 只获取街景上的全景点，不获取离散全景点
def panoInfo2(request, lon, lat):
    try:
        near = float(request.REQUEST['near'])
        buf = float(request.REQUEST['buffer'])
        distance = float(request.REQUEST['distance'])
    except:
        near = 5.0
        buf = 20.
        distance = 2.0
    lon = float(lon)
    lat = float(lat)
    srid = PANO_CONFIG["srid"]
    if srid == 900913:
        point = WebMercatorProjection.project(LonLat(lon, lat))
        point = fromstr('POINT(%s %s)'%(point.x, point.y), srid=srid)
    else:
        point = fromstr('POINT(%s %s)'%(lon, lat), srid=srid)
    pano = getNearPano(point, near)
    info = getPanoInfo(pano)
    neighbours = getNeighbours(pano, distance)
    frees = getFreePanos(pano, 0, buf)
    pois = getPOIs(pano, buf)
    return render(request, 'panorama/pano.xml',
                    {
                        'pano':info,
                        'neighbours':neighbours,
                        'frees':frees,
                        'pois':pois,
                    })

def panoImageInfo(request, pano_name, face):
    if pano_name.startswith('innerpano_'):
        pano = get_object_or_404(PanoFreeData, name=pano_name)
    else:
        pano = get_object_or_404(PanoPointData, name=pano_name)
    deepZoomDes = DeepZoomImageDescriptor(pano.cubic_size, pano.cubic_size)
    output = cStringIO.StringIO()
    content = deepZoomDes.save()
    return HttpResponse(content, content_type="text/xml", status=200)

def panoNear(request, lon, lat):
    try:
        near = float(request.REQUEST['distance'])
    except:
        near = 5.0
    try:
        callback = request.REQUEST['callback']
    except KeyError:
        callback = None
    lon = float(lon)
    lat = float(lat)
    srid = PANO_CONFIG["srid"]
    if srid == 900913:
        point = WebMercatorProjection.project(LonLat(lon, lat))
        point = fromstr('POINT(%s %s)'%(point.x, point.y), srid=srid)
    else:
        point = fromstr('POINT(%s %s)'%(lon, lat), srid=srid)
    pano = getNearPano(point, near)
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

def panoPOI(request, pano_name):
    try:
        buf = float(request.REQUEST['buffer'])
    except:
        buf = 20.0
    pano = get_object_or_404(PanoPointData, name=pano_name)
    pois = getPOIs(pano, buf)
    return render(request, 'panorama/poi.xml',{'pois':pois})

def panoTile(request, pano_name, face, zoom, col, row, extension):
    # # using django module
    # try:
    #     tile = PanoTileData.objects.get(pano_name=pano_name, cubic_surface=int(face), \
    #         zoom_level=int(zoom), tile_column=int(col), tile_row=int(row))
    #     return HttpResponse(tile.tile_data, content_type="image/jpeg", status=200)
    # except ObjectDoesNotExist:
    #     return HttpResponse(content_type="image/jpeg", status=404)

    # using pano_store
    if pano_name.startswith('innerpano_'):
        pano_store = PanoTileStore.load(PANO_CONFIG["panostore2"])
    else:
        pano_store = PanoTileStore.load(PANO_CONFIG["panostore"])
    tilecoord = TileCoord(int(col), int(row), int(zoom))
    tile = PanoTile(pano_name, int(face), tilecoord)
    tile = pano_store.get_tile(tile)
    pano_store.close()
    if tile.data:
        return HttpResponse(tile.data, content_type="image/jpeg", status=200)
    else:
        return HttpResponse(content_type="image/jpeg", status=404)


##### preview #####
def panoPreview(request):
    #pano_name = request.REQUEST['pano']
    # camera = request.REQUEST['camera']
    # pano = get_object_or_404(PanoPointData, name=pano_name)
    #return render(request, 'panorama/preview.html', {'pano_name': pano_name})
    return render(request, 'panorama/preview.html')
