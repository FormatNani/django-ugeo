# -*- coding: utf8 -*-

from django.conf import settings

PANO_CONFIG = getattr(settings, 'PANO_CONFIG', {})

if PANO_CONFIG is None or 'panostore' not in PANO_CONFIG:
    PANO_CONFIG["panostore"] = "file://data/panotiles"
