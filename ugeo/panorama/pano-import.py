#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess

from libpano import *

srid = 900913
# srid = 4326

def read_pano_from_line(line):
  pano = DotDict()
  assert line[0:1] != "#", "line为注释内容"
  values = line.split('\t')
  assert len(values) == 16, "ips文件结构不同"
  filename = values[0]
  name = filename.rsplit('\\')[-1][0:-1]
  name, ext = os.path.splitext(name)
  # test
  #name = name[10:]
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

def optimize_database(cur):
  cur.execute("""ANALYZE;""")
  cur.execute("""VACUUM;""")

def db_connect(db_profile):
  try:
    if db_profile.startswith('PG:'):
      import psycopg2
      con = psycopg2.connect(db_profile[3:])
    elif db_profile.startswith('sqlite3:'):
      from ctypes.util import find_library
      import sqlite3
      con = sqlite3.connect(db_profile[8:])
      con.enable_load_extension(True)
      spatialite_lib = find_library('mod_spatialite')
      con.load_extension(spatialite_lib)
      optimize_connection(con)
    else:
      raise
  except Exception, e:
    print "Could not connect to database"
    sys.exit(1)
  return con

def optimize_connection(sqlite_con):
    sqlite_cur = sqlite_con.cursor()
    sqlite_cur.execute("""PRAGMA synchronous=0""")
    sqlite_cur.execute("""PRAGMA locking_mode=EXCLUSIVE""")
    sqlite_cur.execute("""PRAGMA journal_mode=DELETE""")

def import_lines(cur, panometas):
  # cur.execute("BEGIN;")
  # ST_GeomFromText
  for i in range(len(panometas)-1):
    linestring = 'LINESTRING ('
    linestring += panometas[i].position.toString2D()
    linestring += ','
    linestring += panometas[i+1].position.toString2D()
    linestring += ')'
    query = """INSERT INTO panorama_panolinedata (geom, name, start, "end")
    VALUES (GeomFromText(?, ?), ?, ?, ?);"""
    cur.execute(query, (linestring, srid, 'undefine', panometas[i].name, panometas[i+1].name))
  #cur.execute("COMMIT;")

def import_points(cur, panometas, cubic_size=1720):
  # cur.execute("BEGIN;")
  # ST_GeomFromText
  for pm in panometas:
    point = "POINT (" + pm.position.toString2D() + ")"
    query = """INSERT INTO panorama_panopointdata (geom, altitude, name, file_type,
      ca_type, ca_subtype, seq_id, "timestamp", "GPS_time_s", "GPS_time_u",
      attitude_x, attitude_y, attitude_z, trigger_id, frame_id, cubic_size)
      VALUES (GeomFromText(?, ?), ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);"""
    cur.execute(query, (point, srid, pm.position.alt, pm.name, pm.file_type,
        pm.ca_type, pm.ca_subtype, pm.seq_id, str(pm.timestamp), pm.GPS_time_s, pm.GPS_time_u,
        pm.attitude_x, pm.attitude_y, pm.attitude_z, pm.trigger_id, pm.frame_id, cubic_size))
  #cur.execute("COMMIT;")

def import_pano(datasource, data_dir, panometas, xflip=True):
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
  if isinstance(pano_store, SqlitePanoTileStore):
    pano_store.close_database()

def streetview_init(ds_pano, ips_file, meta=True, pano=True, xflip=True):
  ips_file = os.path.abspath(ips_file)
  pano_dir = os.path.dirname(ips_file)

  try:
    panometas = []
    metafile = open(ips_file)
    for line in metafile:
      if line[0:1] != "#":
        metadata = read_pano_from_line(line)
        panometas.append(metadata)
  except Exception,ex:
    print ex

  if meta is True:
    con = db_connect(ds_pano)
    cur = con.cursor()
    firstname = panometas[0].name
    #test
    #firstname = "posed_lb_ "+firstname
    firstpano = CubicPano(firstname, xflip = xflip)
    cubic_size = firstpano.getCubicSize(os.path.join(pano_dir, firstname+'.jpg'))
    import_points(cur, panometas, cubic_size)
    import_lines(cur, panometas)
    # optimize_database(cur)
    con.commit()
    con.close()

  if pano is True:
    import_pano(ds_pano, panometas, xflip)

def interiorview_init(ds_pano, panodir):
    pass

if __name__ == "__main__":
  #ds_pg = "PG:dbname='topcon' host='127.0.0.1' port='5432' user='_postgres' password='_postgres'"
  ds_pano = "sqlite3:../data/topcon.db"
  ips_file = "/Users/sw/360云盘/拓普康项目/data/sroucedata/topcon-streetpano-20140824/posed_lb_ _4pics"
  streetview_init(ds_pano, ips_file, meta=True, pano=False, xflip=True)
  # interiorview_init(ds_pg, ds_pano, panodir)
