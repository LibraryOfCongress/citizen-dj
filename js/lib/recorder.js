'use strict';

var AudioRecorder = (function() {

  function AudioRecorder(config) {
    var defaults = {

    };
    this.opt = _.extend({}, defaults, config);
    this.init();
  }

  AudioRecorder.prototype.init = function(){
    this.$recordButtons = $('.record-audio');
    this.isSaving = false;
    this.destination = this.opt.destination;
    this.prevUrl = false;
    this.recorder = false;

    if (this.destination) {

      var mimeType = 'audio/wav';
      var recorderType = MediaStreamRecorder;
      if (!MediaRecorder.isTypeSupported(mimeType)){
        recorderType = StereoAudioRecorder;
      }

      this.recorder = RecordRTC(this.destination.stream, {
        type: 'audio',
        mimeType: mimeType,
        recorderType: recorderType
      });
    }

    this.loadListeners();
  };

  AudioRecorder.prototype.loadListeners = function(){
    var _this = this;

    this.$recordButtons.on('click', function(e){
      if (!_this.isSaving) _this.onRecordAudio($(this));
    });
  };

  AudioRecorder.prototype.onRecordAudio = function($el){
    if (!this.recorder) {
      alert("Your current browser does not support recording. Please try Firefox, Chrome, or Safari.")
      return;
    }

    var isActive = $el.hasClass('active');
    if (isActive) this.recordStop();
    else this.recordStart();
  };

  AudioRecorder.prototype.recordStart = function(){
    this.$recordButtons.addClass('active');
    this.$recordButtons.text('Stop recording');
    this.recorder.startRecording();
  };

  AudioRecorder.prototype.recordStop = function(){
    var _this = this;
    this.$recordButtons.removeClass('active');
    this.$recordButtons.text('Record');

    this.isSaving = true;
    this.recorder.stopRecording(function() {
      var blob = _this.recorder.getBlob();
      invokeSaveAsDialog(blob);
      _this.isSaving = false;
    });
  };

  return AudioRecorder;

})();
