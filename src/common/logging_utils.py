"""
logging_utils.py
-----------------
One place to configure logging so every script prints consistent,
timestamped, leveled output instead of ad-hoc print() calls -- and so
warnings (e.g. "SKU skipped: not enough history") are visibly distinct
from normal progress messages instead of scrolling past unnoticed.
"""

import logging
import sys


def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:  # avoid duplicate handlers if called more than once
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s  %(levelname)-7s  %(name)s: %(message)s", "%H:%M:%S")
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger
