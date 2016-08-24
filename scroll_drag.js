// Generated by CoffeeScript 1.10.0
(function() {
  var Buf, Dragger, Listener, Momentum, Overscroll, drag, l,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Buf = (function() {
    var MAX;

    MAX = 100;

    Buf.prototype.idx = 0;

    Buf.prototype.len = 0;

    Buf.prototype.arr = [
      {
        m: 0,
        d: 0,
        l: 1
      }
    ];

    function Buf(pos) {
      this.avg = bind(this.avg, this);
      this.inc = bind(this.inc, this);
      this.add = bind(this.add, this);
      this.arr[0].p = pos;
      this.arr[0].t = new Date;
    }

    Buf.prototype.add = function(pos) {
      var diff, last, len, time;
      time = new Date;
      last = this.arr[this.idx];
      diff = last.p - pos;
      len = time - last.t;
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
      var acc, acc_w, e, i, idx, j, ref, weight;
      acc = 0;
      acc_w = 0;
      for (i = j = 0, ref = this.len; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
        idx = this.len < MAX ? i : (this.idx + 1 + i) % this.len;
        e = this.arr[idx];
        weight = i / this.len * (e.l / 100);
        acc += weight * e.d;
        acc_w += weight;
      }
      return acc / acc_w;
    };

    return Buf;

  })();

  Dragger = (function() {
    function Dragger(pos) {
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      this.next = bind(this.next, this);
      this.mover = bind(this.mover, this);
      this.bx = new Buf(pos.x);
      this.by = new Buf(pos.y);
    }

    Dragger.prototype.mover = function(ev) {
      var dx, dy;
      dx = this.bx.add(ev.clientX);
      dy = this.by.add(ev.clientY);
      return window.scrollBy(dx, dy);
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
      return new Overscroll(this.bx.avg(), this.by.avg());
    };

    return Dragger;

  })();

  drag = function(ev) {
    return new Dragger({
      x: ev.clientX,
      y: ev.clientY
    });
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
    function Overscroll(speedX, speedY) {
      this.speedX = speedX;
      this.speedY = speedY;
      this.stop = bind(this.stop, this);
      this.start = bind(this.start, this);
      this.next = bind(this.next, this);
      this.mx = new Momentum(this.speedX, function(d) {
        return window.scrollBy(d, 0);
      });
      this.my = new Momentum(this.speedY, function(d) {
        return window.scrollBy(0, d);
      });
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
      return document.addEventListener('mousemove', this.move);
    };

    Listener.prototype.up = function(ev) {
      if (ev.button !== MB) {
        return;
      }
      document.removeEventListener('mousemove', this.move);
      return this.serv = this.serv.stop(ev);
    };

    return Listener;

  })();

  l = new Listener();

  l.listen();

  if (!window.Maa_scroll_drag) {
    window.Maa_scroll_drag = l;
  }

}).call(this);
