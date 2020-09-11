# -*- coding: utf-8 -*-

import argparse
import glob
import os
from pprint import pprint
import sys

# input
parser = argparse.ArgumentParser()
parser.add_argument("-dir", dest="REFERENCE_DIR", default="_collections", help="Directory of collections to use as reference")
parser.add_argument("-sync", dest="SYNC_TO", default="use,remix,explore", help="Directories to sync to")
a = parser.parse_args()

files = glob.glob(a.REFERENCE_DIR+"/*.md")
syncDirs = [{"name": name, "dir": "_"+name+"/"} for name in a.SYNC_TO.strip().split(",")]

# remove existing files
for d in syncDirs:
    dir = d["dir"]
    removeFiles = glob.glob(dir+"*.md")
    for rfn in removeFiles:
        os.remove(rfn)

# make sure directories exist
for d in syncDirs:
    dir = d["dir"]
    dirname = os.path.dirname(dir)
    if not os.path.exists(dirname):
        os.makedirs(dirname)

for fn in files:
    contents = ""
    with open(fn, "r", encoding="utf8", errors="replace") as f:
        contents = f.read()

    if len(contents) < 1:
        print("No contents for %s" % fn)
        continue

    basename = os.path.basename(fn)
    uid = basename[:-3]
    findStrings = [
        "/"+uid+"/layout/",
        "layout: layout"
    ]
    for d in syncDirs:
        syncFn = d["dir"] + basename
        replaceStrings = [
            "/"+uid+"/"+d["name"]+"/",
            "layout: "+d["name"]
        ]
        syncContents = contents
        for findString, replaceString in zip(findStrings, replaceStrings):
            syncContents = syncContents.replace(findString, replaceString)
        with open(syncFn, "w", encoding="utf8") as f:
            f.write(syncContents)
            print("Wrote to %s" % syncFn)

print("Done.")
