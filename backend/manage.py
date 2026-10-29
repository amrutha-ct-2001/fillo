#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # `runserver` listens on the LAN too, so a phone on the same Wi-Fi can
    # reach it (see mobile/src/api/client.ts). Production runs Gunicorn instead.
    # Port 8001, not Django's 8000, so Fillo never shares a port with another
    # local Django project (the app would silently talk to the wrong server).
    from django.core.management.commands.runserver import Command as RunserverCommand
    RunserverCommand.default_addr = '0.0.0.0'
    RunserverCommand.default_port = '8001'
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
