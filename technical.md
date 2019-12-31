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
5. To run the app locally, run: `bundle exec jekyll serve`, then visit [localhost:4000](http://localhost:4000/)
6. This generates a folder called `_site/`, which contains the app's static files that can be uploaded to a server
7. Any change you make to the app should automatically be updated in `_site/`

### Processing new content
