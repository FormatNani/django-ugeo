"mix many geo project."
VERSION = (1, 0, 0)

__author__ = 'mapdb'
__contact__ = "mapdb2014@gmail.com"
__homepage__ = "https://github.com/sw897/django-ugeo"
__version__ = ".".join(map(str, VERSION))

from django.core import signals
from django.db import close_connection

# 取消信号关联，实现数据库长连接
signals.request_finished.disconnect(close_connection)
