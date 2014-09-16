#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess

from libpano import *

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

  pano_store = PanoTileStore.load(ds_pano)
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
