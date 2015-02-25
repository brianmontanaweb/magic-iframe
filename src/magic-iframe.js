(function() {
  window.requestAnimationFrame = (function() {
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     ||
           function (callback, element) {
               window.setTimeout(callback, 1000/60);
           };
  })();

  var Config = {
    IS_FIREFOX: !!navigator.userAgent.match(/firefox/i),
    FIREFOX_TIMEOUT: 50
  };

  var currentScript = document.currentScript;
  if (currentScript == null) {
    var scripts = document.getElementsByTagName('script');
    currentScript = scripts[scripts.length - 1];
  }

  var iframe = document.createElement('iframe');

  if (currentScript.id) {
    iframe.id = currentScript.id;
    currentScript.id = 'mif-script-' + currentScript.id;
  }

  iframe.frameBorder = 0;
  iframe.scrolling = 'no';
  iframe.allowfullscreen = 'true';
  iframe.style.display = 'block';
  iframe.style.webkitBoxSizing = 'border-box';
  iframe.style.mozBoxSizing = 'border-box';
  iframe.style.boxSizing = 'border-box';
  iframe.style.width = '100%';
  iframe.style.minHeight = '2em';
  iframe.style.overflow = 'hidden';
  currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);

  var _reload = iframe.reload;
  iframe.reload = function(url, base) {
    if (url != null) {
      iframe.setAttribute('data-src', url);
    }

    if (base == null) {
      iframe.removeAttribute('data-base');
    } else {
      iframe.setAttribute('data-base', base);
    }

    loadFrame(iframe.getAttribute('data-src'));
  };

  var frameSize = function() {
    if (!iframe.contentWindow || !iframe.contentWindow.document || !iframe.contentWindow.document.documentElement) return;
    iframe.height = iframe.contentWindow.document.documentElement.scrollHeight;
  };

  var frameReady = function ready(fn) {
    if (!iframe.contentWindow || !iframe.contentWindow.document || !iframe.contentWindow.document.documentElement) return;

    if (iframe.contentWindow.document.readyState != 'loading' && iframe.contentWindow.document.readyState != 'uninitialized') {
      fn();
    } else if (iframe.contentWindow.document.addEventListener) {
      iframe.contentWindow.document.addEventListener('DOMContentLoaded', fn);
    } else {
      iframe.contentWindow.document.attachEvent('onreadystatechange', function() {
        if (iframe.contentWindow.document.readyState != 'loading')
          fn();
      });
    }
  };

  var fixFrameLinks = function () {
    var root = iframe.contentWindow.document.documentElement;

    var linkHandler = function (event) {
      var elem = event.target;
      if (elem.nodeName !== 'A' || elem.href.match(/^javascript:/i)) return;
      
      event.preventDefault();

      switch (elem.target) {
      case '_self':
        iframe.src = elem.href;
        break;
      case '_blank':
        window.open(elem.href);
        break;
      case '_top':
        window.top.location = elem.href;
      case '_parent':
      default:
        window.parent.location = elem.href;
      }
    }

    if (root.addEventListener) {
      root.addEventListener('click', linkHandler);
    } else {
      root.attachEvent('onclick', function() {
        linkHandler.call(root);
      });
    }
  };

  var content_counter = 0;
  var populateFrame = function (body, className) {
    var base = iframe.getAttribute('data-base');
    if (base != null && base != '') {
      var baseTag = '<base href="' + base + '" />';
      body = body.replace('<head>', '<head>' + baseTag);
    }

    delete iframe.contentWindow['mif_content' + content_counter];
    content_counter++;

    iframe.contentWindow['mif_content_' + content_counter] = body;

    iframe.style.minHeight = 0;
    iframe.src = 'javascript:window["mif_content_' + content_counter + '"]';
    iframe.className = className;

    if (Config.IS_FIREFOX) {
      setTimeout(function() {
        frameReady(fixFrameLinks);
      }, Config.FIREFOX_TIMEOUT);
    } else {
      frameReady(fixFrameLinks);
    }
  };

  populateFrame('Loading...', 'mif-loading');

  var loadFrame = function(url) {
    var xhr = new XMLHttpRequest();
    if ('withCredentials' in xhr) {
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            var doPopulate = function() {
              populateFrame(xhr.responseText, 'mif-loaded');
            };

            if (Config.IS_FIREFOX) {
              setTimeout(doPopulate, Config.FIREFOX_TIMEOUT);
            } else {
              doPopulate();
            }
          } else if (xhr.status == 0) {
            alert('Missing access control headers!');
          } else {
            alert('Error loading (XHR)!');
          }
        }
      };
    } else if (typeof window.XDomainRequest === 'undefined') {
      iframe.src = url;
      iframe.style.minHeight = 0;
      xhr = null;
    } else {
      xhr = new XDomainRequest();
      xhr.onload = function() {
        populateFrame(xhr.responseText, 'mif-loaded');
      };
      xhr.onerror = function() {
        alert('Error loading (XDR)!');
      };
    }

    if (xhr != null) {
      populateFrame('Loading...', 'mif-loading');

      xhr.open('GET', url, true);
      if ('withCredentials' in xhr) xhr.withCredentials = true;
      xhr.send(null);
    }
  };

  var url = currentScript.getAttribute('data-url');
  if (url == null) {
    var a = document.createElement('a');
    a.href = currentScript.src;
    
    url = window.location.protocol + '//' + a.hostname;
    if (a.port != 80) url += ':' + a.port;
  }

  iframe.reload(url, currentScript.getAttribute('data-base') || url);

  requestAnimationFrame(function af() {
    frameSize();
    requestAnimationFrame(af);
  });
  
})();
