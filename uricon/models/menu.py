# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## Customize your APP title, subtitle and menus here
#########################################################################

response.logo = A(B(SPAN(''),'uricon'),XML('&trade;&nbsp;'),
                  _class="brand",_href="http://uricon.in/")
response.title = request.application.replace('_',' ').title()
response.subtitle = ''

## read more at http://dev.w3.org/html5/markup/meta.name.html
response.meta.author = 'Srikant Patnaik <srikant@uricon.in>'
response.meta.keywords = 'uricon, consultancy, training, certificates'
response.meta.generator = 'Web2py Web Framework'

## your http://google.com/analytics id
response.google_analytics_id = None

#########################################################################
## this is the main application menu add/remove items as required
#########################################################################

response.menu = [
    (T('Home'), False, URL('default', 'index'), []),

    (SPAN('Training', _class='highlighted'), False, None,
         [(T('My Sites'), False, URL('default', 'index'),
              [(T('My Sites'), False, URL('default', 'index')),]),
          (T('My Sites'), False, URL('default', 'index')),]),

    (SPAN('Research', _class='highlighted'), False, None,
         [(T('My Sites'), False, URL('default', 'index'),
              [(T('My Sites'), False, URL('default', 'index')),]),
          (T('My Sites'), False, URL('default', 'index')),]),

    (SPAN('Consultancy', _class='highlighted'), False, URL('default', 'index'),
         [(T('My Sites'), False, URL('admin', 'default', 'site')),
          (T('My Sites'), False, URL('admin', 'default', 'site'))]),

    (T('Contact Us'), False, URL('default', 'index'), [])
]
