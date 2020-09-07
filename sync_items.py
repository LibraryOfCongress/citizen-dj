# -*- coding: utf-8 -*-

import argparse
import glob
import os
from pprint import pprint
import shutil
import sys

# input
parser = argparse.ArgumentParser()
parser.add_argument("-dir", dest="REFERENCE_DIR", default="_loc_items", help="Directory of items to sync")
parser.add_argument("-sync", dest="SYNC_TO", default="_items", help="Directories to sync to")
a = parser.parse_args()

files = glob.glob(a.REFERENCE_DIR+"/*/*.md")

# remove existing files
removeFiles = glob.glob(a.SYNC_TO+"/*/*.md")
for rfn in removeFiles:
    os.remove(rfn)

for fn in files:
    src = fn
    dst = fn.replace(a.REFERENCE_DIR, a.SYNC_TO, 1)
    dirname = os.path.dirname(dst)
    if not os.path.exists(dirname):
        os.makedirs(dirname)
    shutil.copyfile(src, dst)

print("Done.")
