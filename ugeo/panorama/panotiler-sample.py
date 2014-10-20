#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess

from libpano import *


if __name__ == "__main__":
    ds_pano = "file://../data/data/sample/tiler"
    data_dir = "../data/data/sample"
    filename = "ladybug_panoramic_000000"
    srid = 900913
    xflip = False

    data_dir = os.path.abspath(data_dir)

    pano_store = PanoTileStore.load(ds_pano)
    cubic_pano = CubicPano("sample", xflip = xflip)
    cubic_pano.initByEquirect(os.path.join(data_dir, filename+'.jpg'))
    print(cubic_pano.getCubicSize())
    cubic_pano.save2disk(os.path.join(data_dir, "6faces"))
    for face in cubic_pano.faces:
        for tile in face.iter_tiles():
            pano_store.put_tile(tile)
    if isinstance(pano_store, SqlitePanoTileStore):
        pano_store.commit_database()
    pano_store.close()
    print("ok")
