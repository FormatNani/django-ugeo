from django.conf.urls import patterns, include, url

#from django.contrib import admin
from django.contrib.gis import admin

admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'UGeo.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),

    url(r'^admin/', include(admin.site.urls)),
    url(r'^pano/', include('panorama.urls')),
    url(r'^geoproxy/', include('geoproxy.urls')),

    url(r'^topcon.html', 'topcon.views.streetview'),
    url(r'^overmap.html', 'topcon.views.overmap'),
    url(r'^crossdomain.xml', 'topcon.views.crossdomain'),

)
