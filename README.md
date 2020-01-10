# Citizen DJ

**This app is currently under major construction; please check back in late 2020**

The Citizen DJ project invites the public to make hip hop music using the Library’s public audio and moving image collections. By embedding these materials in hip hop music, listeners can discover items in the Library's vast collections that they likely would never have known existed.

## Technical Documentation

This document is for people with software development experience who are interested in:

- Extending the functionality of this app for their own use
- Creating their own instance of this app using their own content

There are two parts to this document: (1) the client-facing web app and interface, and (2) the computer scripts required for generating media files (audio files, images) that can be used in the app. These two components are more or less independent, so for example, if you just want to switch add your own content, you will have to make minimal changes to the app.

### The app

The app is a very simple front-end web application built with Javascript, HTML, and CSS. [Jekyll](https://jekyllrb.com/) is used to manage content and generate the static front-end website. To make changes and run the app locally you will need to install Ruby and Jekyll:

1. [Install Ruby](https://www.ruby-lang.org/en/documentation/installation/) - directions vary depending on your operating system
2. Install bundler and jekyll: `gem install bundler jekyll`
3. Clone this repository: `git clone https://github.com/beefoo/citizendj.git`
4. The audio files are not included in this repository; to download them:
    - Download the zipped audio files here _(coming soon)_
    - Unzip and copy the files to the `./citizendj/` folder
5. To run the app locally, run:

    ```
    cd citizendj
    bundle exec jekyll serve
    ```

6. This generates a folder called `_site/`, which contains the app's static files that can be uploaded to a server
7. Any change you make to the app should automatically be updated in `_site/`
8. Visit [localhost:4000](http://localhost:4000/)

### Processing new content

These scripts are maintained in a [separate open-source code repository](https://github.com/beefoo/media-tools). To set this up:

- [Install requirements](https://github.com/beefoo/media-tools#requirements). To complete the full workflow, you will need:
    - [Python](https://www.python.org/) 3.6+
    - [SciPy](https://www.scipy.org/) for math functions (probably already installed)
    - [FFmpeg and FFprobe](https://www.ffmpeg.org/) for working with media files
    - [LibROSA](https://librosa.github.io/librosa/) for audio analysis
    - [Pydub](http://pydub.com/) for audio manipulation
    - [scikit-learn](https://scikit-learn.org/stable/) for statistics and machine learning features (e.g. TSNE, clustering, classification)
    - [Multicore-TSNE](https://github.com/DmitryUlyanov/Multicore-TSNE) for faster TSNE
    - [RasterFairy](https://github.com/Quasimondo/RasterFairy) for transforming point cloud to grid
    - [Requests](http://docs.python-requests.org/en/master/) for making remote web requests for scraping metadata
    - [Curl](https://curl.haxx.se/) for binary downloads
- Clone the repository:

   ```
   git clone https://github.com/beefoo/media-tools.git`
   cd media-tools
   ```

The following steps will walkthrough retrieving and process a specific A/V collection from loc.gov. This process is a sequence of many Python scripts. I may automate this in the future, but for now, each step below is to be manually run from the command line.

Download the search results of [a query](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording):

```
python3 scrapers/loc/download_query.py \
  -query "https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording&fo=json" \
  -out "output/variety-stage/pages/page_%s.json"
```

In this example, we are performing a query to the [LOC API](https://libraryofcongress.github.io/data-exploration/) get the audio files for the [Variety Stage Sound Recordings and Motion Pictures](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording) collection from loc.gov. Next we will download metadata for each item in the query results:

```
python3 scrapers/loc/download_metadata.py \
  -in "output/variety-stage/pages/page_*.json" \
  -out "output/variety-stage/items/%s.json"
```

And compile the items into a .csv file:

```
python3 scrapers/loc/collect_metadata.py \
  -in "output/variety-stage/items/%s.json" \
  -out "output/variety-stage/items.csv"
```

Then download the media assets for each item:

```
python3 scrapers/loc/download_media.py \
  -in "output/variety-stage/items.csv" \
  -out "output/variety-stage/media/"
```

Now get file features (duration, has video?, has audio?) from each file:

```
python3 get_file_features.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/media/"
```

Break up each file into audio samples:

```
python3 audio_to_samples.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/media/" \
  -out "output/variety-stage/sampledata/" \
  -delta 0.05 \
  -max " -1" \
  -features \
  -overwrite
```

`-delta` is the delta for [onset detection](https://librosa.github.io/librosa/generated/librosa.onset.onset_detect.html); decrease this number for more samples. `-min` and `-max` is minimum and maximum duration in milliseconds (-1 for no limit). `-features` adds another step for analyzing the samples' pitches, volume, and musicality.

Compile sample information about each item and add it to the items .csv file:

```
python3 get_sample_features.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/sampledata/"
```

Optional, view statistics of the results:

```
python3 stats_histogram.py \
  -in "output/variety-stage/items.csv" \
   -plot "duration,samples,medianPower,medianHz,medianClarity,phrases"

python3 stats_totals.py \
  -in "output/variety-stage/items.csv" \
   -props "duration,samples,phrases"
```

Next, filter out items that have less than 50 samples (this sometimes removes silent audio files that have intro audio):

```
python3 filter_csv.py \
  -in "output/variety-stage/items.csv" \
  -filter "samples>50"
```

Next, get item "phrases". This looks for sequences of samples that are likely related.

```
python3 items_to_phrases.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/sampledata/" \
  -out "output/variety-stage/phrasedata/"
```

Add phrase stats to item .csv data:

```
python3 collect_phrases.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/phrasedata/"
```

Now we find a subset of 4,096 samples by selecting the phrases that sound the most musical (using the `clarity` feature):

```
python3 phrases_subset.py \
  -in "output/variety-stage/items.csv" \
  -pdir "output/variety-stage/phrasedata/" \
  -sdir "output/variety-stage/sampledata/" \
  -out "output/variety-stage/items_subset.csv" \
  -sort "clarity=desc" \
  -lim 4096 \
  -limp 8 \
  -lims 57
```

You will need to tweak the last two parameters (`-limp` and `lims`, which limits the number of phrases per file, and number of samples per phrase) based on the collection you are working with. You can do this quickly by running the command with `-probe` which will just report information. In the report, look at the line `Found X valid samples`; `X` should be greater than your target sample count (4096 in this case), but as close to that number as possible.

The following steps now branch based on the specific interface you are building towards

### For the "Explore" collection interface


### For the "Remix" collection interface


### For the "Use" collection interface
