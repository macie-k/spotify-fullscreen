var defaultOptions = {};
var currentOptions = {};

class Options {
    #coverType;
    #coverSpin;
    #visibleIcons;
    #otherOptions;

    constructor(options) {
        this.#coverType = options.cover.type;
        this.#coverSpin = options.cover.spin;
        this.#visibleIcons = options.show_icons;
        this.#otherOptions = options.other_options;
    }

    static async load(defaultOptions) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(defaultOptions, (options) => {
                resolve(new Options(options));
            });
        });
    }

    attach() {
        const spinRadio = document.querySelector('input[name="cover-options"][type="checkbox"]');
        spinRadio.checked = this.#coverSpin;
        spinRadio.disabled = this.#coverType !== 'round';
        spinRadio.addEventListener('change', this.handleCoverSpin.bind(this));

        /* cover options */
        document.querySelectorAll('input[name="cover-options"][type="radio"]').forEach((input) => {
            input.checked = input.value === this.#coverType;
            input.addEventListener('change', this.handleCoverType.bind(this, spinRadio));
        });

        /* icon options */
        document.querySelectorAll('input[name="icon-options"]').forEach((input) => {
            input.checked = this.#visibleIcons.includes(input.value);

            input.addEventListener('change', this.handleIcons.bind(this));
        });

        /* other options */
        document.querySelectorAll('input[name="other-options"]').forEach((input) => {
            input.checked = this.#otherOptions[input.value];

            input.addEventListener('change', this.handleOther.bind(this));
        });
    }

    handleCoverSpin({ target }) {
        this.#coverSpin = !target.disabled && target.checked;
        this.save();
    }

    handleCoverType(spinRadio, { target }) {
        spinRadio.disabled = target.value !== 'round';
        this.#coverType = target.value;

        this.save();
    }

    handleIcons({ target }) {
        if (target.checked) {
            this.#visibleIcons.push(target.value);
        } else {
            this.#visibleIcons.splice(this.#visibleIcons.indexOf(target.value), 1);
        }

        this.save();
    }

    handleOther({ target }) {
        this.#otherOptions[target.value] = target.checked;

        this.save();
    }

    save() {
        const options = {
            cover: {
                type: this.#coverType,
                spin: this.#coverSpin,
            },
            show_icons: this.#visibleIcons,
            other_options: this.#otherOptions,
        };
        chrome.storage.sync.set(options, () => {
            console.log('Options saved: ', options);
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    defaultOptions = await fetch(chrome.runtime.getURL('/resources/config/options.json')).then(
        (res) => res.json()
    );

    const options = await Options.load(defaultOptions);
    options.attach();
});
