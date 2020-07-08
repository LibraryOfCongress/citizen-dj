'use strict';

var Track = (function() {

  function Track(config) {
    var defaults = {
      "id": "k",
      "url": "./audio/drum_machines/Roland_Tr-808_full__36kick.mp3",
      "gain": -6,
      "fadeIn": "128n",
      "fadeOut": "64n",
      "sourceStart": false,
      "buffer": false,
      "clipStart": 0,
      "clipDur": 0,
      "reverb": 0.5,
      "pattern": [1,0,0,0, 0,0,0,0, 1,1,0,1, 0,0,0,0],
      "template": "",
      "$parent": "",
      "pitchShift": 0,
      "trackType": "collection",
      "recordingStreamDestination": false,
      "clipImageUrl": "",
      "phraseDownloadUrl": ""
    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  Track.stringToTrackPatternEdits = function(string){
    var patternEdits = string.split("!");
    patternEdits = _.map(patternEdits, function(p){
      var parts = p.split("_");
      return {
        "index": parseInt(parts[0]),
        "patternEdits": _.map(parts[1].split("-"), function(pp){ return parseInt(pp); })
      }
    });
    return patternEdits;
  }

  Track.trackPatternEditsToString = function(tracks){
    var patternString = "";
    var trackKeys = _.keys(tracks);
    trackKeys.sort();
    // add pattern edits if there are any
    var trackPatternEdits = _.map(trackKeys, function(key, i){
      return {
        "patternEdits": tracks[key].patternEdits ? tracks[key].patternEdits.slice(0) : [],
        "index": i
      };
    });
    trackPatternEdits = _.filter(trackPatternEdits, function(t){ return t.patternEdits.length > 0; });
    if (trackPatternEdits.length > 0) {
      trackPatternEdits = _.map(trackPatternEdits, function(t){ return t.index + "_" + t.patternEdits.join("-")});
      patternString = trackPatternEdits.join("!");
    }
    return patternString;
  }

  Track.prototype.init = function(){
    var _this = this;
    var opt = this.opt;

    this.opt.title = opt.title || opt.url.substring(opt.url.lastIndexOf('/')+1);
    this.opt.clipDur = opt.clipDur || 0;
    this.opt.duration = opt.duration || 0;
    this.opt.uid = _.uniqueId('track');
    this.opt.sourceStartFormatted = '';
    if (this.opt.sourceStart !== false) {
       this.opt.sourceStartFormatted = MathUtil.secondsToString(this.opt.sourceStart + this.opt.clipStart, 3);
    }

    this.loaded = false;
    this.isMuted = false;
    this.isSolo = false;
    this.pattern = this.opt.pattern;
    this.originalPattern = this.pattern.slice(0);
    this.patternEdits = [];
    this.trackType = this.opt.trackType;
    this.recordingStreamDestination = this.opt.recordingStreamDestination;
  };

  Track.prototype.destroy = function(){
    this.loaded = false;
    this.player.dispose();
    this.$el.remove();
  };

  Track.prototype.load = function(){
    this.loadPromise = $.Deferred();
    this.loadPlayer();
    this.loadUI();
    return this.loadPromise;
  };

  Track.prototype.loadPlayer = function(){
    var _this = this;

    if (!this.opt.buffer) {
      console.log('Error: no buffer submitted for '+this.opt.url);
      return;
    }

    // // init player
    // this.reverb = new Tone.Freeverb(this.opt.reverb);
    // this.pitchShift = new Tone.PitchShift(this.opt.pitchShift);
    // this.volume = new Tone.Volume();
    this.playerUrl = this.opt.url;
    // var input = this.opt.buffer !== false ? this.opt.buffer : this.opt.url;
    this.player = new Tone.Player({
      "url": this.opt.buffer,
      "volume": this.opt.gain,
      "fadeIn": this.opt.fadeIn,
      "fadeOut": this.opt.fadeOut
      // "onload": function(){ _this.onPlayerLoad(); }
    });

    if (this.recordingStreamDestination !== false) this.player.connect(this.recordingStreamDestination);
    this.player.toMaster();
    this.onPlayerLoad();
    // }).chain(this.pitchShift, this.reverb, Tone.Master);
  };

  Track.prototype.loadUI = function(){
    var _this = this;
    var $html = $(this.opt.template(this.opt));

    $html.attr('data-track', this.opt.id);
    // highlight beats
    var pattern = this.pattern;
    $html.find('.beat').each(function(i){
      if (pattern[i] > 0) $(this).find('input').prop('checked', true);
    });
    this.opt.$parent.append($html);
    this.$el = $html;
    this.$muteButton = $html.find('.mute-button');
    this.$soloButton = $html.find('.solo-button');

    this.$settingsParent = this.opt.$settingsParent;
    this.$settingsDialog = this.$settingsParent.find('.dialog');

  };

  Track.prototype.mute = function(){
    this.isMuted = true;
    this.$el.addClass('muted');
    this.$muteButton.addClass('active');
  };

  Track.prototype.onChangeClip = function(){
    var left = this.opt.clipStart / this.opt.duration;
    var width = this.opt.clipDur / this.opt.duration;
    var right = 1.0 - Math.max(Math.min(left + width, 1.0), 0.0);

    this.opt.sourceStartFormatted = MathUtil.secondsToString(this.opt.sourceStart + this.opt.clipStart, 3);

    $('.clip-window-left').css('width', (left*100) + '%');
    $('.clip-window-right').css('width', (right*100) + '%');
    $('.track-time-'+this.opt.uid).text(this.opt.sourceStartFormatted);
  };

  Track.prototype.onPlayerLoad = function(){
    console.log("Loaded from buffer", this.playerUrl);
    this.loaded = true;
    var dur = this.player.buffer.duration;
    this.opt.duration = dur;
    if (this.opt.clipDur <= 0) {
      this.opt.clipDur = +dur.toFixed(3);
    }
    this.loadPromise.resolve();
  };

  Track.prototype.play = function(time, i, secondsPerSubd){
    if (!this.loaded || this.isMuted) return;
    if (this.pattern[i] <= 0) return;

    // randomize play time
    var _this = this;
    var randomizeMagnitude = 0.1; // increase to make more random
    var randAmount = randomizeMagnitude * secondsPerSubd;
    var randDelta = Math.random() * randAmount;
    var rtime = time + randDelta;

    // randomize volume
    // Tone.Transport.scheduleOnce(function(){
    //   _this.volume.volume.value = _.random(-6, 0);
    // }, rtime-0.001);
    this.playClip(rtime);

  };

  Track.prototype.playClip = function(time){
    var dur = this.opt.clipDur > 0 ? this.opt.clipDur : "32n";
    // console.log(rtime, this.opt.clipStart, dur)
    if (Math.abs(dur-this.opt.duration) <= 0.001 && this.opt.clipStart === 0) {
      this.player.start(time); // play the full file
    } else {
      dur = Math.min(dur, this.opt.duration-this.opt.clipStart);
      if (dur > 0) {
        this.player.start(time, this.opt.clipStart, dur); // play the clip
      }
    }
  };

  Track.prototype.saveClipToFile = function(onFinished){
    var _this = this;
    var dur = Math.min(this.opt.clipDur, this.opt.duration-this.opt.clipStart);
    if (dur <= 0) dur = 1;
    var offset = this.opt.clipStart;
    // filename_hh-mm-ss.mp3
    var filename = _.last(this.opt.url.split('/'));
    filename = filename.slice(0, -12) + MathUtil.secondsToString(this.opt.sourceStart + this.opt.clipStart, 3).replace(':', '-') + '.wav';
    var playerBuffer = this.opt.buffer;
    console.log('Rendering '+ filename);
    Tone.Offline(function(){
      //only nodes created in this callback will be recorded
      // var oscillator = new Tone.Oscillator().toMaster().start(0);
      var offlinePlayer = new Tone.Player({
        'url': playerBuffer,
        'fadeIn': _this.opt.fadeIn,
        'fadeOut': _this.opt.fadeOut,
      }).toMaster();
      offlinePlayer.start(0, offset, dur);
      //schedule their events
    }, dur).then(function(buffer){
      console.log("Done rendering clip.");
      //do something with the output buffer
      var audioBuffer = buffer.get();
      AudioUtils.audioBufferToWavfile(audioBuffer, filename);
      onFinished && onFinished();
    });
  };

  Track.prototype.setGain = function(db){
    this.player.volume.value = db;
  };

  Track.prototype.setPitchShift = function(pitch){
    if (this.pitchShift) this.pitchShift.pitch = pitch;
  };

  Track.prototype.setReverb = function(roomSize){
    if (this.reverb) this.reverb.roomSize.value = roomSize;
  };

  Track.prototype.showSettings = function(){
    var html = this.opt.settingsTemplate(_.extend({}, this.opt));
    this.$settingsDialog.html(html);
    this.$settingsParent.addClass('active');
    this.$settingsDialog.find('input').first().focus();
    if (this.opt.clipImageUrl.length > 0) {
      this.$settingsDialog.find('.waveform').attr('src', this.opt.clipImageUrl);
    }
    this.onChangeClip();
  };

  Track.prototype.solo = function(){
    this.isSolo = true;
    this.$el.addClass('solo');
    this.$soloButton.addClass('active');
    this.unmute();
  };

  Track.prototype.toggleMute = function(){
    if (this.isMuted) this.unmute();
    else this.mute();
    return this.isMuted;
  };

  Track.prototype.toggleSolo = function(){
    if (this.isSolo) this.unsolo();
    else this.solo();
    return this.isSolo;
  };

  Track.prototype.unmute = function(){
    this.isMuted = false;
    this.$el.removeClass('muted');
    // this.player.mute = false;
    this.$muteButton.removeClass('active');
  };

  Track.prototype.unsolo = function(){
    this.isSolo = false;
    this.$el.removeClass('solo');
    this.$soloButton.removeClass('active');
  };

  Track.prototype.update = function(track){
    var _this = this;

    // extend track options
    this.opt = _.extend(this.opt, track);
    if (this.opt.sourceStart !== false) {
       this.opt.sourceStartFormatted = MathUtil.secondsToString(this.opt.sourceStart + this.opt.clipStart, 3);
    }

    if (track.pattern) {
      this.pattern = track.pattern;
      this.originalPattern = this.pattern.slice(0);
      this.patternEdits = [];
    }

    // reset track UI
    this.$el.remove();
    this.loadUI();

    // load new URL if necessary
    if (track.url && track.url !== this.playerUrl) {
      this.loadPromise = $.Deferred();
      this.loaded = false;
      this.player.dispose();
      this.loadPlayer();
    }

    return this.loadPromise;
  };

  Track.prototype.updatePatternCol = function(col, value) {
    this.pattern[col] = value;

    // keep track of edits
    if (value !== this.originalPattern[col] && this.patternEdits.indexOf(col) < 0) {
      this.patternEdits.push(col);
    } else if (value === this.originalPattern[col]) {
      this.patternEdits = _.without(this.patternEdits, col);
    }
  };

  Track.prototype.updateSetting = function(property, value, $target) {
    // console.log("update", property, value);
    this.opt[property] = value;
    $target.text(value);
    if (property==="clipStart" || property==="clipDur") this.onChangeClip();
    else if (property==="gain") this.setGain(value);
    else if (property==="reverb") this.setReverb(value);
    else if (property==="pitchShift") this.setPitchShift(value);
  };

  return Track;

})();
