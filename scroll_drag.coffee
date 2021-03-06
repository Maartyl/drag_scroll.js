
# License: MIT
# Author: Maartyl (c) 2016
# VERSION: 1.0.0


## LIB
###*
# http://stackoverflow.com/a/2381862/2692364
# Fire an event handler to the specified node.
# Event handlers can detect that the event was fired programatically
# by testing for a 'synthetic=true' property on the event object
# @param {HTMLNode} node The node to fire the event handler on.
# @param {String} eventName The name of the event without the "on" (e.g., "focus")
###

fireEvent = (node, eventName, evo) ->
  # Make sure we use the ownerDocument from the provided node to avoid cross-window problems
  doc = if node.ownerDocument
    node.ownerDocument
  else if node.nodeType is 9
    # the node may be the document itself, nodeType 9 = DOCUMENT_NODE
    node
  else
    throw new Error('Invalid node passed to fireEvent: ' + node.id)

  if node.dispatchEvent
    # Gecko-style approach (now the standard) takes more work

    # Different events have different event classes.
    # If this switch statement can't map an eventName to an eventClass,
    # the event firing is going to fail.
    ev = evo or do(doc, eventName)->
      eventClass = switch eventName
        # Dispatching of 'click' appears to not work correctly in Safari.
        # Use 'mousedown' or 'mouseup' instead.
        when 'click', 'mousedown', 'mouseup'
          'MouseEvents'
        when 'focus', 'change', 'blur', 'select'
          'HTMLEvents'
        else
          throw new Error "fireEvent: Couldn't find an event class for event '#{eventName}'."
      ev = doc.createEvent eventClass
      # All events created as bubbling and cancelable.
      ev.initEvent eventName, true, true
      # allow detection of synthetic events
      ev.synthetic = true
      ev
    # The second parameter says: go ahead with the default action
    node.dispatchEvent ev, true
  else if node.fireEvent
    # IE-old school style
    event = doc.createEventObject()
    event.synthetic = true
    # allow detection of synthetic events
    node.fireEvent 'on' + eventName, evo or event
#   else
#     node[eventName]? evo #node.click() etc.

# ---
# generated by js2coffee 2.2.0
## /LIB

DBG_SHOW_FOUND = false
DBG_PRINT_POS = false
DBG_LOG_SPEED = false

# keeps track of last MAX positions and derivations, to compute overscroll
class Buf
  MAX = 50 #max_length: idx MAX == 0
  idx: 0
  len: 0
  arr: [] # @add for details

  constructor: (pos) ->
    @idx = 0
    @len = 0
    @arr = [
      m:0
      d:0
      l:1
      p:pos
      t:performance.now()
    ]

  # returns DIFF from last
  # pos of mouse (as obtained from event)
  add: (pos) =>
    time = performance.now()
    last = @arr[@idx]
    diff = last.p - pos #inverted, otherwise scrolls ... upside down
    len = time - last.t

    if len is 0 # avoid division by 0
      return diff

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
    ret = (acc / acc_w) #returns average derivation: rate of change: px/ms
    return   0 if Number.isNaN ret
    return -10 if ret < -10
    return  10 if ret >  10
    ret


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
  elligible: (e) =>
    style = if e.currentStyle
    then e.currentStyle
    else getComputedStyle(e, null)
#     style.position isnt 'static' and # static breaks scrolling sometimes
    style[@overflow_css] is 'auto' or #makes sense to scroll
    style[@overflow_css] is 'scroll' and
    e.parentElement #no parent == html -> use global scroll

  constructor: (@start) ->
    cur_elem = @start
    while cur_elem
      if Math.abs(@compare cur_elem) > 18 and @elligible cur_elem
        console.log "#{@desc}.found:", cur_elem if DBG_SHOW_FOUND
        @elem = cur_elem
        return
      else
        cur_elem = cur_elem.parentElement
    # none found: nothing scrollable: just override with a mock
    console.log "#{@desc}.found:none" if DBG_SHOW_FOUND
#     @scroll = (dist) -> 0
#     @scrollable = false
    @scroll = @fallback
    return
  scrollable:true

class ScrollerX extends Scroller
  #   compare: (e) -> e.scrollLeftMax ##e.scrollWidth - e.clientWidth #0 if same
  compare: (e) -> e.scrollWidth - e.clientWidth #0 if same
  scroll: (dist) => @elem.scrollLeft+=dist #auto manages bounds
  fallback: (dist) -> window.scrollBy(dist, 0)
  overflow_css: 'overflow-x'
  desc: 'X'
class ScrollerY extends Scroller
#   compare: (e) -> e.scrollTopMax ##e.scrollHeight - e.clientHeight #0 if same
  compare: (e) -> e.scrollHeight - e.clientHeight #0 if same
  scroll: (dist) => @elem.scrollTop+=dist
  fallback: (dist) -> window.scrollBy(0, dist)
  overflow_css: 'overflow-y'
  desc:'Y'

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
    console.log 'xy:', ev.clientX, ev.clientY if DBG_PRINT_POS
#DBG_LOG dx
    @sx.scroll @bx.add ev.clientX if @sx.scrollable
    @sy.scroll @by.add ev.clientY if @sy.scrollable

  # distance from init_pos
  init_dist: (x, y) => Math.sqrt(Math.pow(@init_pos.x - x, 2) + Math.pow(@init_pos.y - y, 2))

  next: (ev) =>
    @mover ev
    @
  #just continue (could also start anew...
  #(happens when proper mouseup wasn't registered (outside window)))
  start: (ev) => @next ev
  stop: (ev) =>
#     #don't follow links if I moved at least a bit
#     if init_dist(ev.clientX, ev.clientY) > 100 then ev.stopPropagation()
#     ... breaks ... kinda everything XD
    @mover ev
    new Overscroll @bx.avg(), @by.avg(), @sx, @sy

drag = (ev) -> new Dragger ev

class Momentum
  DRAG = 0.998 #speed at which to slow down (0.2% per ms)
  LIMIT = 0.25 #px/ms
  # speed: px/ms; scroll: fn, scrolls by given pixels
  constructor: (@speed, @scroll) ->
    @last_time = performance.now()
    @running = true
    @leftover = 0
    window.requestAnimationFrame @run

  stop: => @running = false

  run: (time)=>
    if (!@running)
      return

    # time = performance.now()
    tdiff = time - @last_time #elapsed ms from last invocation
    @last_time = time

    # tdiff should still be ms, just more accurate than date

    @speed = Math.pow(DRAG, tdiff) * @speed

    if Math.abs(@speed) < LIMIT
      lo = Math.round(@leftover)
      if (lo != 0)
        @scroll lo

      do @stop
    else
      #this is slightly smaller, as it doesn't include every step, but... it's fine
      scroll_by = @speed * tdiff + @leftover
      # @leftover = scroll_by % 1  # scrolled by integer pixels
      # scroll_by = scroll_by // 1

      @scroll scroll_by
      window.requestAnimationFrame @run

# exists after dragger ends
class Overscroll
  constructor: (@speedX, @speedY, scrollerX, scrollerY)->
    console.log 'speed.xy', @speedX, @speedY if DBG_LOG_SPEED
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
    ev.preventDefault(); #windows needs that - otherwise does the annoying scrolling
    ev.stopPropagation();
    false
  up: (ev) =>
    if ev.button isnt MB then return
    document.removeEventListener 'mousemove', @move
    @serv = @serv.stop ev

  #API
  show_found:(state)->
    unless state?
      DBG_SHOW_FOUND
    else
      DBG_SHOW_FOUND = state
  print_pos:(state)->
    unless state?
      DBG_PRINT_POS
    else
      DBG_PRINT_POS = state
  log_speed:(state)->
    unless state?
      DBG_LOG_SPEED
    else
      DBG_LOG_SPEED = state

l = new Listener()

maa = 'Maa_scroll_drag'
if window[maa]
  window[maa].kill() #kill previous running (for restarting)
window[maa] = l

l.listen()
