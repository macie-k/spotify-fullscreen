var defaultOptions = {};
var currentOptions = {};

document.addEventListener('DOMContentLoaded', async () => {
    defaultOptions = await fetch(chrome.runtime.getURL('/resources/config/options.json')).then(
        (res) => res.json()
    );

    loadSettings();
    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', handleOptionChange);
    });
});

function loadSettings() {
    chrome.storage.sync.get(defaultOptions, (options) => {
        currentOptions = options;

        /* cover options */
        document.querySelectorAll('input[name="cover-options"]').forEach((input) => {
            input.checked = input.value === options.cover.type;
            if (input.value === 'cover-spin') {
                input.checked = options.cover.spin;
                input.disabled = !document.querySelector('input[value="round"]').checked;
            }
        });

        /* icon options */
        document.querySelectorAll('input[name="icon-options"]').forEach((input) => {
            input.checked = options.show_icons.includes(input.value);
        });

        /* other options */
        document.querySelectorAll('input[name="other-options"]').forEach((input) => {
            input.checked = options[input.value];
        });
    });
}

function handleOptionChange(e) {
    const option = e.target;

    const spinRadio = document.querySelector('input[value="cover-spin"]');
    const newOptions = currentOptions;

    switch (option.type) {
        case 'radio':
            spinRadio.disabled = option.value !== 'round';
            newOptions.cover.type = option.value;
            break;

        case 'checkbox':
            switch (option.name) {
                case 'cover-options':
                    newOptions.cover.spin = !spinRadio.disabled && spinRadio.checked;
                    break;

                case 'icon-options':
                    if (option.checked) {
                        newOptions.show_icons.push(option.value);
                    } else {
                        newOptions.show_icons = newOptions.show_icons.filter(
                            (icon) => icon !== option.value
                        );
                    }
                    break;

                case 'other-options':
                    newOptions[option.value] = option.checked;
                    break;
            }
            break;
    }
    chrome.storage.sync.set(newOptions, () => {
        console.log('Options saved: ', newOptions);
    });
}
