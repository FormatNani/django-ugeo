#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess

from libpano import *


if __name__ == "__main__":
    #ds_pano = "pg:dbname='topcon' host='127.0.0.1' port='5432' user='postgres' password='postgres'"
    ds_pano = "sqlite3:../data/topcon2.db"
    path = "../data/sroucedata/topcon-interpano-201408/temp/"
    srid = 900913
    xflip = True

    data_dir = os.path.abspath(path)
    pano_store = PanoTileStore.load(ds_pano)

    for filename in os.listdir(data_dir):
        name,ext = filename.rsplit(".", 1)
        if ext.upper() == "JPG":
            cubic_pano = CubicPano(name, xflip = xflip)
            cubic_pano.initByEquirect(os.path.join(data_dir, name+'.jpg'))
            # cubic_pano.save2disk(os.path.join(data_dir, "test"))
            for face in cubic_pano.faces:
                for tile in face.iter_tiles():
                    pano_store.put_tile(tile)
            if isinstance(pano_store, SqlitePanoTileStore):
                pano_store.commit_database()
    pano_store.close()
