// ==UserScript==
// @name        drag scroll
// @namespace   maa
// @include     *
// @version     1.0.0
// @grant       none
// @author      Maartyl
// @license     MIT
// ==/UserScript==

// Generated by CoffeeScript 1.10.0

/**
 * http://stackoverflow.com/a/2381862/2692364
 * Fire an event handler to the specified node.
 * Event handlers can detect that the event was fired programatically
 * by testing for a 'synthetic=true' property on the event object
 * @param {HTMLNode} node The node to fire the event handler on.
 * @param {String} eventName The name of the event without the "on" (e.g., "focus")
 */

(function() {
  var Buf, DBG_LOG_SPEED, DBG_PRINT_POS, DBG_SHOW_FOUND, Dragger, Listener, Momentum, Overscroll, Scroller, ScrollerX, ScrollerY, drag, fireEvent, l, maa,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  fireEvent = function(node, eventName, evo) {
    var doc, ev, event;
    doc = (function() {
      if (node.ownerDocument) {
        return node.ownerDocument;
      } else if (node.nodeType === 9) {
        return node;
      } else {
        throw new Error('Invalid node passed to fireEvent: ' + node.id);
      }
    })();
    if (node.dispatchEvent) {
      ev = evo || (function(doc, eventName) {
        var eventClass;
        eventClass = (function() {
          switch (eventName) {
            case 'click':
            case 'mousedown':
            case 'mouseup':
              return 'MouseEvents';
            case 'focus':
            case 'change':
            case 'blur':
            case 'select':
              return 'HTMLEvents';
            default:
              throw new Error("fireEvent: Couldn't find an event class for event '" + eventName + "'.");
          }
        })();
        ev = doc.createEvent(eventClass);
        ev.initEvent(eventName, true, true);
        ev.synthetic = true;
        return ev;
      })(doc, eventName);
      return node.dispatchEvent(ev, true);
    } else if (node.fireEvent) {
      event = doc.createEventObject();
      event.synthetic = true;
      return node.fireEvent('on' + eventName, evo || event);
    }
  };

  DBG_SHOW_FOUND = false;

  DBG_PRINT_POS = false;

  DBG_LOG_SPEED = false;

  Buf = (function() {
    var MAX;

    MAX = 50;

    Buf.prototype.idx = 0;

    Buf.prototype.len = 0;

    Buf.prototype.arr = [];

    function Buf(pos) {
      this.avg = bind(this.avg, this);
      this.inc = bind(this.inc, this);
      this.add = bind(this.add, this);
      this.idx = 0;
      this.len = 0;
      this.arr = [
        {
          m: 0,
          d: 0,
          l: 1,
          p: pos,
          t: new Date
        }
      ];
    }

    Buf.prototype.add = function(pos) {
      var diff, last, len, time;
      time = new Date;
      last = this.arr[this.idx];
      diff = last.p - pos;
      len = time - last.t;
      if (len === 0) {
        return diff;
      }
      this.arr[this.inc()] = {
        m: diff,
        t: time,
        d: diff / len,
        l: len,
        p: pos
      };
      return diff;
    };

    Buf.prototype.inc = function() {
      this.idx = (this.idx + 1) % MAX;
      if (this.len < MAX) {
        this.len++;
      }
      return this.idx;
    };

    Buf.prototype.avg = function() {
      var acc, acc_w, e, i, idx, j, ref, ret, weight;
      acc = 0;
      acc_w = 0;
      for (i = j = 0, ref = this.len; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        idx = this.len < MAX ? i : (this.idx + 1 + i) % this.len;
        e = this.arr[idx];
        weight = i / this.len * e.l;
        acc += weight * e.d;
        acc_w += weight;
      }
      ret = acc / acc_w;
      if (Number.isNaN(ret)) {
        return 0;
      }
      if (ret < -10) {
        return -10;
      }
      if (ret > 10) {
        return 10;
      }
      return ret;
    };

    return Buf;

  })();

  Scroller = (function() {
    Scroller.prototype.elligible = function(e) {
      var style;
      style = e.currentStyle ? e.currentStyle : getComputedStyle(e, null);
      return style[this.overflow_css] === 'auto' || style[this.overflow_css] === 'scroll' && e.parentElement;
    };

    function Scroller(start) {
      var cur_elem;
      this.start = start;
      this.elligible = bind(this.elligible, this);
      cur_elem = this.start;
      while (cur_elem) {
        if (Math.abs(this.compare(cur_elem)) > 18 && this.elligible(cur_elem)) {
          if (DBG_SHOW_FOUND) {
            console.log(this.desc + ".found:", cur_elem);
          }
          this.elem = cur_elem;
          return;
        } else {
          cur_elem = cur_elem.parentElement;
        }
      }
      if (DBG_SHOW_FOUND) {
        console.log(this.desc + ".found:none");
      }
      this.scroll = this.fallback;
      return;
    }

    Scroller.prototype.scrollable = true;

    return Scroller;

  })();

  ScrollerX = (function(superClass) {
    extend(ScrollerX, superClass);

    function ScrollerX() {
      this.scroll = bind(this.scroll, this);
      return ScrollerX.__super__.constructor.apply(this, arguments);
    }

    ScrollerX.prototype.compare = function(e) {
      return e.scrollWidth - e.clientWidth;
    };

    ScrollerX.prototype.scroll = function(dist) {
      return this.elem.scrollLeft += dist;
    };

    ScrollerX.prototype.fallback = function(dist) {
      return window.scrollBy(dist, 0);
    };

    ScrollerX.prototype.overflow_css = 'overflow-x';

    ScrollerX.prototype.desc = 'X';

    return ScrollerX;

  })(Scroller);

  ScrollerY = (function(superClass) {
    extend(ScrollerY, superClass);

    function ScrollerY() {
      this.scroll = bind(this.scroll, this);
      return ScrollerY.__super__.constructor.apply(this, arguments);
    }

    ScrollerY.prototype.compare = function(e) {
      return e.scrollHeight - e.clientHeight;
    };

    ScrollerY.prototype.scroll = function(dist) {
      return this.elem.scrollTop += dist;
    };

    ScrollerY.prototype.fallback = function(dist) {
      return window.scrollBy(0, dist);
    };

    ScrollerY.prototype.overflow_css = 'overflow-y';

    ScrollerY.prototype.desc = 'Y';

    return ScrollerY;

  })(Scroller);

  Dragger = (function() {
    function Dragger(ev) {
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      this.next = bind(this.next, this);
      this.init_dist = bind(this.init_dist, this);
      this.mover = bind(this.mover, this);
      this.init_pos = {
        x: ev.clientX,
        y: ev.clientY
      };
      this.init_target = ev.target;
      this.bx = new Buf(this.init_pos.x);
      this.by = new Buf(this.init_pos.y);
      this.sx = new ScrollerX(this.init_target);
      this.sy = new ScrollerY(this.init_target);
    }

    Dragger.prototype.mover = function(ev) {
      if (DBG_PRINT_POS) {
        console.log('xy:', ev.clientX, ev.clientY);
      }
      if (this.sx.scrollable) {
        this.sx.scroll(this.bx.add(ev.clientX));
      }
      if (this.sy.scrollable) {
        return this.sy.scroll(this.by.add(ev.clientY));
      }
    };

    Dragger.prototype.init_dist = function(x, y) {
      return Math.sqrt(Math.pow(this.init_pos.x - x, 2) + Math.pow(this.init_pos.y - y, 2));
    };

    Dragger.prototype.next = function(ev) {
      this.mover(ev);
      return this;
    };

    Dragger.prototype.start = function(ev) {
      return this.next(ev);
    };

    Dragger.prototype.stop = function(ev) {
      this.mover(ev);
      return new Overscroll(this.bx.avg(), this.by.avg(), this.sx, this.sy);
    };

    return Dragger;

  })();

  drag = function(ev) {
    return new Dragger(ev);
  };

  Momentum = (function() {
    var DRAG, LIMIT;

    DRAG = 0.998;

    LIMIT = 0.25;

    function Momentum(speed, scroll) {
      this.speed = speed;
      this.scroll = scroll;
      this.run = bind(this.run, this);
      this.stop = bind(this.stop, this);
      this.last_time = new Date;
      this.intervalID = setInterval(this.run, 16);
    }

    Momentum.prototype.stop = function() {
      return clearInterval(this.intervalID);
    };

    Momentum.prototype.run = function() {
      var tdiff, time;
      time = new Date;
      tdiff = time - this.last_time;
      this.last_time = time;
      this.speed = Math.pow(DRAG, tdiff) * this.speed;
      if (Math.abs(this.speed) < LIMIT) {
        return this.stop();
      } else {
        return this.scroll(this.speed * tdiff);
      }
    };

    return Momentum;

  })();

  Overscroll = (function() {
    function Overscroll(speedX, speedY, scrollerX, scrollerY) {
      this.speedX = speedX;
      this.speedY = speedY;
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      this.next = bind(this.next, this);
      if (DBG_LOG_SPEED) {
        console.log('speed.xy', this.speedX, this.speedY);
      }
      if (scrollerX && scrollerX.scrollable) {
        this.mx = new Momentum(this.speedX, scrollerX.scroll);
      }
      if (scrollerY && scrollerY.scrollable) {
        this.my = new Momentum(this.speedY, scrollerY.scroll);
      }
      this.mx = this.mx || {
        stop: function() {
          return 0;
        }
      };
      this.my = this.my || {
        stop: function() {
          return 0;
        }
      };
    }

    Overscroll.prototype.next = function(ev) {
      this.mx.stop();
      this.my.stop();
      return drag(ev);
    };

    Overscroll.prototype.start = function(ev) {
      return this.next(ev);
    };

    Overscroll.prototype.stop = function(ev) {
      return this;
    };

    return Overscroll;

  })();

  Listener = (function() {
    var LMB, MB, MMB, RMB;

    function Listener() {
      this.up = bind(this.up, this);
      this.down = bind(this.down, this);
      this.move = bind(this.move, this);
      this.kill = bind(this.kill, this);
      this.listen = bind(this.listen, this);
    }

    LMB = 0;

    MMB = 1;

    RMB = 2;

    MB = MMB;

    Listener.prototype.serv = new Overscroll(0, 0);

    Listener.prototype.listen = function() {
      document.addEventListener('mousedown', this.down);
      return document.addEventListener('mouseup', this.up);
    };

    Listener.prototype.kill = function() {
      document.removeEventListener('mousedown', this.down);
      document.removeEventListener('mouseup', this.up);
      return document.removeEventListener('mousemove', this.move);
    };

    Listener.prototype.move = function(ev) {
      return this.serv = this.serv.next(ev);
    };

    Listener.prototype.down = function(ev) {
      if (ev.button !== MB) {
        return;
      }
      this.serv = this.serv.start(ev);
      document.addEventListener('mousemove', this.move);
      return false;
    };

    Listener.prototype.up = function(ev) {
      if (ev.button !== MB) {
        return;
      }
      document.removeEventListener('mousemove', this.move);
      return this.serv = this.serv.stop(ev);
    };

    Listener.prototype.show_found = function(state) {
      if (state == null) {
        return DBG_SHOW_FOUND;
      } else {
        return DBG_SHOW_FOUND = state;
      }
    };

    Listener.prototype.print_pos = function(state) {
      if (state == null) {
        return DBG_PRINT_POS;
      } else {
        return DBG_PRINT_POS = state;
      }
    };

    Listener.prototype.log_speed = function(state) {
      if (state == null) {
        return DBG_LOG_SPEED;
      } else {
        return DBG_LOG_SPEED = state;
      }
    };

    return Listener;

  })();

  l = new Listener();

  maa = 'Maa_scroll_drag';

  if (window[maa]) {
    window[maa].kill();
  }

  window[maa] = l;

  l.listen();

}).call(this);
