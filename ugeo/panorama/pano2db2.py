#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
from libpano import *
import psycopg2

if __name__ == "__main__":
    srid = 900913
    ds_pano = "pg:dbname='topcon' host='127.0.0.1' port='5432' user='postgres' password='postgres'"
    # path = "../data/sourcedata/topcon-interpano-201408/temp/"
    # data_dir = os.path.abspath(path)
    # cubic_size = 0
    # for filename in os.listdir(data_dir):
    #     name,ext = filename.rsplit(".", 1)
    #     if ext.upper() == "JPG":
    #         cubic_pano = CubicPano(name)
    #         cubic_size = cubic_pano.getCubicSize(os.path.join(data_dir, filename))
    #         print cublic_size
    #         break

    connection = psycopg2.connect(ds_pano[3:])
    cursor = connection.cursor()

    # import freepanos
    # lons = [12971358, 12971372, 12971396, 12971404, 12971415, 12971498, 12971515, 12971495,  12971481]
    # lats = [4834072, 4834031, 4834043, 4834095, 4834102, 4834154, 4834125, 4834136, 4834086]
    lons = [12971348, 12971363, 12971381, 12971400, 12971408, 12971487, 12971512, 12971498,  12971487, 12971357, 12971352]
    lats = [4834064,  4834024,  4834035,  4834086,  4834090,  4834150,  4834119,  4834131,   4834086,  4834073,  4834041]
    titles = ["A座4层1", "A座4层2", "A座4层3", "B座1层", "B座4层", "和合1层健身房", "和合1层大堂",
        "和合二层羽毛球场", "篮球场", "A座后门", "A座大堂"]
    alts = [36, 36, 36, 24, 36, 24, 24, 28, 24, 24, 24]
    cursor.execute("BEGIN;")
    for it in range(len(titles)):
        name = "innerpano_%06d" % it
        point = "POINT (%f %f)" % (lons[it], lats[it])
        query = """INSERT INTO panorama_panofreedata (name, title, geom, altitude, attitude_x, attitude_y, attitude_z,
                "timestamp", cubic_size)
          VALUES ('%s', '%s', ST_GeomFromText('%s', %d), %f, %d, %d, %d, %d, %d);
          """ % (name, titles[it], point, srid, alts[it], 180, 0, 90, 90239355116, 6414)
        cursor.execute(query)
    cursor.execute("COMMIT;")

    # import pois
    lons = [12971358, 12971410, 12971500, 12971487]
    lats = [4834045, 4834075, 4834128, 4834086]
    names = ["SIGM园区A座", "SIGM园区B座", "SIGM园区D座", "SIGM园区篮球场"]
    cursor.execute("BEGIN;")
    for it in range(4):
        name = names[it]
        point = "POINT (%f %f)" % (lons[it], lats[it])
        query = """INSERT INTO panorama_panopoidata (name, exid, geom, altitude)
          VALUES ('%s', %d, ST_GeomFromText('%s', %d), %f);
          """ % (name, it, point, srid, 20.)
        cursor.execute(query)
    cursor.execute("COMMIT;")

    cursor.close()
    connection.close()
