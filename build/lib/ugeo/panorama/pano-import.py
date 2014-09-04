#!/usr/bin/env python
# -*- coding: utf-8 -*-


from libpano import *
import psycopg2
import subprocess

def read_pano_from_line(line):
  pano = DotDict()
  assert line[0:1] != "#", "line为注释内容"
  values = line.split()
  assert len(values) == 16, "ips文件结构不同"
  filename = values[0]
  name = filename.rsplit('\\')[-1][0:-1]
  name, ext = os.path.splitext(name)
  pano.name = name
  pano.file_type = values[1][1:-1] #去掉引号
  # if self.file_type == "JPG":
  #   self.file_type = "JPEG"
  pano.ca_type = int(values[2])
  pano.ca_subtype = int(values[3])
  pano.seq_id = int(values[4])
  pano.timestamp = int(values[5])
  pano.GPS_time_s = int(values[6])
  pano.GPS_time_u = int(values[7])
  pano.position = Position(float(values[9]), float(values[8]), float(values[10]))
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
      con = psycopg2.connect(db_profile[3:])
    elif db_profile.startswith('sqlite3:'):
      con = sqlite3.connect(db_profile[8:])
    else:
      raise
  except Exception, e:
    print "Could not connect to database"
    sys.exit(1)
  return con

def import_lines(cur, panometas):
  cur.execute("BEGIN;")
  for i in range(len(panometas)-1):
    linestring = 'LINESTRING ('
    linestring += panometas[i].position.toString2D()
    linestring += ','
    linestring += panometas[i+1].position.toString2D()
    linestring += ')'
    cur.execute(
        """INSERT INTO panorama_panolinedata (geom, name, start, "end")
        VALUES (ST_GeomFromText('%s', 4326), 'undefine', '%s', '%s');""" % \
        (linestring, panometas[i].name, panometas[i+1].name)
    )
  cur.execute("COMMIT;")

def import_points(cur, panometas):
  cur.execute("BEGIN;")
  for pm in panometas:
    point = "POINT (" + pm.position.toString2D() + ")"
    cur.execute(
      """INSERT INTO panorama_panopointdata (geom, altitude, name, file_type,
        ca_type, ca_subtype, seq_id, "timestamp", "GPS_time_s", "GPS_time_u",
        attitude_x, attitude_y, attitude_z, trigger_id, frame_id)
        VALUES (ST_GeomFromText('%s', 4326), %d, '%s', '%s', %d, %d,
        %d, %s, %d, %d, %f, %f, %f, %d, %d);""" % \
        (point, pm.position.alt, pm.name, pm.file_type,
        pm.ca_type, pm.ca_subtype, pm.seq_id, str(pm.timestamp), pm.GPS_time_s, pm.GPS_time_u,
        pm.attitude_x, pm.attitude_y, pm.attitude_z, pm.trigger_id, pm.frame_id)
    )
  cur.execute("COMMIT;")

def import_pano(datasource, data_dir, panometas, xflip=True):
  pano_store = PanoTileStore.load(datasource)
  for panometa in panometas:
    cubic_pano = CubicPano(panometa.name, xflip = xflip)
    cubic_pano.initByEquirect(os.path.join(data_dir, panometa.name+'.jpg'))
    # cubic_pano.save2disk(os.path.join(data_dir, "test"))
    for face in cubic_pano.faces:
      for tile in face.iter_tiles():
        pano_store.put_tile(tile)


def main(ips_file, meta=True, pano=True, xflip=True):
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

  ds_pg = "PG:dbname='toppano' host='127.0.0.1' port='5432' user='_postgres' password='_postgres'"
  ds_pano = "file://./panotiles"

  if meta is True:
    con = db_connect(ds_pg)
    cur = con.cursor()
    import_points(cur, panometas)
    import_lines(cur, panometas)
    optimize_database(cur)
    con.commit()
    con.close()

  if pano is True:
    import_pano(ds_pano, pano_dir, panometas, xflip)

if __name__ == "__main__":
  ips_file = "/Users/sw/Documents/Topcon_360_Project/data/20140521/posed_pics/posed_4__4pics"
  # ips_file = "posed__44001"
  main(ips_file, meta=True, pano=False, xflip=True)
