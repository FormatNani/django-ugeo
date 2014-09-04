# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'PanoPointData'
        db.create_table(u'panorama_panopointdata', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=32)),
            ('file_type', self.gf('django.db.models.fields.CharField')(default='JPG', max_length=8)),
            ('ca_type', self.gf('django.db.models.fields.IntegerField')(default=19)),
            ('ca_subtype', self.gf('django.db.models.fields.IntegerField')(default=0)),
            ('seq_id', self.gf('django.db.models.fields.IntegerField')()),
            ('timestamp', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('GPS_time_s', self.gf('django.db.models.fields.IntegerField')()),
            ('GPS_time_u', self.gf('django.db.models.fields.IntegerField')()),
            ('geom', self.gf('django.contrib.gis.db.models.fields.PointField')()),
            ('altitude', self.gf('django.db.models.fields.DecimalField')(max_digits=6, decimal_places=2)),
            ('attitude_x', self.gf('django.db.models.fields.DecimalField')(max_digits=6, decimal_places=2)),
            ('attitude_y', self.gf('django.db.models.fields.DecimalField')(max_digits=6, decimal_places=2)),
            ('attitude_z', self.gf('django.db.models.fields.DecimalField')(max_digits=6, decimal_places=2)),
            ('trigger_id', self.gf('django.db.models.fields.IntegerField')()),
            ('frame_id', self.gf('django.db.models.fields.IntegerField')(default=0)),
        ))
        db.send_create_signal(u'panorama', ['PanoPointData'])

        # Adding model 'PanoLineData'
        db.create_table(u'panorama_panolinedata', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=32)),
            ('geom', self.gf('django.contrib.gis.db.models.fields.LineStringField')()),
            ('start', self.gf('django.db.models.fields.CharField')(max_length=32)),
            ('end', self.gf('django.db.models.fields.CharField')(max_length=32)),
        ))
        db.send_create_signal(u'panorama', ['PanoLineData'])


    def backwards(self, orm):
        # Deleting model 'PanoPointData'
        db.delete_table(u'panorama_panopointdata')

        # Deleting model 'PanoLineData'
        db.delete_table(u'panorama_panolinedata')


    models = {
        u'panorama.panolinedata': {
            'Meta': {'object_name': 'PanoLineData'},
            'end': ('django.db.models.fields.CharField', [], {'max_length': '32'}),
            'geom': ('django.contrib.gis.db.models.fields.LineStringField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '32'}),
            'start': ('django.db.models.fields.CharField', [], {'max_length': '32'})
        },
        u'panorama.panopointdata': {
            'GPS_time_s': ('django.db.models.fields.IntegerField', [], {}),
            'GPS_time_u': ('django.db.models.fields.IntegerField', [], {}),
            'Meta': {'object_name': 'PanoPointData'},
            'altitude': ('django.db.models.fields.DecimalField', [], {'max_digits': '6', 'decimal_places': '2'}),
            'attitude_x': ('django.db.models.fields.DecimalField', [], {'max_digits': '6', 'decimal_places': '2'}),
            'attitude_y': ('django.db.models.fields.DecimalField', [], {'max_digits': '6', 'decimal_places': '2'}),
            'attitude_z': ('django.db.models.fields.DecimalField', [], {'max_digits': '6', 'decimal_places': '2'}),
            'ca_subtype': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'ca_type': ('django.db.models.fields.IntegerField', [], {'default': '19'}),
            'file_type': ('django.db.models.fields.CharField', [], {'default': "'JPG'", 'max_length': '8'}),
            'frame_id': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'geom': ('django.contrib.gis.db.models.fields.PointField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '32'}),
            'seq_id': ('django.db.models.fields.IntegerField', [], {}),
            'timestamp': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'trigger_id': ('django.db.models.fields.IntegerField', [], {})
        }
    }

    complete_apps = ['panorama']