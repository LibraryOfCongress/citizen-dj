---
layout: page
uid: process
title: From audio collection to sample pack
permalink: "/process/"
---

# From audio collection to sample pack

This document outlines my technical process for analyzing and processing large audio collections. The result of this process is all of the audio samples that you see on the Citizen DJ website.

## Step 1: analysis

A single audio collection can range from dozens to thousands of items, often representing hundreds of hours of audio. The goal of this step is to automatically extract information from the audio data contained in the audio files themselves.

In this example, I will be using the collection [Inventing Entertainment: The Early Motion Pictures and Sound Recordings of the Edison Companies](https://www.loc.gov/collections/edison-company-motion-pictures-and-sound-recordings/about-this-collection/) from the Library of Congress. This is a relatively manageable collection of 85 items that contain audio (the remainder are hundreds of silent films). This process also works with much larger collections (say, thousands of items), but this smaller collection will be easier to visualize in the context of this documentation.

### Chopping up the audio

The first thing I do is break up all the audio into individual samples. I do this using [onset detection](https://librosa.org/doc/latest/generated/librosa.onset.onset_detect.html), which identifies the beginnings of "peaks" in audio strength within the audio. If the underlying audio is spoken word, this is roughly equivalent to identifying individual "vocal pulses" or syllables. If this underlying audio is music, this is roughly equivalent to identifying individual musical notes.

Here is an example of an excerpt of from [Santa Claus hides in your phonograph](https://www.loc.gov/item/00694071/) start at MM:SS. The vertical lines indicate the onset of a new sample:

Then I simply slice the audio at each onset to create the individual samples, which will be analyzed in the next step.

### Feature extraction

For each sample that was created, I extract a number of features from them. I use these features to help me automatically select the best candidates for music-making, which I cover in Step 2.

1. The overall **strength** of the audio, approximated by computing the average [root-mean-square (RMS)](https://librosa.org/doc/latest/generated/librosa.feature.rms.html) of each frame in the audio sample
2. The approximate **pitch** of the audio sample by analyzing the audio's harmonic data (more details below)
3. The overall **spectral contrast** of the harmonic data, which I like to think of as how "clear" the pitch is, effectively distinguishing clear tones (e.g. music, singing) with noisy ones (e.g. percussion, static); more details below

This is the spectrogram of two different audio samples from [Santa Claus hides in your phonograph](https://www.loc.gov/item/00694071/). The challenge here is to approximate the pitch of each sample and how clear they are.

## Step 2: selection

So in the case of the Inventing Entertainment collection, I've created and analyzed XXXX samples. Now I want to identify a subset (in my case, 4,096) of those samples that I think would work well as music samples. **The selection criteria is subjective.** I will outline my selection criteria, but these can be very easily tweaked for your own needs.

Here is my selection criteria:

1. I want to remove items that are likely silent but may contain audio artifacts unrelated to the content
2. I prefer sounds that are sufficiently strong
3. I prefer sounds that have a clear musical pitch
4. For diversity, I would like to ensure certain number of samples from each item
5. To preserve context (e.g. speeches, musical phrases), I would like to select groups of consecutive samples

## Step 3: visualization

Once I select my subset of samples, I want to display them in one large grid to allow users to quickly browse the samples. I want the grid to be organized in a way so similar-sounding samples are closer to each other in the grid. In the same way, I want to assign color to reinforce sonic similarity.
