/*!
 * Gamepads.js v0.2 (in development)
 * http://github.com/scottheckel/gamepads.js
 *
 * Copyright 2013 Scott Heckel, http://www.scottheckel.com
 * Released under the MIT license
 *
 * Date: 1/21/2013
 */


(function(window, math, undefined) {
  var navigator = window.navigator,
      gamepads = function() {
        return new gamepads.fn.init();
      },
      trigger = function(eventKey, data) {
        var callbacks = _callbacks[eventKey];
        for(var index = 0; callbacks && index < callbacks.length; callbacks++) {
          callbacks[index].call(this, data);
        }
      },
      createState = function() {
        return {
          axes: [],
          buttons: [],
          id: '',
          isConnected: false,
          timestamp: 0
        };
      },
      connectStates = function(state, prevState, id, totalButtons, totalAxes) {
        state.id = prevState.id = id;
        state.isConnected = prevState.isConnected = true;
        state.buttons = [];
        prevState.buttons = [];
        state.axes = [];
        prevState.axes = [];

        var index;
        for(index = 0; index < totalButtons; index++) {
          state.buttons[index] = {
            timestamp: undefined,
            value: 0
          };
        }
        for(index = 0; index < totalAxes; index++) {
          state.axes[index] = 0;
        }
      },
      updateGamepad = function(latest, current, previous, index) {
      if(latest === undefined) {
        if(current.isConnected) {
          previous.isConnected = current.isConnected = false;
          if(_cachedStates[index]) {
            _cachedStates[index].isConnected = false;
          }
          trigger('disconnected', {
            gamepad: index
          });
        }
      } else {
        // New gamepad connected
        if(!current.isConnected) {
          connectStates(current, previous, latest.id, latest.buttons.length, latest.axes.length);
          if(_cachedStates[index]) {
            _cachedStates[index].isConnected = true;
          }
          trigger('connected', {
            gamepad: index,
            id: latest.id
          });
        }

        // Update the timestamp
        previous.timestamp = current.timestamp;
        current.timestamp = (new Date()).getTime();

        var buttonTimestamp;
        for(var buttonIndex = 0; buttonIndex < latest.buttons.length; buttonIndex++) {
          if(latest.buttons[buttonIndex] > 0) {
            if(previous.buttons[buttonIndex] && previous.buttons[buttonIndex].value > 0) {
              buttonTimestamp = current.buttons[buttonIndex].timestamp;
            } else {
              buttonTimestamp = current.timestamp;
            }
          } else {
            buttonTimestamp = current.timestamp;
          }

          // Copy over the values to the current and previous states
          previous.buttons[buttonIndex] = current.buttons[buttonIndex];
          current.buttons[buttonIndex] = {
            timestamp: buttonTimestamp,
            value: latest.buttons[buttonIndex]
          };
        }
        for(var axesIndex = 0; axesIndex < latest.axes.length; axesIndex++) {
          previous.axes[axesIndex] = current.axes[axesIndex];
          current.axes[axesIndex] = latest.axes[axesIndex];
        }
      }
    },
      _callbacks = {},
      _gamepads = [createState(),createState(),createState(),createState()],
      _prevGamepads = [createState(),createState(),createState(),createState()],
      _cachedStates = [,,,,];
      _hasSupport = !!navigator.webkitGetGamepads;
  gamepads.fn = gamepads.prototype = {
    init: function() {
      return this;
    },
    getState: function(controllerIndex) {
      var state;
      if(!_cachedStates[controllerIndex]) {
        _cachedStates[controllerIndex] = {
          buttonHeld: function(key, delta, canReset) {
            if(_gamepads[controllerIndex].buttons[key].value > 0 && _prevGamepads[controllerIndex].buttons[key].value > 0)
            {
              var isHeld = delta ? (_gamepads[controllerIndex].timestamp - _gamepads[controllerIndex].buttons[key].timestamp) >= delta : true;
              if(isHeld && canReset) {
                console.log('button:' + _gamepads[controllerIndex].buttons[key].timestamp);
                console.log('controller:' + _gamepads[controllerIndex].timestamp)
                _gamepads[controllerIndex].buttons[key].timestamp = _gamepads[controllerIndex].timestamp;
                console.log('after:' + _gamepads[controllerIndex].buttons[key].timestamp);
              }
              return isHeld;
            }
            return false;
          },
          buttonNew: function(key) {
            return _gamepads[controllerIndex] && _gamepads[controllerIndex].buttons[key] && _gamepads[controllerIndex].buttons[key].value == 1 && _prevGamepads[controllerIndex].buttons[key].value == 0;
          },
          buttonReleased: function(key) {
            return _gamepads[controllerIndex] && _gamepads[controllerIndex].buttons[key] && _gamepads[controllerIndex].buttons[key].value == 0 && _prevGamepads[controllerIndex].buttons[key].value == 1;
          },
          buttonValue: function(key) {
            return _gamepads[controllerIndex] && _gamepads[controllerIndex].buttons[key] && _gamepads[controllerIndex].buttons[key].value;
          },
          stickValue: function(stick, usePolar) {
            var x = _gamepads[controllerIndex].axes[0+(stick==0?0:2)];
            var y = _gamepads[controllerIndex].axes[1+(stick==0?0:2)];
            return {
              x: x,
              y: y,
              radial: usePolar ? math.sqrt(x*x + y*y) : undefined,
              angular: usePolar ? math.atan2(y, x) : undefined
            };
          },
          isConnected: _gamepads[controllerIndex].isConnected
        };
      }
      return _cachedStates[controllerIndex];
    },
    on: function(eventKey, callback) {
      if(!_callbacks[eventKey]) { _callbacks[eventKey] = []; }
      _callbacks[eventKey].push(callback);
      return this;
    },
    off: function(eventKey, callback) {
      if(!callback) {
        // Remove all
        _callbacks[eventKey] = [];
      } else {
        // TODO: SH - need to remove callback
      }
      return this;
    },
    update: function() {  // This mehtod needs to be cleaned up, it's LONNNNGGGG
      // Get the latest gamepads
      var latest = navigator.webkitGetGamepads();

      // Look for any connected/disconnected
      for(var index = 0; index < latest.length; index++) {
        updateGamepad(latest[index], _gamepads[index], _prevGamepads[index], index);
      }
      return this;
    },
    hasSupport: _hasSupport,
    PRESSED: 1,
    RELEASED: 0,
    LEFTSTICK: 0,
    RIGHTSTICK: 1,
    Xbox360: {
      A: 0,
      B: 1,
      X: 2,
      Y: 3,
      LB: 4,
      RB: 5,
      LT: 6,
      RT: 7,
      Select: 8,
      Start: 9,
      LeftStick: 10,
      RightStick: 11,
      DPadUp: 12,
      DPadDown: 13,
      DPadLeft: 14,
      DPadRight: 15,
      Guide: 16
    }
  };
  gamepads.fn.init.prototype = gamepads.fn;
  return (window.Gamepads = gamepads());
})(window, Math);
