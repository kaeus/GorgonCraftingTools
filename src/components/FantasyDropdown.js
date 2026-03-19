// FantasyDropdown.js
// Reusable custom dropdown component for dark fantasy theme

export class FantasyDropdown {
  constructor({
    container,
    options,
    value,
    onChange,
    placeholder = 'Select...',
    dropdownClass = '',
    optionClass = '',
    arrowSvg = '',
  }) {
    this.container = container;
    this.options = options;
    this.value = value;
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.dropdownClass = dropdownClass;
    this.optionClass = optionClass;
    this.arrowSvg = arrowSvg ||
      `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7L9 12L14 7" stroke="#d6c3a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    this.isOpen = false;
    this.selectedIndex = options.findIndex(opt => opt.value === value);
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const dropdown = document.createElement('div');
    dropdown.className = `fantasy-dropdown ${this.dropdownClass}`;
    dropdown.tabIndex = 0;
    dropdown.setAttribute('role', 'button');
    dropdown.setAttribute('aria-haspopup', 'listbox');
    dropdown.setAttribute('aria-expanded', this.isOpen);

    // Selected value
    const selected = document.createElement('div');
    selected.className = 'fantasy-dropdown-selected';
    // Show placeholder style if value is empty string or null
    if (this.selectedIndex < 0 || this.options[this.selectedIndex].value === '') {
      selected.innerHTML =
        `<span class="placeholder-text">${this.placeholder}</span>` +
        `<span class="fantasy-dropdown-arrow">${this.arrowSvg}</span>`;
      selected.classList.add('placeholder');
    } else {
      selected.innerHTML =
        `<span class="selected-text">${this.options[this.selectedIndex].label}</span>` +
        `<span class="fantasy-dropdown-arrow">${this.arrowSvg}</span>`;
      selected.classList.remove('placeholder');
    }
    dropdown.appendChild(selected);

    // Options list
    const list = document.createElement('div');
    list.className = 'fantasy-dropdown-list';
    list.style.display = this.isOpen ? 'block' : 'none';
    list.setAttribute('role', 'listbox');
    this.options.forEach((opt, idx) => {
      const option = document.createElement('div');
      option.className = `fantasy-dropdown-option ${this.optionClass}`;
      option.setAttribute('role', 'option');
      option.setAttribute('data-value', opt.value);
      option.innerText = opt.label;
      if (idx === this.selectedIndex) option.classList.add('selected');
      option.addEventListener('mousedown', e => {
        e.preventDefault();
        this.selectedIndex = idx;
        this.value = opt.value;
        this.isOpen = false;
        this.render();
        if (this.onChange) this.onChange(opt.value);
      });
      list.appendChild(option);
    });
    dropdown.appendChild(list);

    // Toggle open/close
    selected.addEventListener('mousedown', e => {
      e.preventDefault();
      this.isOpen = !this.isOpen;
      this.render();
    });
    // Close on blur
    dropdown.addEventListener('blur', () => {
      this.isOpen = false;
      this.render();
    });

    this.container.appendChild(dropdown);
  }
}

// Usage example:
// new FantasyDropdown({
//   container: document.getElementById('dropdown-slot'),
//   options: [ { value: 'a', label: 'Option A' }, ... ],
//   value: 'a',
//   onChange: v => { ... },
// });
