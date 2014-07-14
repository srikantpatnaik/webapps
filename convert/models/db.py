# coding: utf8

db = DAL('mysql://srikant:homeauto@localhost/ha_db')

dropdown = ('jpg', 'svg', 'png', 'doc')

db.define_table('converter',
                Field('upload_input_file', 'upload', uploadfolder = request.folder+'uploads', requires=IS_NOT_EMPTY(), autodelete=True),
                Field('convert_to', requires = IS_IN_SET(dropdown), default = dropdown[0]),
               )
