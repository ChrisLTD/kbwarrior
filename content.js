var state = {
  isHinting: false,
  allLinks: Array.prototype.slice.call(document.querySelectorAll('a')),
  currentHint: 0,
  hints: {},
  currentInput: []
};

// loosely ordered, with the 'f' key removed
var keys = [
  's', 'd', 'u', 'h', 'j', 'k', 'l', 'g', 'a', 'v', 'n', 't', 'y',
  'r', 'b', 'm', 'i', 'o', 'w', 'e', 'c', 'x', 'z', 'p', 'q'
];

// some websites immediately focus on inputs, don't add listeners yet
if (document.activeElement.tagName !== 'INPUT') {
  document.addEventListener('keydown', handleNavKeys, true);
  document.addEventListener('keydown', handleHintKey, true);
}

// dynamically remove and add listeners on focus and blur of input fields
document.querySelectorAll('input').forEach(function(el) {
  el.addEventListener('focus', function() {
    document.removeEventListener('keydown', handleNavKeys, true);
    document.removeEventListener('keydown', handleHintKey, true);
  });
  el.addEventListener('blur', function() {
    document.addEventListener('keydown', handleNavKeys, true);
    document.addEventListener('keydown', handleHintKey, true);
  });
});

/**
 * Navigational key handler
 * @param {object} e - the event
 */
function handleNavKeys(e) {
  if (e.ctrlKey || e.shiftKey || e.metaKey || e.altKey) {
    return void 0;
  }

  switch (e.which) {
    case 75: // 'k'
      window.scrollBy(0, -40);
      break;
    case 74: // 'j'
      window.scrollBy(0, 40);
      break;
    case 72: // 'h'
      window.scrollBy(-15, 0);
      break;
    case 76: // 'l'
      window.scrollBy(15, 0);
      break;
    case 68: // 'd'
      window.scrollBy(0, window.innerHeight/2);
      break;
    case 85: // 'u'
      window.scrollBy(0, -window.innerHeight/2);
      break;
    case 8: // backspace
      window.history.go(-1);
      break;
    case 78: // 'n'
      sendMessage({
        type: 'tabs',
        payload: 1
      });
      break;
    case 80: // 'p'
      sendMessage({
        type: 'tabs',
        payload: -1
      });
      break;
  }
}

/**
 * Hint key handler
 * @param {object} e - the event
 */
function handleHintKey(e) {
  if (e.which === 70 && !(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)) { // 'f'
    // add the on-screen links to the state
    state.linksInView = state.allLinks.filter(isOnScreen);

    if (!state.isHinting) {
      // add hints, disable nav keys and enable keyboard capture
      state.linksInView.forEach(addHint);
      document.removeEventListener('keydown', handleNavKeys, true);
      document.addEventListener('keydown', captureHintKeys, true);
    } else {
      // disable keyboard capture, reset hints and enable nav keys
      document.removeEventListener('keydown', captureHintKeys, true);
      state.allLinks.forEach(removeHint);
      state.currentHint = 0;
      document.addEventListener('keydown', handleNavKeys, true);
    }

    state.isHinting = !state.isHinting;
  }
}

/**
 * Keyboard capture for hint processing
 * @param {object} e - the event
 */
function captureHintKeys(e) {
  var last;

  // push the last key onto the state
  state.currentInput.push(String.fromCharCode(e.which).toLowerCase());

  // single char hints
  if (state.linksInView.length < 19) {
    last = state.currentInput[state.currentInput.length - 1];
  // double char hints
  } else {
    last = state.currentInput.slice(-2).join('');
  }

  // look for hits in the existing hints links
  // if hit, send a runtime message to background.js
  if (state.hints[last]) {
    sendMessage({
      type: 'goto',
      payload: state.hints[last]
    });
  }
}

/**
 * Determine whether a given element is in the viewport or not
 * @param {HTMLElement} el - the element
 */
function isOnScreen(el) {
  var elRect = el.getBoundingClientRect();
  var viewWidth = document.documentElement.clientWidth;
  var viewHeight = document.documentElement.clientHeight;

  return (
    (elRect.top    >= 0) &&
    (elRect.right  <= viewWidth) &&
    (elRect.bottom <= viewHeight) &&
    (elRect.left   >= 0)
  );
}

/**
 * Add a hint to a given element
 * @param {HTMLElement} el - the element
 */
function addHint(el) {
  var hintHead = getHint(state.currentHint++, state.linksInView.length);

  // wrap the element in a span
  el.innerHTML = '<span class="kbw-hint">' + hintHead + '</span>' + el.innerHTML;

  // add this hint to the state
  state.hints[hintHead] = el.href;
}

/**
 * Remove the hint for a given element
 * @param {HTMLElement} el - the element
 */
function removeHint(el) {
  el.innerHTML = el.innerHTML.replace(/^.+kbw-hint">\w+?<\/span>/, '');
}

/**
 * Calculate the name of the current hint
 * @param {number} current - the current hint position
 * @param {number} max - the total amount of hints to be created
 */
function getHint(current, max) {
  // one letter suffices
  if (max < 26) {
    return keys[current];
  // must use two letters
  } else {
    return keys[Math.floor(current / 25)] + keys[(current % 25)];
  }
}

/**
 * Send a message to background.js which has access to chrome.tabs
 * @param {object} msg - the message - has a type and a payload
 */
function sendMessage(msg) {
  chrome.runtime.sendMessage({
    from: 'content.js',
    message: msg
  });
}