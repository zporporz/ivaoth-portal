(function(global) {
  function formatUtcTimeInput(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length < 2) return digits;
    if (digits.length === 2) return `${digits}:`;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function isValidUtcTime(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match) return false;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  function updateValidity(input, showIncomplete) {
    const invalid = input.value
      && (showIncomplete || input.value.length === 5)
      && !isValidUtcTime(input.value);
    input.classList.toggle('input-error', Boolean(invalid));
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }

  function initializeUtcTimeInputs() {
    ['fromTime', 'toTime'].forEach(id => {
      const input = global.document.getElementById(id);
      if (!input) return;

      input.addEventListener('input', () => {
        input.value = formatUtcTimeInput(input.value);
        updateValidity(input, false);
      });

      input.addEventListener('keydown', event => {
        const atEnd = input.selectionStart === input.value.length
          && input.selectionEnd === input.value.length;
        if (event.key === 'Backspace' && atEnd && input.value.endsWith(':')) {
          event.preventDefault();
          input.value = input.value.slice(0, -2);
          updateValidity(input, false);
        }
      });

      input.addEventListener('blur', () => updateValidity(input, true));
    });
  }

  global.formatUtcTimeInput = formatUtcTimeInput;
  global.isValidUtcTime = isValidUtcTime;

  if (global.document) {
    global.addEventListener('DOMContentLoaded', initializeUtcTimeInputs);
  }
})(typeof window === 'undefined' ? globalThis : window);
