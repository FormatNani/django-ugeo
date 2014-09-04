# -*- coding: utf8 -*-

from django.conf import settings

PANO_CONFIG = getattr(settings, 'PANO_CONFIG', {})

if 'panostore' not in PANO_CONFIG:
    PANO_CONFIG["panostore"] = "file://data/panotiles"
