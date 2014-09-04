#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import math
import numpy as np
import PIL.Image
import cStringIO

import xml.dom.minidom
import uuid

import logging

# logging.basicConfig(level=getattr(logging, 'DEBUG'))

class LonLat(object):

  '''经纬度坐标点类'''

  DEG_TO_RAD = math.pi / 180
  RAD_TO_DEG = 180 / math.pi
  MAX_MARGIN = 1.0E-9

  def __init__(self, lon, lat):
    self.lon = lon
    self.lat = lat

  def equals(self, obj):
    margin = math.max(
        math.abs(self.lat - obj.lat), math.abs(self.lon - obj.lon))
    return margin <= self.MAX_MARGIN

  def __str__(self):
    return '%f, %f' % (self.lon, self.lat)

  def rowcol(self, width, height):
    ratio = 1
    if width < 2*height:
      ratio = height/180.
    else:
      ratio = width/360.
    row = self.lat*ratio
    col = self.lon*ratio
    return RowCol(row, col)

  def radian(self):
    return Radian(lon*self.DEG_TO_RAD, lat*self.DEG_TO_RAD)

class Radian(object):
  def __init__(self, phi, theta):
    # angle off plane xz(lon)
    self.phi = phi
    # angle off plane xy(lat)
    self.theta = theta
    # self.phi = self.phi % 2*math.pi
    # self.theta = self.theta % 2*math.pi

  def rowcol(self, width, height):
    ratio = 1
    if width < 2*height:
      ratio = height/math.pi
    else:
      ratio = width/(2*math.pi)
    row = self.theta*ratio % height
    col = self.phi*ratio % width
    return RowCol(row, col)

  def lonlat(self):
    return LonLat(self.phi*LonLat.RAD_TO_DEG, self.theta*LonLat.RAD_TO_DEG)

class RowCol(object):

  '''行列类: row:y, col:x'''

  def __init__(self, row, col):
    self.row = row
    self.col = col

  def __str__(self):
    return '%f, %f' % (self.row, self.col)

class Extent(object):

  '''范围类'''

  def __init__(self, xmin, ymin, xmax, ymax):
    self.xmin = xmin
    self.ymin = ymin
    self.xmax = xmax
    self.ymax = ymax

  def __str__(self):
    return '%f, %f, %f, %f' % (self.xmin, self.ymin, self.xmax, self.ymax)

  def __eq__(self, other):
    eq = (self.xmin == other.xmin)
    eq = eq and (self.xmax == other.xmax)
    eq = eq and (self.ymin == other.ymin)
    eq = eq and (self.ymax == other.ymax)
    return eq

  def tuple(self):
    return (self.xmin, self.ymin, self.xmax, self.ymax)

  @classmethod
  def from_string(cls, s):
    m = re.match(r'(\f+), (\f+), (\f+), (\f+)', s)
    if not m:
      raise ValueError(
          'invalid literal for %s.from_string: %r' % (cls.__name__, s))
    xmin, ymin, xmax, ymax = m.groups()
    return cls(float(xmin), float(ymin), float(xmax), float(ymax))

  @classmethod
  def from_tuple(cls, tpl):
    return cls(*tpl)

class TileCoord(object):
  '''瓦片坐标类'''
  def __init__(self, x, y, z):
    self.x = x
    self.y = y
    self.z = z
  def __str__(self):
    return '%d/%d/%d' % (self.z, self.x, self.y)

class Tile(object):
  '''瓦片类'''
  def __init__(self, tilecoord, data=None):
    self.tilecoord = tilecoord
    self.data = data

  def __str__(self):
    return "%d/%d_%d" % (self.tilecoord.z,
      self.tilecoord.x, self.tilecoord.y)

  def is_missing(self):
    if self.tilecoord is None:
        return False
    return self.data is None

class PanoTile(Tile):
  '''瓦片类'''
  def __init__(self, pano_name, face, tilecoord, data=None):
    self.pano_name = pano_name
    if isinstance(face, int):
        self.cubic_surface = face
    else:
        facemap = {"front":0, "back":1, "left":2, "right":3, "up":4, "down":5}
        self.cubic_surface = facemap[face]
    self.tilecoord = tilecoord
    self.data = data

  def __str__(self):
    return "%s/%d/%d/%d_%d" % (self.pano_name, self.cubic_surface, self.tilecoord.z,
      self.tilecoord.x, self.tilecoord.y)

class PanoTileStore(object):
  """tile 存储抽象类"""
  def __init__(self, tile_pyramid=None, content_type=None, **kwargs):
    self.tile_pyramid = tile_pyramid
    self.content_type = content_type
    for key, value in kwargs.iteritems():
        setattr(self, key, value)

  def __contains__(self, tile):
    if tile and self.tile_pyramid:
        return tile.tilecoord in self.tile_pyramid
    else:
        return False

  def __len__(self):
    """store内的所有tile的总数"""
    return reduce(lambda x, _: x + 1, ifilter(None, self.list()), 0)

  def delete(self, tiles):
    """批量删除"""
    return imap(self.delete_tile, ifilter(None, tiles))

  def delete_tile(self, tile):
    """删除tile"""
    raise NotImplementedError

  def get(self, tiles):
    """批量获取"""
    return imap(self.get_tile, ifilter(None, tiles))

  def get_all(self):
    """返回所有tiles"""
    return imap(self.get_tile, ifilter(None, self.list()))

  def get_tile(self, tile):
    """获取tile"""
    raise NotImplementedError

  def list(self):
    """不获取数据内容的tile列表"""
    if self.tile_pyramid:
      for tilecoord in self.tile_pyramid:
        yield Tile(tilecoord)

  def put(self, tiles):
    """批量添加"""
    return imap(self.put_tile, ifilter(None, tiles))

  def put_tile(self, tile):
    """增加"""
    raise NotImplementedError

  def is_cached(self, tile):
    raise NotImplementedError()

  def is_stored(self, pano_name, tile_pyramid):
    for face in ["front", "back", "left", "right", "up", "down"]:
      for tilecoord in tile_pyramid:
        panotile = PanoTile(pano_name, face, tilecoord)
        if not self.is_cached(panotile):
          return False
    return True

  def load_tile_metadata(self, tile):
    raise NotImplementedError()

  @classmethod
  def load(cls, name):
    if name.startswith('file://'):
      return FilesystemPanoTileStore(name[7:])
    if name.startswith('sqlite3:'):
      import sqlite3
      return DatabasePanoTileStore(sqlite3.connect(name[8:]))
    if name.startswith('pg:'):
      import psycopg2
      #dsn parameter:"dbname=test user=postgres password=postgres host=127.0.0.1 port=5432"
      return DatabasePanoTileStore(psycopg2.connect(name[3:]))

class FilesystemPanoTileStore(PanoTileStore):

  def __init__(self, path, **kwargs):
    PanoTileStore.__init__(self, **kwargs)
    self.path = path

  def filename(self, tile):
    return os.path.join(self.path, str(tile)+'.jpg')

  def delete_tile(self, tile):
    filename = self.filename(tile)
    if os.path.exists(filename):
      os.remove(filename)
    return tile

  def get_tile(self, tile):
    filename = self.filename(tile)
    logging.debug("gettile:%s", filename)
    try:
      with open(filename) as file:
        tile.data = file.read()
      return tile
    except IOError as e:
      if e.errno == errno.ENOENT:
        return None
      else:
        raise

  def put_tile(self, tile):
    if tile.data is not None:
      filename = self.filename(tile)
      dirname = os.path.dirname(filename)
      if not os.path.exists(dirname):
        os.makedirs(dirname)
      with open(filename, 'w') as file:
        file.write(tile.data)
        file.close()
      return tile
    return None

  def is_cached(self, tile):
    if tile.is_missing():
      filename = self.filename(tile)
      if os.path.exists(filename):
        return True
      else:
        return False
    else:
      return True

  def load_metadata(self, tile):
    filename = self.filename(tile)
    try:
      stats = os.lstat(filename)
      tile.timestamp = stats.st_mtime
      tile.size = stats.st_size
    except OSError, ex:
      if ex.errno != errno.ENOENT: raise
      tile.timestamp = 0
      tile.size = 0

class DatabasePanoTileStore(PanoTileStore):

  def __init__(self, connection, **kwargs):
    PanoTileStore.__init__(self, **kwargs)
    self.connection = connection
    self.cursor = self.connection.cursor()
    # self.optimize_connection(self.cursor)

  def create_tiles_table(self):
    self.cursor.execute("""
        create table if not exists panorama_panotiledata (
            pano_name character,
            cubic_surface integer,
            zoom_level integer,
            tile_column integer,
            tile_row integer,
            tile_data blob);
            """)
    self.cursor.execute("""
        create unique index if not exists tile_index on panorama_panotiledata
        (pano_name, cubic_surface, zoom_level, tile_column, tile_row);""")

  def optimize_connection(self, cur):
    self.cursor.execute("""PRAGMA synchronous=0""")
    self.cursor.execute("""PRAGMA locking_mode=EXCLUSIVE""")
    self.cursor.execute("""PRAGMA journal_mode=DELETE""")

  def optimize_database(self, cur):
    self.cursor.execute("""ANALYZE;""")
    self.cursor.execute("""VACUUM;""")

  def close_database(self):
    self.cursor.close()
    self.connection.close()

  def get_tile(self, tile):
    tiles = self.cursor.execute(
    """
    select tile_data from panorama_panotiledata where name=%s AND cubic_surface=%d AND zoom_level=%d
    AND tile_column=%d AND tile_row=%d
    """ % (tile.pano_name, tile.cubic_surface, tile.tilecoord.z, tile.tilecoord.x, tile.tilecoord.y)
    )
    tile = tiles[0]

  def put_tile(self, tile):
    tile = self.cursor.execute(
    """
    insert into panorama_panotiledata values (%s, %d, %d, %d, %d, %s)
    """ % (tile.pano_name, tile.cubic_surface, tile.tilecoord.z, tile.tilecoord.x, tile.tilecoord.y, tile.data)
    )

class Bounds(object):

  def __init__(self, start=None, stop=None):
    self.start = start
    if stop is None:
        self.stop = self.start + 1 if start is not None else None
    else:
        assert start is not None
        self.stop = stop

  def __cmp__(self, other):
    return cmp(self.start, other.start) or cmp(self.stop, other.stop)

  def __contains__(self, key):
    if self.start is None:
      return False
    else:
      return self.start <= key < self.stop

  def __len__(self):
    if self.start is None:
      return 0
    else:
      return self.stop - self.start

  def __iter__(self):
    if self.start is not None:
      for i in xrange(self.start, self.stop):
        yield i

  def __repr__(self):
    if self.start is None:
      return '%s(None)' % (self.__class__.__name__,)
    else:
      return '%s(%r, %r)' % (self.__class__.__name__,
                                 self.start, self.stop)

  def add(self, value):
    """扩展bounds包含value"""
    if self.start is None:
      self.start = value
      self.stop = value + 1
    else:
      self.start = min(self.start, value)
      self.stop = max(self.stop, value + 1)
    return self

  def update(self, other):
    """更新"""
    if self.start is None:
      self.start = other.start
      self.stop = other.stop
    else:
      self.start = min(self.start, other.start)
      self.stop = max(self.stop, other.stop)
    return self

  def union(self, other):
    """合并"""
    if self and other:
      return Bounds(min(self.start, other.start),
                    max(self.stop, other.stop))
    elif self:
      return Bounds(self.start, self.stop)
    elif other:
      return Bounds(other.start, other.stop)
    else:
      return Bounds()

class PanoTilePyramid(object):
  '''瓦片金字塔类'''
  def __init__(self, width, height, tile_size=512, tile_overlap=1, tile_format='jpg'):
    self.width = width
    self.height = height
    self.tile_size = tile_size
    self.tile_overlap = tile_overlap
    self.tile_format = tile_format
    max_dimension = max(self.width, self.height)
    max_level = int(math.ceil(math.log(max_dimension, 2)))
    min_level = int(math.floor(math.log(tile_size, 2)))
    self.levels = Bounds(min_level, max_level+1)

  def __contains__(self, tilecoord):
    """判断是否包含tilecoord"""
    if tilecoord.z not in self.levels:
      return False
    w, h = self.get_dimensions(tilecoord.z)
    xbounds = Bounds(0, w)
    ybounds = Bounds(0, h)
    return tilecoord.x in xbounds and tilecoord.y in ybounds

  def __iter__(self):
    """所包含的tilecoord的生成器, 按 z, x, y 的顺序"""
    return self.iter_tilecoords()

  # def __len__(self):
  #     """TileCoords的数量"""
  #     return self.get_num_tiles()

  @classmethod
  def createByTileImageDescriptor(cls, descriptor):
    return cls(descriptor.width, descriptor.height, descriptor.tile_size,
      descriptor.tile_overlap, descriptor.tile_format)

  def get_scale(self, level):
    assert level in self.levels, 'Invalid pyramid level'
    return math.pow(0.5, self.levels.stop - 1 - level)

  def get_dimensions(self, level):
    assert level in self.levels, 'Invalid pyramid level'
    scale = self.get_scale(level)
    width = int(math.ceil(self.width * scale))
    height = int(math.ceil(self.height * scale))
    return (width, height)

  def get_num_tiles(self, level):
    assert level in self.levels, 'Invalid pyramid level'
    w, h = self.get_dimensions( level )
    return (int(math.ceil(float(w) / self.tile_size)), int(math.ceil(float(h) / self.tile_size)))

  def get_tilecoord_bounds(self, tilecoord):
    level = tilecoord.z
    column = tilecoord.x
    row = tilecoord.y
    assert level in self.levels, 'Invalid pyramid level'
    offset_x = 0 if column == 0 else self.tile_overlap
    offset_y = 0 if row == 0 else self.tile_overlap
    x = (column * self.tile_size) - offset_x
    y = (row * self.tile_size) - offset_y
    level_width, level_height = self.get_dimensions(level)
    w = self.tile_size + (1 if column == 0 else 2) * self.tile_overlap
    h = self.tile_size + (1 if row == 0 else 2) * self.tile_overlap
    w = min(w, level_width  - x)
    h = min(h, level_height - y)
    return Extent(x, y, x + w, y + h)

  def iter_tilecoords(self):
    for level in self.levels:
      columns, rows = self.get_num_tiles(level)
      for column in xrange(columns):
        for row in xrange(rows):
          yield TileCoord(column, row, level)

  def iter_level_tilecoords(self, level):
    """Iterator for all tiles in the given level. Returns (column, row) of a tile."""
    columns, rows = self.get_num_tiles(level)
    for column in xrange(columns):
      for row in xrange(rows):
        yield TileCoord(column, row, level)

class TileImageDescriptor(object):
  def __init__(self, width=None, height=None, tile_size=512, tile_overlap=1, tile_format='jpg'):
    self.width = width
    self.height = height
    self.tile_size = tile_size
    self.tile_overlap = tile_overlap
    self.tile_format = tile_format
  def open(self, source):
    pass
  def save(self):
    pass
  def save2file(self, destination):
    pass

class DeepZoomImageDescriptor(TileImageDescriptor):
  NS_DEEPZOOM = 'http://schemas.microsoft.com/deepzoom/2009'

  def open(self, source):
    """Intialize descriptor from an existing descriptor file."""
    doc = xml.dom.minidom.parse(source)
    image = doc.getElementsByTagName('Image')[0]
    size = doc.getElementsByTagName('Size')[0]
    self.width = int(size.getAttribute('Width'))
    self.height = int(size.getAttribute('Height'))
    self.tile_size = int(image.getAttribute('TileSize'))
    self.tile_overlap = int(image.getAttribute('Overlap'))
    self.tile_format = image.getAttribute('Format')

  def save(self):
    doc = xml.dom.minidom.Document()
    image = doc.createElementNS(self.NS_DEEPZOOM, 'Image')
    image.setAttribute('xmnls', self.NS_DEEPZOOM)
    image.setAttribute('TileSize', str(self.tile_size))
    image.setAttribute('Overlap', str(self.tile_overlap))
    image.setAttribute('Format', str(self.tile_format))
    size = doc.createElementNS(self.NS_DEEPZOOM, 'Size')
    size.setAttribute('Width', str(self.width))
    size.setAttribute('Height', str(self.height))
    image.appendChild(size)
    doc.appendChild(image)
    descriptor = doc.toxml(encoding='UTF-8')
    return descriptor

  def save2file(self, destination):
    """Save descriptor file."""
    file = open(destination, 'w')
    descriptor = self.save()
    file.write(descriptor)
    file.close()

class ZoomifyImageDescriptor(TileImageDescriptor):
  pass

class CubicFace(object):
  '''立方体面'''
  def __init__(self, pano_name, face_name, size, option="RGB", bg="white", image=None):
    self.pano_name = pano_name
    self.face_name = face_name
    self.size = size
    if image is None:
      self.image = PIL.Image.new(option, (size, size), bg)
    else:
      self.image = image

  def save2disk(self, path, format='jpeg', quality=0.8):
    if format.lower() == 'jpeg':
      imgfile = os.path.join(path, "%s_%s.jpg" % (self.pano_name, self.face_name))
    else:
      imgfile = os.path.join(path, "%s_%s.%s" % (self.pano_name, self.face_name, format))
    self.image.save(imgfile)
    # self.image.save(imgfile, format, quality=quality)

  @classmethod
  def load_face(cls, pano_name, face_name, img_source):
    image = PIL.Image.open(img_source)
    (width, height) = image.size
    assert width == height, "width not equal height"
    return cls(pano_name, face_name, size=width, image=image)

  def iter_tiles(self, descriptor = None):
    if descriptor is not None:
      tile_pyramid = PanoTilePyramid.createByTileImageDescriptor(descriptor)
    else:
      tile_pyramid = PanoTilePyramid(self.size, self.size)

    for level in tile_pyramid.levels:
      width, height = tile_pyramid.get_dimensions(level)
      if tile_pyramid.width == width and tile_pyramid.height == height:
        image = self.image
      else:
        image = self.image.resize((width, height), PIL.Image.ANTIALIAS)
      for tilecoord in tile_pyramid.iter_level_tilecoords(level):
        extent = tile_pyramid.get_tilecoord_bounds(tilecoord)
        tile_image = image.crop(extent.tuple())
        output = cStringIO.StringIO()
        tile_image.save(output, format='JPEG')
        yield PanoTile(self.pano_name, self.face_name, tilecoord, output.getvalue())

class CubicPano(object):
  '''立方体全景类'''
  def __init__(self, pano_name, xflip = False):
    self.pano_name = pano_name
    self.xflip = xflip
    # self.faces = dict()
    self.faces = []

  def initByEquirect(self, equi_imgfile, overlap = 1, interpolation = ''):
    # equi_img = PIL.Image.open(safe_open(equi_imgfile))
    equi_img = PIL.Image.open(equi_imgfile)
    equi_width, equi_height = equi_img.size
    cubic_size = int(equi_height/math.pi + overlap) * 2
    half_cubic_size = cubic_size/2.
    equi_pixel = equi_img.load()
    cubic_side = (cubic_size, cubic_size)
    side_im = np.zeros(cubic_side, np.uint8)
    face_order = ["back", "front", "right", "left", "up", "down"]
    if self.xflip:
      face_order = ["front", "back", "left", "right", "up", "down"]
    for i in range(6):
    # for i in [4,5]:
      # self.faces[face_order[i]] = CubicFace(cubic_size)
      # cubic_img = self.faces[face_order[i]].data
      face = CubicFace(self.pano_name, face_order[i], cubic_size)
      cubic_img = face.image
      cubic_pixel = cubic_img.load()
      it = np.nditer(side_im, flags=['multi_index'], op_flags=['readwrite'])
      while not it.finished:
        # Axis
        axisA = it.multi_index[0] # row
        axisB = it.multi_index[1] # col
        # for each face we decide what each axis represents, x, y or z
        # x direction back
        # y direction right
        # z direction up
        z = -axisA + half_cubic_size
        if i == 0:
            x = half_cubic_size
            y = -axisB + half_cubic_size
        elif i == 1:
            x = -half_cubic_size
            y = axisB - half_cubic_size
        elif i == 2:
            x = axisB - half_cubic_size
            y = half_cubic_size
        elif i == 3:
            x = -axisB + half_cubic_size
            y = -half_cubic_size
        elif i == 4:
            z = half_cubic_size
            x = -axisA + half_cubic_size
            y =  axisB - half_cubic_size
            if self.xflip:
                x = -x
                y = -y
        elif i == 5:
            z = -half_cubic_size
            x = axisA - half_cubic_size
            y = axisB - half_cubic_size
            if self.xflip:
                x = -x
                y = -y

        # from x,y,z convert to spherical coordinate (lon, lat)
        r = math.sqrt(float(x * x + y * y + z * z))
        radian = Radian(-math.atan2(float(y), x), math.acos(float(z) / r))

        # spherical convert to pixel of the image
        rowcol = radian.rowcol(equi_width, equi_height)

        # interpolation
        if interpolation=="nearest":
          cubic_pixel[axisB, axisA] = nearest(equi_pixel, rowcol.col, rowcol.row, equi_width, equi_height)
        elif interpolation=="bilinear":
          cubic_pixel[axisB, axisA] = bilinear(equi_pixel, rowcol.col, rowcol.row, equi_width, equi_height)
        else:
          cubic_pixel[axisB, axisA] = equi_pixel[rowcol.col, rowcol.row]
        # next pixel
        it.iternext()
      self.faces.append(face)

  def save2disk(self, path, format='jpeg', quality=0.8):
    path = os.path.join(path, str(self.pano_name))
    if not os.path.isdir(path):
      os.makedirs(path)

    for face in self.faces:
      face.save2disk(path, format, quality)


class Position(object):
  '''位置点'''
  def __init__(self, lon, lat, alt):
    self.lon = lon
    self.lat = lat
    self.alt = alt

  def tuple(self):
    return (self.lon, self.lat, self.alt)

  def __str__(self):
    return "%f,%f,%f" % (self.lon, self.lat, self.alt)

  def toString(self):
    return "%f %f %f" % (self.lon, self.lat, self.alt)

  def toString2D(self):
    return "%f %f" % (self.lon, self.lat)

class Attitude(object):
  def __init__(self, x, y, z):
    self.x = x
    self.y = y
    self.z = z

  def tuple(self):
    return (self.x, self.y, self.z)

  def __str__(self):
    return "%f,%f,%f" % (self.x, self.y, self.z)

  def toString(self):
    return "%f %f %f" % (self.x, self.y, self.z)

  def getDirection(self):
    pass


class DotDict(dict):
  def __getattr__(self, key):
    if self.has_key(key):
      return self[key]
    import sys
    import dis
    frame = sys._getframe(1)
    if '\x00%c' % dis.opmap['STORE_ATTR'] in frame.f_code.co_code:
      self[key] = DotDict()
      return self[key]
    print key
    raise AttributeError('Problem here')

  def __setattr__(self, key, value):
    if isinstance(value,dict):
      self[key] = DotDict(value)
    self[key] = value

################################################################################

'''插值函数'''

def lerp(a, b, coord):
  a = np.array(a)
  b = np.array(b)
  ratio = coord - math.floor(coord)
  intvalue = lambda x:int(x)
  npint = np.vectorize(intvalue)
  return tuple(npint(np.round(a * (1.0-ratio) + b * ratio)))

def bilinear(im_pixel, x, y, width, height):
  x1, y1 = int(x), int(y)
  x2, y2 = x1+1, y1+1
  if x2 > width-1:
    x2 = x2 - width
  if y2 > height-1:
    y2 = y2 - height
  left = lerp(im_pixel[x1, y1], im_pixel[x1, y2], y)
  right = lerp(im_pixel[x2, y1], im_pixel[x2, y2], y)
  return lerp(left, right, x)

def nearest(im_pixel, x, y, width, height):
  x1, y1 = int(x), int(y)
  x2, y2 = x1+1, y1+1
  if x2 > width-1:
    x2 = x2 - width
  if y2 > height-1:
    y2 = y2 - height
  x0 = x2 if (x - x1) > (x2 - x) else x1
  y0 = y2 if (y - y1) > (y2 - y) else y1
  return im_pixel[x0, y0]

# retry装饰器
def retry(attempts, backoff=2):
    """Retries a function or method until it returns or
    the number of attempts has been reached."""

    if backoff <= 1:
        raise ValueError('backoff must be greater than 1')

    attempts = int(math.floor(attempts))
    if attempts < 0:
        raise ValueError('attempts must be 0 or greater')

    def deco_retry(f):
        def f_retry(*args, **kwargs):
            last_exception = None
            for _ in xrange(attempts):
                try:
                    return f(*args, **kwargs)
                except Exception as exception:
                    last_exception = exception
                    time.sleep(backoff**(attempts + 1))
            raise last_exception
        return f_retry
    return deco_retry

def _get_or_create_path(path):
    if not os.path.exists(path):
        os.makedirs(path)
    return path

def _clamp(val, min, max):
    if val < min:
        return min
    elif val > max:
        return max
    return val

def _remove(path):
    os.remove(path)
    tiles_path = _get_files_path(path)
    shutil.rmtree(tiles_path)

@retry(6)
def safe_open(path):
    return StringIO.StringIO(urllib.urlopen(path).read())

################################################################################
