# coding: utf8

db = DAL('mysql://srikant:homeauto@localhost/ha_db')

dropdown = ('jpg', 'pdf', 'png', 'doc')
possible_extensions = ('jpg', 'pdf', 'png', 'doc')

db.define_table('converter',
                Field('convert_from', requires = IS_IN_SET(dropdown), default = dropdown[0]),
                Field('convert_to',   requires = IS_IN_SET(dropdown), default = dropdown[0]),
                Field('upload_input_file', 'upload', uploadfolder = request.folder+'uploads',
                       requires = IS_UPLOAD_FILENAME(extension='png'), autodelete=True),
               )
