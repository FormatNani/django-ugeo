#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
from libpano import *

debug_name = True

if __name__ == "__main__":
    ds_pano = "pg:dbname='topcon' host='127.0.0.1' port='5432' user='postgres' password='postgres'"
    # ds_pano = "sqlite3:../data/topcon2.db"
    ips_file = "../data/sourcedata/topcon-streetpano-20140824/posed_lb_ _4pics"
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

    panometa_store = PanoMetaStore.load(ds_pano)
    panometa_store.put_points_from_panos(panometas, cubic_size, srid)
    panometa_store.put_lines_from_panos(panometas, srid)
    panometa_store.commit_database()
    panometa_store.optimize_database()
    panometa_store.close()
