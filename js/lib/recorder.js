'use strict';

var AudioRecorder = (function() {

  function AudioRecorder(config) {
    var defaults = {};
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  AudioRecorder.prototype.init = function(){
    this.audioContext = Tone.context;
    this.$recordButtons = $('.record-audio');
    this.isSaving = false;
    this.destination = this.opt.destination;

    this.loadListeners();
  };

  AudioRecorder.prototype.exportWavData = function(blob){
    var urlLib = (window.URL || window.webkitURL);
    var url = urlLib.createObjectURL(blob);
    var $a = $('<a>');
    $a.attr('href', url);
    $a.attr('download', 'output.wav');
    // $a.css('display', 'none');
    $('body').append($a);

    $a[0].click();

    urlLib.revokeObjectURL(url);
  };

  AudioRecorder.prototype.loadListeners = function(){
    var _this = this;

    this.$recordButtons.on('click', function(e){
      if (!_this.isSaving) _this.onRecordAudio($(this));
    });
  };

  AudioRecorder.prototype.onRecordAudio = function($el){
    var isActive = $el.hasClass('active');

    if (isActive) this.recordStop();
    else this.recordStart();
  };

  AudioRecorder.prototype.recordStart = function(){
    this.$recordButtons.addClass('active');
    this.$recordButtons.text('Stop recording');

    var _this = this;
    this.recorder = new MediaRecorder(this.destination.stream);
    this.chunks = [];
    this.recorder.ondataavailable = function(e){
      _this.chunks.push(e.data);
    };
    this.recorder.start();
  };

  AudioRecorder.prototype.recordStop = function(){
    this.$recordButtons.removeClass('active');
    this.$recordButtons.text('Record');

    var _this = this;
    this.isSaving = true;
    this.recorder.stop();
    this.recorder.onstop = function(e){
      var blob = new Blob(_this.chunks, { type: 'audio/wav' });
      _this.exportWavData(blob);
      _this.isSaving = false;
    };
  };

  return AudioRecorder;

})();
