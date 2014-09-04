#!/usr/bin/env python
# -*- coding: utf8 -*-

from django import template

register = template.Library()

@register.inclusion_tag('panorama/script.html', takes_context=True)
def panorama_script(context, div_name="panorama", width="100%", height="100%"):
    return {
        'div_name': div_name,
        'width': width,
        'height': height,
    }

@register.inclusion_tag('panorama/div.html', takes_context=True)
def panorama_div(context, div_name="panorama", div_class=""):
    return {
        'div_name': div_name,
        'div_class': div_class,
    }
