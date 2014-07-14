from gluon.storage import Storage
settings = Storage()

settings.migrate = True
settings.title = 'Convert filetypes online'
settings.subtitle = 'Free online document converter'
settings.author = 'Srikant Patnaik'
settings.author_email = 'srikant@srikantpatnaik.org'
settings.keywords = 'pdf converter, doc to pdf, pdf to doc, jpg to png'
settings.description = "Convert any document online using free software. It works with 'convert' GNU/Linux package. "
settings.layout_theme = 'Default'
settings.database_uri = 'sqlite://storage.sqlite'
settings.security_key = '624054d0-3060-415d-b622-452fb919d9e9'
settings.email_server = 'localhost'
settings.email_sender = 'you@example.com'
settings.email_login = ''
settings.login_method = 'local'
settings.login_config = ''
settings.plugins = []
