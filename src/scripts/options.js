const settings = {
    cover: {
        type: 'square',
        spin: false,
    },
    show_icons: ['heart', 'mute'],
    hide_bottom_art: false,
    enable_logging: false,
};

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', handleOptionChange);
    });
});

function loadSettings() {
    chrome.storage.sync.get(
        {
            cover: {
                type: 'square',
                spin: false,
            },
            show_icons: ['heart', 'mute'],
            hide_bottom_art: false,
        },
        (settings) => {
            /* cover options */
            document.querySelectorAll('input[name="cover-options"]').forEach((input) => {
                input.checked = input.value === settings.cover.type;
                if (input.value === 'cover-spin') {
                    input.checked = settings.cover.spin;
                }
            });

            /* icon options */
            document.querySelectorAll('input[name="icon-options"]').forEach((input) => {
                input.checked = settings.show_icons.includes(input.value);
            });

            /* other options */
            document.querySelectorAll('input[name="other-options"]').forEach((input) => {
                input.checked = settings[input.value];
            });
        }
    );
}

function handleOptionChange(e) {
    const option = e.target;
    const spinRadio = document.querySelector('input[value="cover-spin"]');

    switch (option.type) {
        case 'radio':
            spinRadio.disabled = option.value !== 'round';
            settings.cover.type = option.value;
            break;

        case 'checkbox':
            switch (option.name) {
                case 'cover-options':
                    settings.cover.spin = !spinRadio.disabled && spinRadio.checked;
                    break;

                case 'icon-options':
                    if (option.checked) {
                        settings.show_icons.push(option.value);
                    } else {
                        settings.show_icons = settings.show_icons.filter(
                            (icon) => icon !== option.value
                        );
                    }
                    break;

                case 'other-options':
                    settings[option.value] = option.checked;
                    break;
            }
            break;
    }
    chrome.storage.sync.set(settings, () => {
        console.log('Options saved: ', settings);
    });
}
