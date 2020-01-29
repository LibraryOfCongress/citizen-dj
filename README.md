# Citizen DJ

**This app is currently under major construction; please check back in late 2020**

The Citizen DJ project invites the public to make hip hop music using the Library’s public audio and moving image collections. By embedding these materials in hip hop music, listeners can discover items in the Library's vast collections that they likely would never have known existed.

## Technical Documentation

This document is for people with software development experience who are interested in:

- Extending the functionality of this app for their own use
- Creating their own instance of this app using their own content

There are two parts to this document: (1) the client-facing web app and interface, and (2) the computer scripts required for generating media files (audio files, images) that can be used in the app. These two components are more or less independent, so for example, if you just want to use your own content without changing the functionality, you will only have to make minimal changes to the app.

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

These scripts that are used to generate new assets for use in this app are maintained in a [separate open-source code repository](https://github.com/beefoo/media-tools).

- [Install requirements](https://github.com/beefoo/media-tools#requirements). To complete the full workflow, the core libraries needed are:
    - [Python](https://www.python.org/) 3.6+
    - [SciPy](https://www.scipy.org/) for math functions (probably already installed)
    - [FFmpeg and FFprobe](https://www.ffmpeg.org/) for working with media files; `ffmpeg` and `ffprobe` commands must work
    - [LibROSA](https://librosa.github.io/librosa/) for audio analysis
    - [Pydub](http://pydub.com/) for audio manipulation
    - [scikit-learn](https://scikit-learn.org/stable/) for statistics and machine learning features (e.g. TSNE, clustering, classification)
    - [Multicore-TSNE](https://github.com/DmitryUlyanov/Multicore-TSNE) for faster TSNE
    - [RasterFairy](https://github.com/Quasimondo/RasterFairy) for transforming point cloud to grid (supports Python 2.7 only)
    - [Requests](http://docs.python-requests.org/en/master/) for making remote web requests for scraping metadata
    - [Curl](https://curl.haxx.se/) for binary downloads
- Clone the repository:

   ```
   git clone https://github.com/beefoo/media-tools.git`
   cd media-tools
   ```

The following steps will walkthrough retrieving and processing a specific A/V collection from loc.gov. This process is a sequence of many, many Python scripts. I may automate this in the future, but for now, each step below is to be manually run from the command line.

First, download the search results of [a query](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording):

```
python3 scrapers/loc/download_query.py \
  -query "https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording&fo=json" \
  -out "output/variety-stage/pages/page_%s.json"
```

In this example, we are performing a query to the [LOC API](https://libraryofcongress.github.io/data-exploration/) to get the audio files for the [Variety Stage Sound Recordings and Motion Pictures](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording) collection from loc.gov. Note that these scripts will only work for loc.gov items that have downloadable content (you can check this by looking for a download option on a collection item page). Next we will download metadata for each item in the query results:

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

Then download the media assets for each item (this can take a while for large collections or collections with large media files):

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

Optionally, you can view a "report" about this collection:

```
python3 scrapers/loc/report_metadata.py \
  -in "output/variety-stage/items.csv" \
  -pages "output/variety-stage/pages/page_*.json"
```

Next, break up each file into audio samples. This will likely take a while, especially for large collections:

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

Next, filter out items that have less than 50 samples (this usually removes silent audio files that have intro audio):

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

Optionally, view statistics of the results:

```
python3 stats_histogram.py \
  -in "output/variety-stage/items.csv" \
   -plot "duration,samples,medianPower,medianHz,medianClarity,phrases"

python3 stats_totals.py \
  -in "output/variety-stage/items.csv" \
   -props "duration,samples,phrases"
```

Now we find a subset of 4,096 samples by selecting the phrases that sound the most musical (using the `clarity` feature):

```
python3 phrases_subset.py \
  -in "output/variety-stage/items.csv" \
  -pdir "output/variety-stage/phrasedata/" \
  -sdir "output/variety-stage/sampledata/" \
  -out "output/variety-stage/samples.csv" \
  -sort "clarity=desc" \
  -lim 4096 \
  -limp 8 \
  -lims 57
```

You will need to tweak the last two parameters (`-limp` and `lims`, which limits the number of phrases per file, and number of samples per phrase) based on the collection you are working with. You can do this quickly by running the command with `-probe` which will just report information. In the report, look at the line `Found X valid samples`; `X` should be greater than your target sample count (4096 in this case), but as close to that number as possible. Usually for very large collections, you want the "phrases per file" and "samples per phrase" to be very small.

The following steps now branch based on the specific interface you are building towards.

### For the "Explore" collection interface

The previous step might have resulted in more than 4096 samples, so make sure there are exactly 4096 samples; prioritize samples with a higher musical quality (`clarity`):

```
python3 filter_csv.py \
  -in "output/variety-stage/samples.csv" \
  -sort "clarity=desc" \
  -limit 4096 \
  -out "output/variety-stage/samples_grid.csv"
```

To determine the position (x, y) of each clip, first we need to extract a set of audible features from each clip using [strategies](https://en.wikipedia.org/wiki/Mel-frequency_cepstrum) common in speech recognition software. These set of features are then reduced to just two features using a machine learning algorithm called [t-SNE](https://en.wikipedia.org/wiki/T-distributed_stochastic_neighbor_embedding). This will add two columns (`tsne` and `tsne2`) which will be later used to calculate `x` and `y` respectively. Tweak `-angle` and `-rate` (learning rate) to achieve results that best fit your audio. You can [read more about these parameters here](https://scikit-learn.org/stable/modules/generated/sklearn.manifold.TSNE.html).

```
python3 samples_to_tsne.py \
  -in "output/variety-stage/samples_grid.csv" \
  -dir "output/variety-stage/media/" \
  -components 2 \
  -angle 0.1 \
  -cache "tmp/variety-stage_features.p" \
  -threads 4 \
  -rate 50
```

We're going to repeat the step above to determine the color for each clip, but use 3 dimensions (for RGB) instead of 2. This should be much faster since we cached the features in the previous step. This will add three columns: `color`, `color2`, `color3`

```
python3 samples_to_tsne.py \
  -in "output/variety-stage/samples_grid.csv" \
  -dir "output/variety-stage/media/" \
  -components 3 \
  -prefix "color" \
  -angle 0.1 \
  -cache "tmp/variety-stage_features.p" \
  -threads 4 \
  -rate 50
```

Now we're going to convert the `tsne` and `tsne2` columns into fixed grid positions. This uses the [Raster Fairy library](https://github.com/Quasimondo/RasterFairy) which only supports Python 2, unfortunately, so be sure you run using Python 2.7+.

```
python samples_to_grid.py \
  -in "output/variety-stage/samples_grid.csv" \
  -grid "64x64"
```

Next we will generate visual "fingerprints" for each clip as a visual representation of the audio.

```
python3 samples_to_fingerprints.py \
  -in "output/variety-stage/samples_grid.csv" \
  -dir "output/variety-stage/media/" \
  -out "tmp/variety-stage_fingerprints.p" \
  -log
```

Finally we will add the appropriate assets (images, audio files, data files) to the [Citizen DJ App](https://github.com/LibraryOfCongress/citizen-dj).

```
python3 samples_to_sprite.py \
  -in "output/variety-stage/samples_grid.csv" \
  -dir "output/variety-stage/media/" \
  -id "variety-stage" \
  -outaud "/full/path/to/citizendj/audio/sprites/{uid}/{uid}.mp3" \
  -outdat "/full/path/to/citizendj/data/spritedata/{uid}.json" \
  -outimg "/full/path/to/citizendj/img/sprites/{uid}.png" \
  -fingerprints "tmp/variety-stage_fingerprints.p" \
  -colorful
```

### For the "Remix" collection interface

First, generate individual audio clip files for each sample with a max duration of 1 second.

```
python3 samples_to_files.py \
  -in "output/variety-stage/samples.csv" \
  -dir "output/variety-stage/media/" \
  -out "output/variety-stage/clips/%s.wav" \
  -dout "output/variety-stage/samples_clips.csv" \
  -maxd 1000 \
  -threads 3
```

Normalize audio so that no clip is significantly louder than another.

```
python3 normalize_audio.py \
  -in "output/variety-stage/samples_clips.csv" \
  -dir "output/variety-stage/clips/" \
  -out "output/variety-stage/clips_normalized/" \
  -group "sourceFilename"
```

Convert audio to .mp3 and move to the [Citizen DJ App](https://github.com/LibraryOfCongress/citizen-dj).

```
python3 convert_audio.py \
  -in "output/variety-stage/clips_normalized/*.wav" \
  -out "/full/path/to/citizendj/audio/collections/variety-stage/%s.mp3" \
  -overwrite
```

Generate data for each clip for use in the app:

```
python3 csv_to_json.py \
  -in "output/variety-stage/samples_clips.csv" \
  -props "id,sourceFilename,sourceStart,phrase" \
  -groups "sourceFilename" \
  -out "/full/path/to/citizendj/data/sampledata/variety-stage.json" \
  -light
```

Next we will add some item-level metadata for display in the app. Generate "year" column based on an item's date:

```
python3 meta_to_meta.py \
  -in "output/variety-stage/items.csv" \
  -key "date" \
  -pattern "([12][0-9]{3}).*" \
  -features "year"
```

Create an embed url based on the item url:

```
python3 update_meta.py \
  -in "output/variety-stage/items.csv" \
  -key "url" \
  -rkey "embed_url" \
  -find "(.*)" \
  -repl "\1/?embed=resources"
```

Add item-level metadata to the app:

```
python3 csv_to_json.py \
  -in "output/variety-stage/items.csv" \
  -props "title,filename,year,contributors,subjects,url,embed_url" \
  -out "/full/path/to/citizendj/data/metadata/variety-stage.json" \
  -filter "phrases>0" \
  -lists "contributors,subjects" \
  -light
```

### For the "Use" collection interface (sample packs)

Generate a sample pack.

```
python3 make_sample_pack.py \
  -basedir "output/variety-stage/" \
  -dir "output/variety-stage/media/" \
  -idata "items.csv" \
  -pdata "phrasedata/%s.csv" \
  -sdata "samples.csv" \
  -id "id" \
  -provider "loc.gov" \
  -cid "variety-stage-sound-recordings-and-motion-pictures" \
  -out "output/samplepack_variety-stage/"
```

Move the sample pack and metadata to app.

```
python3 sample_pack_to_json.py \
  -idata "output/variety-stage/items.csv" \
  -bout "/full/path/to/citizendj/" \
  -sdir "output/samplepack_variety-stage/" \
  -id "id" \
  -cid "variety-stage"
```
