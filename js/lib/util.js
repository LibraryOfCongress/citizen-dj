// Utility functions

(function() {
  window.Util = {};

  Util.listToString = function(arr){
    var arrLen = arr.length;
    if (arrLen < 1) return "Unknown";
    if (arrLen < 2) return arr[0];
    if (arrLen < 3) return arr.join(' and ');

    var string = '';
    _.each(arr, function(value, i){
      if (i===arrLen-1) string += value;
      else if (i===arrLen-2) string += (value + ', and ');
      else string += (value + ', ');
    });
    return string;
  };

  Util.queryParams = function(){
    if (location.search.length) {
      var search = location.search.substring(1);
      return JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });
    }
    return {};
  };

  Util.scrollTo = function(el, offset){
    offset = offset || 0;
    // $(el)[0].scrollIntoView();

    $([document.documentElement, document.body]).animate({
        scrollTop: $(el).offset().top + offset
    }, 1000);
  };

  Util.timeToString = function(dt){
    dt = dt || new Date();
    var date = dt.getFullYear()+'-'+(dt.getMonth()+1)+'-' + dt.getDate();
    var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    var dateTime = date+' '+time;
    return dateTime;
  };

})();


(function() {
  window.MathUtil = {};

  MathUtil.ceilToNearest = function(value, nearest) {
    return Math.ceil(value / nearest) * nearest;
  };

  MathUtil.clamp = function(value, min, max) {
    value = Math.min(value, max);
    value = Math.max(value, min);
    return value;
  };

  MathUtil.ease = function(n){
    return (Math.sin((n+1.5)*Math.PI)+1.0) / 2.0;
  };

  MathUtil.floorToNearest = function(value, nearest) {
    return Math.floor(value / nearest) * nearest;
  };

  MathUtil.lerp = function(a, b, percent) {
    return (1.0*b - a) * percent + a;
  };

  MathUtil.mod = function(n, m) {
    return ((n % m) + m) % m;
  }

  MathUtil.norm = function(value, a, b){
    var denom = (b - a);
    if (denom > 0 || denom < 0) {
      return (1.0 * value - a) / denom;
    } else {
      return 0;
    }
  };

  MathUtil.pad = function(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
  };

  MathUtil.round = function(value, precision) {
    return +value.toFixed(precision);
  };

  MathUtil.roundToNearest = function(value, nearest) {
    return Math.round(value / nearest) * nearest;
  };

  MathUtil.scaleAroundAnchor = function(originalValue, scaleAmount, anchor) {
    var distance = originalValue - anchor;
    var sdistance = distance * scaleAmount;
    return (anchor + sdistance);
  };

  MathUtil.secondsToString = function(seconds, precision){
    precision = precision || 0;
    if (!seconds || seconds <= 0) return "0:00";
    var d = new Date(null);
    d.setSeconds(seconds);
    var start = 11;
    var len = 8;
    if (seconds < 600) {
      start = 15;
      len = 4;
    } else if (seconds < 3600) {
      start = 14;
      len = 5;
    }
    var timeStr = d.toISOString().substr(start, len);
    if (precision > 0) timeStr += (seconds % 1.0).toFixed(precision).substr(1);
    return timeStr;
  };

  MathUtil.within = function(num, min, max) {
    if (num < min) return false;
    if (num > max) return false;
    return true;
  };

  MathUtil.wrap = function(num, min, max) {
    if (num >= min && num <= max) return num;
    else if (num < min) return max;
    else return min;
    // var delta = max - min;
    // if (delta < 1) return 0;
    // return ((num-min) % delta) + min;
  };

})();


(function() {
  window.AudioUtils = {};

  // https://github.com/Jam3/audiobuffer-to-wav
  function audioBufferToWav(buffer, opt) {
    opt = opt || {}

    var numChannels = buffer.numberOfChannels
    var sampleRate = buffer.sampleRate
    var format = opt.float32 ? 3 : 1
    var bitDepth = format === 3 ? 32 : 16

    var result
    if (numChannels === 2) {
      result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
    } else {
      result = buffer.getChannelData(0)
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
  }

  function encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
    var bytesPerSample = bitDepth / 8
    var blockAlign = numChannels * bytesPerSample

    var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
    var view = new DataView(buffer)

    /* RIFF identifier */
    writeString(view, 0, 'RIFF')
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true)
    /* RIFF type */
    writeString(view, 8, 'WAVE')
    /* format chunk identifier */
    writeString(view, 12, 'fmt ')
    /* format chunk length */
    view.setUint32(16, 16, true)
    /* sample format (raw) */
    view.setUint16(20, format, true)
    /* channel count */
    view.setUint16(22, numChannels, true)
    /* sample rate */
    view.setUint32(24, sampleRate, true)
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true)
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true)
    /* bits per sample */
    view.setUint16(34, bitDepth, true)
    /* data chunk identifier */
    writeString(view, 36, 'data')
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true)
    if (format === 1) { // Raw PCM
      floatTo16BitPCM(view, 44, samples)
    } else {
      writeFloat32(view, 44, samples)
    }

    return buffer
  }

  function interleave (inputL, inputR) {
    var length = inputL.length + inputR.length
    var result = new Float32Array(length)

    var index = 0
    var inputIndex = 0

    while (index < length) {
      result[index++] = inputL[inputIndex]
      result[index++] = inputR[inputIndex]
      inputIndex++
    }
    return result
  }

  function writeFloat32 (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 4) {
      output.setFloat32(offset, input[i], true)
    }
  }

  function floatTo16BitPCM (output, offset, input) {
    for (var i = 0; i < input.length; i++, offset += 2) {
      var s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
  }

  function writeString (view, offset, string) {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  AudioUtils.audioBufferToWavfile = function(buffer, filename){
    var wav = audioBufferToWav(buffer)
    var blob = new window.Blob([ new DataView(wav) ], {
      type: 'audio/wav'
    });
    var url = window.URL.createObjectURL(blob);
    var anchorId = 'invisibleBufferAchnor';
    var anchor = document.getElementById(anchorId);
    if (!anchor) {
      var anchor = document.createElement('a')
      document.body.appendChild(anchor);
      anchor.id = anchorId;
      anchor.style = 'display: none';
    }
    anchor.href = url;
    anchor.download = filename || 'citizen_dj_audio_clip.wav';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

})();
