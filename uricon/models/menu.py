# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## Customize your APP title, subtitle and menus here
#########################################################################

response.logo = A(B(SPAN(''),'uricon'),#XML('&trade;&nbsp;'),
                  _class="brand",_href="http://uricon.in/")
response.title = request.application.replace('_',' ').title()
response.subtitle = ''

## read more at http://dev.w3.org/html5/markup/meta.name.html
response.meta.author = 'Srikant Patnaik <srikant@uricon.in>'
response.meta.keywords = 'uricon, consultancy, training, certificates'
response.meta.generator = 'uricon services'

## your http://google.com/analytics id
response.google_analytics_id = None

#########################################################################
## this is the main application menu add/remove items as required
#########################################################################

response.menu = [
    (T('Home'), False, URL('default', 'index'), []),

    (SPAN('Training', _class='highlighted'), False, None,
         [
          (T('Embedded'), False, None,
              [
              (T('Embedded Linux'), False, URL('training','embeddedlinux')),
              (T('Advanced Android'), False, URL('training', 'android')),
              (T('Microcontrollers'), False, URL('training', 'microcontrollers')),
              ]
          ),
          (T('Software'), False, None,
              [
              (T('Web Frameworks'), False, URL('training', 'webframeworks')),
              (T('Advanced Linux'), False, URL('training', 'advancedlinux')),
              (T('Version control'), False, URL('training', 'versioncontrol')),
              (T('Documentation'), False, URL('training', 'documentation')),
              ]
          ),
          (T('GNU/Linux'), False, URL('training', 'linux')),
         ]
    ),

    (SPAN('Development', _class='highlighted'), False, None,
         [
          (T('Embedded'), False, None,
              [
              (T('Embedded Linux Development'), False, URL('development', 'elprojects')),
              #(T('Android Internals'), False, URL('default', 'index')),
              (T('Microcontrollers Projects'), False, URL('development', 'ucprojects')),
              ]
          ),
          (T('Software'), False, None,
              [
              (T('Kernel Challenges'), False, URL('development', 'kernelprojects')),
              (T('Web Applications'), False, URL('development', 'webdevprojects')),
              #(T('Version control'), False, URL('default', 'index')),
              #(T('Documentation'), False, URL('default', 'index')),
              ]
          ),
          #(T('Linux'), False, URL('default', 'index')),
         ]
    ),


    (SPAN('Consultancy', _class='highlighted'), False, None,
         [
          (T('Emedded Linux'), False, URL('consultancy', 'elinuxcon')),
          (T('Software'), False, URL('consultancy', 'softwarecon')),
          (T('Linux Migration'), False, URL('consultancy', 'linuxcon')),
          (T('Hardware Design'), False, URL('consultancy', 'hardwarecon')),
         ]
    ),

    (T('Contact Us'), False, URL('default', 'contact'), [])
]
