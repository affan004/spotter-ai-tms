import os
import sys

# Ensure backend directory is in Python path for Django
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(root_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tms_core.settings')

# Initialize Django WSGI application
from django.core.wsgi import get_wsgi_application
app = get_wsgi_application()
handler = app

