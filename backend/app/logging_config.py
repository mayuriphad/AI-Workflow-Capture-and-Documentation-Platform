"""Configures structured logging for the whole app, called once at startup."""
import logging
import sys


def configure_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        return  # already configured (e.g. reload)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s", datefmt="%H:%M:%S"))
    root.addHandler(handler)
    root.setLevel(logging.INFO)
