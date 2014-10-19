#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sqlite3
from ctypes.util import find_library

def read_panoname_from_line(line):
  assert line[0:1] != "#", "line为注释内容"
  values = line.split('\t')
  assert len(values) == 16, "ips文件结构不同"
  filename = values[0]
  name = filename.rsplit('\\')[-1][0:-1]
  name, ext = os.path.splitext(name)
  return name

ds_pano = "sqlite3:../data/topcon.db"
ips_file = "../data/sourcedata/topcon-streetpano-20140824/posed_lb_ _4pics"

con = sqlite3.connect(ds_pano[8:])
con.enable_load_extension(True)
spatialite_lib = find_library('mod_spatialite')
con.load_extension(spatialite_lib)
cur = con.cursor()
cur.execute("""PRAGMA synchronous=0""")
cur.execute("""PRAGMA locking_mode=EXCLUSIVE""")
cur.execute("""PRAGMA journal_mode=DELETE""")
metafile = open(ips_file)
for line in metafile:
  if line[0:1] != "#":
    rawname = read_panoname_from_line(line)
    newname = rawname[10:]
    cur.execute("UPDATE panorama_panolinedata SET start=? where start=?", (newname, rawname))
    cur.execute("UPDATE panorama_panolinedata SET end=? where end=?", (newname, rawname))
    cur.execute("UPDATE panorama_panopointdata SET name=? where name=?", (newname, rawname))
    cur.execute("UPDATE panorama_panotiledata SET pano_name=? where pano_name=?", (newname, rawname))
cur.execute("""ANALYZE;""")
cur.execute("""VACUUM;""")
con.commit()
con.close()
