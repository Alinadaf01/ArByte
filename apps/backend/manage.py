#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Windows' default console codepage (cp1256/cp1252) can't encode Persian
    # text — any self.stdout.write()/print() with Persian content (seed
    # command output, createsuperuser prompts, ...) raises UnicodeEncodeError
    # and crashes the process, silently rolling back any @transaction.atomic
    # command mid-way. Forcing UTF-8 on stdout/stderr here (not just in one
    # script) fixes it for every manage.py invocation.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
