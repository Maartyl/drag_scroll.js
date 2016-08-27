
# License: MIT
# Author: Maartyl (c) 2016
# VERSION: 1.0.0

# keeps track of last MAX positions and derivations, to compute overscroll
class Buf
  MAX = 50 #max_length: idx MAX == 0
  idx: 0
  len: 0
  arr: [{m:0, d:0, l:1}] #see @add for details

  constructor: (pos) ->
    @arr[0].p = pos
    @arr[0].t = new Date

  # returns DIFF from last
  # pos of mouse (as obtained from event)
  add: (pos) =>
    time = new Date
    last = @arr[@idx]
    diff = last.p - pos #inverted, otherwise scrolls ... upside down
    len = time - last.t

    @arr[do @inc] =
      m: diff # relative movement from last
      t: time # current time
      d: diff / len # rate of change: change over time
      l: len # time diff from last time
      p: pos # the exact position of mouse in buffer's direction

    diff

  inc: () =>
    @idx = (@idx + 1) % MAX
    if @len < MAX then @len++
    @idx

  # decreasingly weighted average
  avg: () =>
    acc = 0
    acc_w = 0
    for i in [0 .. @len]
      # @idx points to last element if looped
      idx = if @len < MAX then i else #never looped: arr is not 'full'
        (@idx + 1 + i) % @len #@idx+1: after last -> [0]
      e = @arr[idx]
      weight = i/@len * (e.l) # CUSTOMIZE this to interpret previous moves differently
      acc += weight * e.d
      acc_w += weight
    acc / acc_w #returns average derivation: rate of change: px/ms


# Ifce for listener
# .next  -> self,  called from mousemove
# .start -> self,  called from mousedown
# .stop  -> self,  called from mouseup
# self: something that implemnts this ifce
# all takes mouse_event as argument


#finds parent-nearest scrollable html-element and provides it as @elem
class Scroller
  #@elem
  #API: @scroll, @scrollable

#tests if an element makes sense to be used for scrolling
  elligible = (e) ->
    (if e.currentStyle then e.currentStyle
    else getComputedStyle(e, null)).position isnt 'static' # static breaks scrolling sometimes

  constructor: (@start) ->
    cur_elem = @start
    while cur_elem
      if Math.abs(@compare cur_elem) > 5 and elligible cur_elem
#         console.log 'found:', cur_elem
        @elem = cur_elem
        return
      else
        cur_elem = cur_elem.parentElement
    # none found: nothing scrollable: just override with a mock
#     @scroll = (dist) -> 0
#     @scrollable = false
    @scroll = @fallback
    return
  scrollable:true

class ScrollerX extends Scroller
  compare: (e) -> e.scrollLeftMax ##e.scrollWidth - e.clientWidth #0 if same
  scroll: (dist) => @elem.scrollLeft+=dist #auto manages bounds
  fallback: (dist) -> window.scrollBy(dist, 0)
class ScrollerY extends Scroller
  compare: (e) -> e.scrollTopMax ##e.scrollHeight - e.clientHeight #0 if same
  scroll: (dist) => @elem.scrollTop+=dist
  fallback: (dist) -> window.scrollBy(0, dist)

# exists for a single drag
class Dragger
  constructor: (ev) ->
    @init_pos = x:ev.clientX, y:ev.clientY
    @init_target = ev.target
    @bx = new Buf @init_pos.x
    @by = new Buf @init_pos.y
    @sx = new ScrollerX @init_target
    @sy = new ScrollerY @init_target

  # mian MOUSEMOVE event handler
  mover: (ev) =>
    @sx.scroll @bx.add ev.clientX if @sx.scrollable
    @sy.scroll @by.add ev.clientY if @sy.scrollable

  # distance from init_pos
  init_dist: (x, y) => Math.sqrt(Math.pow(@init_pos.x - x, 2) + Math.pow(@init_pos.y - y, 2))

  next: (ev) =>
    @mover ev
    @
  #just continue (could also start anew... (happens when proper mouseup wasn't registered (outside window)))
  start: (ev) => @next ev
  stop: (ev) =>
#     if init_dist(ev.clientX, ev.clientY) > 100 then ev.stopPropagation() #don't follow links if I moved at least a bit
#     ... breaks ... kinda everything XD
    @mover ev
    new Overscroll @bx.avg(), @by.avg(), @sx, @sy

drag = (ev) -> new Dragger ev

class Momentum
  DRAG = 0.998 #speed at which to slow down (0.2% per ms)
  LIMIT = 0.25 #px/ms
  # speed: px/ms; scroll: fn, scrolls by given pixels
  constructor: (@speed, @scroll) ->
    @last_time = new Date
    @intervalID = setInterval @run, 16 #16.6ms === 60FPS (and there will be some overhead here)

  stop: => clearInterval @intervalID

  run: =>
    time = new Date
    tdiff = time - @last_time #elapsed ms from last invocation
    @last_time = time

    @speed = Math.pow(DRAG, tdiff) * @speed

    if Math.abs(@speed) < LIMIT
      do @stop
    else
      @scroll @speed * tdiff #this is slightly smaller, as it doesn't include every step, but... it's fine

# exists after dragger ends
class Overscroll
  constructor: (@speedX, @speedY, scrollerX, scrollerY)->
    @mx = new Momentum @speedX, scrollerX.scroll if scrollerX and scrollerX.scrollable
    @my = new Momentum @speedY, scrollerY.scroll if scrollerY and scrollerY.scrollable
    @mx = @mx or stop:()->0 #if not scrollable: stub, so it can be 'stopped'
    @my = @my or stop:()->0

  next: (ev) =>
    do @mx.stop
    do @my.stop
    drag ev
  start: (ev) => @next ev
  stop: (ev) => @ #ignore (already stopped (drag))

#exist all the time
class Listener
  LMB = 0
  MMB = 1
  RMB = 2
  MB = MMB
  serv: new Overscroll 0, 0 # don't move at start

  listen:() =>
    document.addEventListener 'mousedown', @down
    document.addEventListener 'mouseup', @up

  kill:() =>
    document.removeEventListener 'mousedown', @down
    document.removeEventListener 'mouseup', @up
    document.removeEventListener 'mousemove', @move

  move: (ev) => @serv = @serv.next ev
  down: (ev) =>
    if ev.button isnt MB then return
    @serv = @serv.start ev
    document.addEventListener 'mousemove', @move
  up: (ev) =>
    if ev.button isnt MB then return
    document.removeEventListener 'mousemove', @move
    @serv = @serv.stop ev

l = new Listener()

maa = 'Maa_scroll_drag'
if window[maa]
  window[maa].kill() #kill previous running (for restarting)
window[maa] = l

l.listen()
