#!/usr/bin/env python
# -*- coding: utf-8 -*-

from libpano import *
from osgeo import ogr
from osgeo import osr

debug_name = True

def createDataSource(dsString, driverName):

    OGRDriver = ogr.GetDriverByName(driverName);
    if OGRDriver is None:
        print('OGR Driver %s not found' % driverName)
        sys.exit( 1 )

    OGRDataSource=OGRDriver.Open(dsString)
    if OGRDataSource is not None:
        OGRDataSource.Destroy()
        OGRDriver.DeleteDataSource(dsString)
        if Verbose:
            print('truncating index '+ dsString)

    OGRDataSource=OGRDriver.CreateDataSource(dsString)
    if OGRDataSource is None:
        print('Could not open datasource '+dsString)
        sys.exit( 1 )
    return OGRDataSource

def getDataSource(dsString, driverName="ESRI Shapefile"):
    OGRDriver = ogr.GetDriverByName(driverName);
    if OGRDriver is None:
        print('OGR Driver %s not found' % driverName)
        sys.exit( 1 )

    OGRDataSource=OGRDriver.Open(dsString)
    return OGRDataSource

def getDataSourceForce(dsString, driverName="ESRI Shapefile"):
    OGRDriver = ogr.GetDriverByName(driverName);
    if OGRDriver is None:
        print('OGR Driver %s not found' % driverName)
        sys.exit( 1 )

    OGRDataSource=OGRDriver.Open(dsString, 1)
    if OGRDataSource is None:
        OGRDataSource = createDataSource(dsString, driverName)
    return OGRDataSource

def closeDataSource(OGRDataSource):
    OGRDataSource.Destroy()

def getLayer(OGRDataSource, layerName):
    OGRLayer = OGRDataSource.GetLayerByName(layerName)
    if OGRLayer is None:
        return None
    return [OGRDataSource, OGRLayer]

def openLayerForRead(dsString, driverName="ESRI Shapefile"):
    OGRDriver = ogr.GetDriverByName(driverName);
    if OGRDriver is None:
        print('OGR Driver %s not found' % driverName)
        return [None, None]

    OGRDataSource=OGRDriver.Open(dsString, 0)
    if OGRDataSource is None:
        print('OGR DataSource %s not found' % dsString)
        return [None, None]
    OGRLayer = OGRDataSource.GetLayer()
    if OGRLayer is None:
        return [None, None]
    return [OGRDataSource, OGRLayer]

def createLayer(OGRDataSource, layerName, fieldsMap, layerType, srs=4326):
    # OGRDataSource=getDataSourceForce(dsString, driverName)

    for it in range(OGRDataSource.GetLayerCount()-1, -1, -1):
        layer = OGRDataSource.GetLayer(it)
        if layer.GetName() == layerName:
            OGRDataSource.deleteLayer(it)

    spatialReference = None
    if isinstance(srs, int):
        spatialReference = osr.SpatialReference()
        spatialReference.ImportFromEPSG(srs)

    OGRLayer = OGRDataSource.CreateLayer(layerName, spatialReference, layerType)
    if OGRLayer is None:
        print('Could not create Layer')
        sys.exit( 1 )

    for fieldName, fieldType in fieldsMap.iteritems():
        OGRFieldDefn = ogr.FieldDefn(fieldName,fieldType)
        if OGRFieldDefn is None:
            print('Could not create FieldDefn for '+fieldName)
            sys.exit( 1 )
        if OGRLayer.CreateField(OGRFieldDefn) != 0:
            print('Could not create Field for '+fieldName)
            sys.exit( 1 )

    return [OGRDataSource, OGRLayer]


if __name__ == "__main__":
    ds_pano = "pg:dbname='topcon' host='127.0.0.1' port='5432' user='postgres' password='postgres'"
    # ds_pano = "sqlite3:../data/topcon2.db"
    ips_file = "../data/posed_lb_ _4pics"
    srid = 900913
    xflip = True

    ips_file = os.path.abspath(ips_file)
    data_dir = os.path.dirname(ips_file)

    try:
        panometas = []
        metafile = open(ips_file)
        for line in metafile:
            if line[0:1] != "#":
                metadata = read_pano_from_line(line, srid)
                panometas.append(metadata)
    except Exception,ex:
        print ex

    firstname = panometas[0].name
    #test
    if debug_name:
        firstname = "posed_lb_ "+firstname
    firstpano = CubicPano(firstname, xflip = xflip)
    cubic_size = firstpano.getCubicSize(os.path.join(data_dir, firstname+'.jpg'))
