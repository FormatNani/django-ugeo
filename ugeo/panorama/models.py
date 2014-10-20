# from django.db import models
from django.contrib.gis.db import models
# Create your models here.
from panorama import PANO_CONFIG

decimal_kwargs = {'max_digits': 6,'decimal_places': 2,}


class PanoPointData(models.Model):
  name = models.CharField(max_length=32, unique=True)
  file_type = models.CharField(max_length=8, default='JPG')
  ca_type = models.IntegerField(default=19)
  ca_subtype = models.IntegerField(default=0)
  seq_id = models.IntegerField()
  timestamp = models.CharField(max_length=20)
  GPS_time_s = models.IntegerField()
  GPS_time_u = models.IntegerField()
  geom = models.PointField(srid=PANO_CONFIG["srid"], dim=2)
  altitude = models.DecimalField(**decimal_kwargs)
  attitude_x = models.DecimalField(**decimal_kwargs)
  attitude_y = models.DecimalField(**decimal_kwargs)
  attitude_z = models.DecimalField(**decimal_kwargs)
  trigger_id = models.IntegerField()
  frame_id = models.IntegerField(default=0)
  cubic_size = models.IntegerField()
  objects = models.GeoManager()

  def __unicode__(self):
    return self.name

class PanoLineData(models.Model):
  name = models.CharField(max_length=32)
  geom = models.LineStringField(srid=PANO_CONFIG["srid"], dim=2)
  start = models.CharField(max_length=32)
  end = models.CharField(max_length=32)
  objects = models.GeoManager()

  def __unicode__(self):
    return self.name


class PanoPoiData(models.Model):
  name = models.CharField(max_length=32)
  exid = models.IntegerField()
  geom = models.PointField(srid=PANO_CONFIG["srid"], dim=2)
  altitude = models.DecimalField(**decimal_kwargs)
  objects = models.GeoManager()

  def __unicode__(self):
    return self.name

class PanoFreeData(models.Model):
  name = models.CharField(max_length=32, unique=True)
  title = models.CharField(max_length=32)
  domain = models.CharField(max_length=32)
  geom = models.PointField(srid=PANO_CONFIG["srid"], dim=2)
  altitude = models.DecimalField(**decimal_kwargs)
  attitude_x = models.DecimalField(**decimal_kwargs)
  attitude_y = models.DecimalField(**decimal_kwargs)
  attitude_z = models.DecimalField(**decimal_kwargs)
  timestamp = models.CharField(max_length=20)
  cubic_size = models.IntegerField()
  objects = models.GeoManager()

  def __unicode__(self):
    return self.name


class PanoTileData(models.Model):
  pano_name = models.CharField(max_length=32)
  cubic_surface = models.IntegerField()
  zoom_level = models.IntegerField()
  tile_column = models.IntegerField()
  tile_row = models.IntegerField()
  tile_data = models.BinaryField()
  class Meta:
    unique_together = ("pano_name", "cubic_surface", "zoom_level", "tile_column", "tile_row")
    # index_together = ("pano_name", "cubic_surface", "zoom_level", "tile_column", "tile_row")







#
