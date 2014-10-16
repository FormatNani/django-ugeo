"""
Django settings for UGeo project.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
BASE_DIR = os.path.dirname(os.path.dirname(__file__))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.6/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'zmx-xh6dmzian%a2i^6!4uq^((3=i*8$s@05^)h=@@k&@oupnm'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

TEMPLATE_DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    # 'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    #'south',
    'leaflet',
    'djgeojson',
    'panorama',
    'geoproxy',
    'topcon',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'UGeo.urls'

WSGI_APPLICATION = 'UGeo.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.6/ref/settings/#databases

DATABASES = {
    'default': {
         'ENGINE': 'django.contrib.gis.db.backends.postgis',
         'NAME': 'topcon',
         'USER': 'postgres',
         'PASSWORD': 'postgres',
         'HOST': '127.0.0.1',
         'CONN_MAX_AGE':None,
     },
    'undefault': {
        'ENGINE': 'django.contrib.gis.db.backends.spatialite',
        'NAME': os.path.join(BASE_DIR, 'data', 'topcon.db'),
        'CONN_MAX_AGE':None,
    }
}

SPATIALITE_LIBRARY_PATH = '/usr/local/Cellar/libspatialite/4.2.0/lib/mod_spatialite.dylib'
SPATIALITE_LIBRARY_PATH = '/usr/local/lib/mod_spatialite.so'

# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'zh-cn'

TIME_ZONE = 'Asia/Shanghai'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.6/howto/static-files/

STATIC_URL = '/static/'


LEAFLET_CONFIG = {
    'PLUGINS': {
        'forms': {
            'auto-include': True
        },
        'lltdt_tilelayer': {'js': 'leaflet/plugins/L.TileLayer.LLTDT.js'},
        'functional_tilelayer': {'js': 'leaflet/plugins/L.TileLayer.Functional.js'},
    },
}

PANO_CONFIG = {
    'panostore':"sqlite3:"+os.path.join(BASE_DIR, 'data', 'topcon.db'),
    'panostore2':"sqlite3:"+os.path.join(BASE_DIR, 'data', 'topcon2.db'),
    'srid':900913,
    'DEBUG':False,
}

POSTGIS_VERSION = (2, 1, 3)
