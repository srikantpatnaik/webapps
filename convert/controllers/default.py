# -*- coding: utf-8 -*-
import os
import re
from subprocess import check_output, PIPE, CalledProcessError, STDOUT
from contenttype import contenttype
from time import sleep

def index():
    form = SQLFORM(db.converter)
    if form.validate():
        path_src_dest = request.folder + 'uploads/'
        dest_ext = '.' + form.vars.convert_to
        source_uuid_name = form.vars.upload_input_file
        dest_uuid_name   = form.vars.upload_input_file + '.' + form.vars.convert_to
        try:
            process = check_output('convert {0} {0}{1}' 
                                   .format(path_src_dest + source_uuid_name, dest_ext),
                                   shell=True, stderr=STDOUT)
        except CalledProcessError:
            response.flash = "couldn't process file, internal error"
        items = re.compile('(?P<table>.*?)\.(?P<field>.*?)\..*').match(source_uuid_name)
        (t, f) = (items.group('table'), items.group('field'))
        field = db[t][f]
        (source_orig_name, stream) = field.retrieve(source_uuid_name,nameonly=True)
        print source_orig_name, dest_uuid_name
        print '**', path_src_dest + dest_uuid_name
        if os.path.isfile(path_src_dest + dest_uuid_name):
            os.rename(path_src_dest + dest_uuid_name,
                      path_src_dest + source_orig_name[:source_orig_name.rfind('.')] + dest_ext)
            dest_name = source_orig_name[:source_orig_name.rfind('.')] + dest_ext
            renamed_file_path=os.path.join(path_src_dest, dest_name)
            print dest_name
            #response.headers['ContentType'] ="image/jpeg";
            response.headers['ContentType'] =contenttype(dest_name);
            print contenttype(dest_name)
            response.headers['Content-Disposition']="attachment; filename=" +dest_name
            return response.stream(open(renamed_file_path),chunk_size=4096)
    return dict(form=form)
