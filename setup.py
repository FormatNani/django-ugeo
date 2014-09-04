#!/usr/bin/env python
# -*- coding: utf-8 -*-

import codecs

from setuptools import setup, find_packages

import ugeo

long_description = codecs.open('README.md', "r", "utf-8").read()

with open('requirements.pip') as reqs:
    install_requires = [
        line for line in reqs.read().split('\n') if (line and not
                                                     line.startswith(('--', 'git')))
    ]

METADATA = dict(
    name='ugeo',
    version='1.0-dev',
    author='sw897',
    author_email='sunwei.r@gmail.com',
    description='many geo',
    long_description=long_description,
    url='http://github.com/sw897/django-ugeo',
    keywords='gis map panorama python django',
    install_requires= install_requires,
    include_package_data=True,
    packages=find_packages(),
    scripts=[],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Environment :: Web Environment',
        'Topic :: Internet',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Framework :: Django',
    ],
)

if __name__ == '__main__':
    setup(**METADATA)
