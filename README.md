# Citizen DJ

<i>This project is an experiment and there is no active development and/or maintenance of the codebase. Fork at your own risk! In the unlikely event that there are further updates, the LC Labs team will announce it through our communication channels. Sign up for our listserv on labs.loc.gov, follow us on Twitter @LC_Labs, and watch #CitizenDJ. </i>

The Citizen DJ project invites the public to make hip hop music using the Library’s public audio and moving image collections. By embedding these materials in hip hop music, listeners can discover items in the Library's vast collections that they likely would never have known existed.

[Preview Citizen DJ here](https://citizen-dj.labs.loc.gov/)

## Use cases

This document is for people with software development experience who are interested in:

- Extending the functionality of this app for their own use
- Creating their own instance of this app using their own content


## Creating a new project

**This process is currently under major (re)construction; please email LC-Labs@loc.gov if you intend to use this for your own audio collections, and I will let you know when this is ready.**

1. Fork this repository to your own account via the button on the top-right corner of this repository
2. Clone the new repository to your local environment, e.g.

   ```
   git clone https://github.com/YOUR-USERNAME/citizen-dj.git
   ```

3. To keep up-to-date with the Citizen DJ core codebase, add

   ```
   git remote add upstream https://github.com/LibraryOfCongress/citizen-dj.git
   ```

   Now to check for new changes without automatically merging, you can run:

   ```
   git fetch upstream
   ```

   Now you can selectively merge the changes from the upstream repository. For more information, check out this [guide to syncing forks](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork)

4. Now run the following Python script ***(coming soon)*** that will reset the application to a boilerplate (it will remove the default Library of Congress collections and content)


   ```
   python3 reset_to_boilerplate.py
   ```

## Configuring your new project

***(coming soon)***

## Creating a new collection

For this walkthrough, I will use the following use-case: using this app for your own audio collections. In this case, there's some small tweaks you'll have to do to the app first:

1. Copy the folder `/_sample_app/_collections/` and copy to `/_collections/`.

2. To start, you must create a config markdown file for each of your collections. In this example we'll use the [Variety Stage collection](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/).  A sample config markdown file can be found in the newly created `/collections/` folder. You can leave this as-is for now, but you can rename/edit to fit your own collections; one markdown file per collection.

3. Then run the following command to generate the other necessary pages for the collections in the `/collections/` directory:

   ```
   python3 sync_collections.py -dir "_collections"
   ```

   This will create the necessary collections files in `_explore/`, `_remix/`, and `_use/` directories. Alternatively, you can create these manually. If so, you will need to update the `layout` and `permalink` fields.

## Processing a new collection

The next steps will go through a (long) series of scripts that process audio from loc.gov.

These scripts are maintained in a [separate open-source code repository](https://github.com/beefoo/media-tools). ***I intend to move the relevant scripts into this repository in the near future***

- [Install requirements](https://github.com/beefoo/media-tools#requirements). To complete the full workflow, the core libraries needed are:
    - [Python](https://www.python.org/) (I have developed this using 3.6)
    - [SciPy](https://www.scipy.org/) for math functions (probably already installed)
    - [FFmpeg and FFprobe](https://www.ffmpeg.org/) for working with media files; `ffmpeg` and `ffprobe` commands must work
    - [LibROSA](https://librosa.github.io/librosa/) for audio analysis
    - [Pydub](http://pydub.com/) for audio manipulation
    - [scikit-learn](https://scikit-learn.org/stable/) for statistics and machine learning features (e.g. TSNE, clustering, classification)
    - [Multicore-TSNE](https://github.com/DmitryUlyanov/Multicore-TSNE) for faster TSNE
    - [RasterFairy](https://github.com/pechyonkin/RasterFairy-Py3) for transforming point cloud to grid
    - [Requests](http://docs.python-requests.org/en/master/) for making remote web requests for scraping metadata
    - [Curl](https://curl.haxx.se/) for binary downloads
- Clone the repository:

   ```
   git clone https://github.com/beefoo/media-tools.git
   cd media-tools
   ```

The following steps will walkthrough retrieving and processing a specific A/V collection from loc.gov. This process is a sequence of many, many Python scripts. I may automate this in the future, but for now, each step below is to be manually run from the command line. For possible convenience, I have a [commands template](https://github.com/beefoo/media-tools/blob/master/projects/citizen_dj/templates/citizen_dj_commands_template.txt) that can be populated with your own path information using this script like so:

```
python3 template_to_string.py \
  -in "projects/citizen_dj/citizen_dj_commands_template.txt" \
  -query "collection_uid=variety-stage&collection_id=variety-stage-sound-recordings-and-motion-pictures&data_base_dir=output/variety-stage/&media_dir=output/variety-stage/media/&app_dir=/full/path/to/citizen-dj/" \
  -out "output/my_custom_commands.txt"
```

Now you have a text file with a bunch of commands that you can run individually or paste multiple lines in your terminal (for Mac) or you can replace newlines with " && " in Windows to run multiple commands sequentially. However, I recommend running each script individually when you first start to get a sense of what they do. Some script parameters require some tweaks for best results.

### I. Retrieving data and assets from loc.gov

This example will retrieve data and media from loc.gov. The result will be a spreadsheet of item records (`item.csv`) and a folder of media files. You can skip this section if you have your own data/media, but you'll need to generate a .csv file for your data/files with the following columns:

```
id: a unique identifier
url: a url to the source's item record (for linking to in the app)
filename: the name of the file that has been downloaded (not the full path, just the basename, e.g. myfile.mp3)
title: title for displaying in app
contributors: name of contributors for displaying in app (pipe | separated | list)
date: date for displaying in app
subjects: subjects/tags for displaying in app (pipe | separated | list)
```

Otherwise, first download the search results of [a loc.gov query](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording):

```
python3 ingesters/loc/download_query.py \
  -query "https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording&fo=json" \
  -out "output/variety-stage/pages/page_%s.json"
```

In this example, we are performing a query to the [LOC API](https://libraryofcongress.github.io/data-exploration/) to get the audio files for the [Variety Stage Sound Recordings and Motion Pictures](https://www.loc.gov/collections/variety-stage-sound-recordings-and-motion-pictures/?fa=original-format:sound+recording) collection from loc.gov. Note that these scripts will only work for loc.gov items that have downloadable content (you can check this by looking for a download option on a collection item page). Next we will download metadata for each item in the query results:

```
python3 ingesters/loc/download_metadata.py \
  -in "output/variety-stage/pages/page_*.json" \
  -out "output/variety-stage/items/%s.json"
```

And compile the items into a .csv file:

```
python3 ingesters/loc/collect_metadata.py \
  -in "output/variety-stage/items/*.json" \
  -out "output/variety-stage/items.csv"
```

Then download the media assets for each item (this can take a while for large collections or collections with large media files):

```
python3 ingesters/loc/download_media.py \
  -in "output/variety-stage/items.csv" \
  -out "output/variety-stage/media/"
```

### II. Audio/video feature extraction

Now get file features (duration, has video?, has audio?) from each file:

```
python3 get_file_features.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/media/"
```

Optionally, you can view a "report" about this collection:

```
python3 ingesters/loc/report_metadata.py \
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

`-delta` is the delta for [onset detection](https://librosa.github.io/librosa/generated/librosa.onset.onset_detect.html); decrease this number for more samples. `-min` and `-max` is minimum and maximum duration in milliseconds (-1 for no limit). `-features` adds another step for analyzing the samples' pitches, volume, and musicality which will be necessary for the next steps.

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

Next, get item "phrases". This looks for sequences of samples that are likely related, e.g. within the same scene in a film.

```
python3 items_to_phrases.py \
  -in "output/variety-stage/items.csv" \
  -dir "output/variety-stage/sampledata/" \
  -out "output/variety-stage/phrasedata/"
```

If you're not getting enough phrases, you can lower the threshold for minimum clarity of phrases by adding `-params "minc=24.0"`; the lower the number, the more phrases you will get. The default is 30. Also run `python3 samples_to_phrases.py -h` for more parameters to tweak.

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

Now we find a subset of 4,096 samples (for a 64 x 64 grid) by selecting the phrases that sound the most musical (using the `clarity` feature):

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

You will need to tweak the last two parameters (`-limp` and `lims`, which limits the number of phrases per file, and number of samples per phrase) based on the collection you are working with. You can do this quickly by running the command with `-probe` which will just report information. In the report, look at the line `Found X valid samples`; `X` should be greater than your target sample count (4096 in this case), but as close to that number as possible, e.g. around 4100. Usually for very large collections, you want the "phrases per file" and "samples per phrase" to be very small.

## III. Prepping assets for the app

The following steps now branch based on the specific interface you are building towards.

### A. For the "Explore" collection interface

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

Now we're going to convert the `tsne` and `tsne2` columns into fixed grid positions. This uses the [Raster Fairy library](https://github.com/pechyonkin/RasterFairy-Py3).

```
python3 samples_to_grid.py \
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

Finally we will move the appropriate assets (images, audio files, data files) to the [Citizen DJ App](https://github.com/LibraryOfCongress/citizen-dj).

```
python3 samples_to_sprite.py \
  -in "output/variety-stage/samples_grid.csv" \
  -dir "output/variety-stage/media/" \
  -id "variety-stage" \
  -outaud "/full/path/to/citizen-dj/audio/sprites/{uid}/{uid}.mp3" \
  -outdat "/full/path/to/citizen-dj/data/spritedata/{uid}.json" \
  -outimg "/full/path/to/citizen-dj/img/sprites/{uid}.png" \
  -fingerprints "tmp/variety-stage_fingerprints.p" \
  -colorful
```

### B. For the "Remix" collection interface

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
  -out "/full/path/to/citizen-dj/audio/collections/variety-stage/%s.mp3" \
  -overwrite
```

Generate data for each clip for use in the app:

```
python3 csv_to_json.py \
  -in "output/variety-stage/samples_clips.csv" \
  -props "id,sourceFilename,sourceStart,phrase" \
  -groups "sourceFilename" \
  -out "/full/path/to/citizen-dj/data/sampledata/variety-stage.json" \
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
  -out "/full/path/to/citizen-dj/data/metadata/variety-stage.json" \
  -filter "phrases>0" \
  -lists "contributors,subjects" \
  -light
```

### C. For the "Use" collection interface (sample packs)

Generate a sample pack.

```
python3 make_sample_pack.py \
  -basedir "output/variety-stage/" \
  -dir "output/variety-stage/media/" \
  -cdata "/full/path/to/citizen-dj/_use/variety_stage.md"
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
  -bout "/full/path/to/citizen-dj/" \
  -sdir "output/samplepack_variety-stage/" \
  -id "id" \
  -cid "variety-stage"
```

Now you have all the necessary assets in the `citizen-dj` app. You can return to the `citizen-dj` app directory and run the app:

```
bundle exec jekyll serve
```

This will generate a static website with your new collection in the `_site` folder which you can view at `localhost:4000`

## Customizing the content and style

This is more or less a basic [Jekyll](https://jekyllrb.com/) static website, so you can refer to the Jekyll documentation for how the content is organized. Some key areas of note:

1. You need to update [_config.yml](https://github.com/LibraryOfCongress/citizen-dj/blob/master/_config.yml) with your own settings
2. The different types of page layouts can be found in [_layouts/](https://github.com/LibraryOfCongress/citizen-dj/tree/master/_layouts) which have their associated stylesheet in [css/](https://github.com/LibraryOfCongress/citizen-dj/tree/master/css) and javascript files in [js/](https://github.com/LibraryOfCongress/citizen-dj/tree/master/js)
3. Each collection has three discrete interfaces: "explore", "remix", and "use".  So each collection has one page per app found in `_explore/`, `_remix/`, and `_use/` respectively. The next section covers how to add a new collection
