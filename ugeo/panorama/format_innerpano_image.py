#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from PIL import Image
import numpy

Image.MAX_IMAGE_PIXELS = None

def main(path):
    path = os.path.abspath(path)
    images = list()
    basename = "innerpano_"
    it = 0
    for filename in os.listdir(path):
        name,ext = filename.rsplit(".", 1)
        if ext.upper() == "JPG":
            image = Image.open(os.path.join(path, filename))
            width, height = image.size
            if width > height*2:
                image2 = Image.new("RGB", (width, width/2), "black")
                image2.paste(image, (0, 0, width, height))
                image2.save(os.path.join(path, "%s%06d.jpg" % (basename, it)), 'JPEG')
                # image2.save(os.path.join(path, "pre1", filename), 'JPEG')
                it = it + 1
                print("%s 处理完成" % filename)

if __name__ == "__main__":
    path = "/Users/sw/项目/拓普康项目/data/sroucedata/topcon-interpano-201408"
    main(path)
