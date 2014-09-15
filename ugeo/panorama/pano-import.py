#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess

from libpano import *

debug_name = True

def read_pano_from_line(line, srid):
  pano = DotDict()
  assert line[0:1] != "#", "line为注释内容"
  values = line.split('\t')
  assert len(values) == 16, "ips文件结构不同"
  filename = values[0]
  name = filename.rsplit('\\')[-1][0:-1]
  name, ext = os.path.splitext(name)
  if debug_name:
    name = name[10:]
  pano.name = name
  pano.file_type = values[1][1:-1] #去掉引号
  pano.ca_type = int(values[2])
  pano.ca_subtype = int(values[3])
  pano.seq_id = int(values[4])
  pano.timestamp = int(values[5])
  pano.GPS_time_s = int(values[6])
  pano.GPS_time_u = int(values[7])
  lonlat = LonLat(float(values[9]), float(values[8]))
  if srid == 900913:
    point = WebMercatorProjection.project(lonlat)
    pano.position = Position(point.x, point.y, float(values[10]))
  else:
    pano.position = Position(lonlat.lon, lonlat.lat, float(values[10]))
  pano.attitude_x = float(values[11])
  pano.attitude_y = float(values[12])
  pano.attitude_z = float(values[13])
  pano.trigger_id = int(values[14])
  pano.frame_id = int(values[15])
  return pano

def import_pano(datasource, data_dir, panometas, xflip=True, srid=900913):
  pano_store = PanoTileStore.load(datasource)
  for panometa in panometas:
    cubic_pano = CubicPano(panometa.name, xflip = xflip)
    cubic_pano.initByEquirect(os.path.join(data_dir, panometa.name+'.jpg'))
    # cubic_pano.save2disk(os.path.join(data_dir, "test"))
    for face in cubic_pano.faces:
      for tile in face.iter_tiles():
        pano_store.put_tile(tile)
    if isinstance(pano_store, SqlitePanoTileStore):
        pano_store.commit_database()
    print(panometa.name)
  pano_store.close()

def import_meta(datasource, data_dir, panometas, xflip=True, srid=900913):
    panometa_store = PanoMetaStore.load(datasource)
    firstname = panometas[0].name
    #test
    if debug_name:
        firstname = "posed_lb_ "+firstname
    firstpano = CubicPano(firstname, xflip = xflip)
    cubic_size = firstpano.getCubicSize(os.path.join(data_dir, firstname+'.jpg'))
    panometa_store.put_points_from_panos(panometas, cubic_size, srid)
    panometa_store.put_lines_from_panos(panometas, srid)
    panometa_store.commit_database()
    panometa_store.optimize_database()
    panometa_store.close()

def streetview_init(ds_pano, ips_file, meta=True, pano=True, xflip=True, srid=900913):
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

  if meta is True:
    import_meta(ds_pano, data_dir, panometas, xflip, srid)

  if pano is True:
    import_pano(ds_pano, data_dir, panometas, xflip, srid)

def interiorview_init(ds_pano, panodir):
    pass

if __name__ == "__main__":
  ds_pano = "pg:dbname='topcon' host='127.0.0.1' port='5432' user='_postgres' password='_postgres'"
  # ds_pano = "sqlite3:../data/topcon2.db"
  ips_file = "/Users/sw/360云盘/拓普康项目/data/sroucedata/topcon-streetpano-20140824/posed_lb_ _4pics"
  srid = 900913
  streetview_init(ds_pano, ips_file, meta=True, pano=False, xflip=True, srid=srid)
  # interiorview_init(ds_pg, ds_pano, panodir)
