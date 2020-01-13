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

    this.loadListeners();
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
  };

  AudioRecorder.prototype.recordStop = function(){
    this.$recordButtons.removeClass('active');
    this.$recordButtons.text('Record');
  };

  return AudioRecorder;

})();
