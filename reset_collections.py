# -*- coding: utf-8 -*-

import argparse
import glob
import os
from pprint import pprint
import sys

# input
parser = argparse.ArgumentParser()
parser.add_argument("-dirs", dest="DIRS_TO_EMPTY", default="_data/*.json,_explore/*.md,_items/**/*.md,_remix/*.md,_use/*.md,_collections/*.md,data/metadata/*.json,data/sampledata/*.json,data/phrasedata/*.json,data/spritedata/*.json,img/sprites/*.png,img/thumbnails/*.png,img/samplepacks/**/*.png", help="Directories to clear")
a = parser.parse_args()

for dir in a.DIRS_TO_EMPTY.strip().split(","):
    removeFiles = glob.glob(dir)
    for rfn in removeFiles:
        os.remove(rfn)
print("Done.")
