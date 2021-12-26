var options = {};
var client_id = 'd882d791766e4a32969c10c265c57337';
var client_secret = '39274d1fbb84487a9e821797e310b5b1';

var infoNode = null;
var currentSong = {};
var fullscreen = false;

const waitForSongDetails = new Promise((resolve) => {
    const waiter = setInterval(() => {
        log('Waiting...');

        let container = document.querySelector('div[data-testid="now-playing-widget"]');
        if (container !== null) {
            log('Widget ready');
            infoNode = document.querySelector('a[data-testid="context-link"]');

            clearInterval(waiter);
            resolve(container);
        }
    }, 100);
});

window.addEventListener('load', async () => {
    await loadOptions();

    waitForSongDetails.then(async (container) => {
        updateCurrentSong(await getCurrentSongInfo());

        addOverlay();
        addButton(container);

        addSongObserver();
        addListeningOnObserver();
    });
});

async function loadOptions() {
    const defaultOptions = await fetch(
        chrome.runtime.getURL('/resources/config/options.json')
    ).then((res) => res.json());

    chrome.storage.sync.get(defaultOptions, (savedOptions) => {
        options = savedOptions;
    });
}

async function getCurrentSongInfo() {
    if (!localStorage.getItem('spotify_fs_token')) {
        updateLSToken(await getToken());
    }

    const ID = infoNode.href.split('track%3A')[1];
    const songInfo = await reFetch(`https://api.spotify.com/v1/tracks/${ID}`, 1)
        .then((res) => {
            return res.json();
        })
        .catch((err) => {
            log(err.message);
        });

    if (songInfo === undefined) return null;
    return {
        artists: songInfo.artists.map((artist) => artist.name),
        cover: songInfo.album.images[0].url,
        title: songInfo.name,
    };
}

async function getToken() {
    log('Requesting token');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${client_id}:${client_secret}`),
        },
        body: params.toString(),
    }).then((res) => res.json());

    return res.access_token;
}

function toggleFullscreen() {
    fullscreen = !fullscreen;
    showFullscreen(fullscreen);
}

async function showFullscreen(show) {
    const overlay = document.querySelector('.fs-overlay-container');
    hideBottomIcons(show);
    resizeOverlay();

    if (show) {
        log('Showing fullscreen');

        document.querySelector('.fs-toggle').classList.add('active');

        setFullscreenDetails();
        overlay.style.top = 0;

        if (options.hide_bottom_art) {
            setTimeout(() => {
                document.querySelector('button[aria-label="Expand"]').click();
            }, 200);
        }
    } else {
        log('Hiding fullscreen');

        document.querySelector('.fs-toggle').classList.remove('active');
        document.querySelector('button[aria-label="Collapse"]').click();

        overlay.style.top = -overlay.clientHeight + 'px';
    }
}

function updateCurrentSong(info) {
    currentSong = {
        id: infoNode.href.split('track%3A')[1],
        title: info.title,
        artists: info.artists,
        cover: info.cover,
    };
}

function setFullscreenDetails() {
    const backgrounds = document.querySelectorAll('.fs-bg');
    backgrounds.forEach((bg) => (bg.style.backgroundImage = `url('${currentSong.cover}')`));

    const cover = document.querySelector('.fs-cover');
    cover.src = currentSong.cover;
    cover.classList.add(options.cover.type);
    if (options.cover.spin) {
        cover.classList.add('spin');
    }
}

function hideBottomIcons(hide) {
    const icons = {
        heart: document.querySelector('button[aria-label="Save to Your Library"]'),
        remove: document.querySelector('button[aria-label="Remove"]'),
        pip: document.querySelector('button[data-testid="pip-toggle-button"]'),
        lyrics: document.querySelector('button[aria-label="Lyrics"]'),
        queue: document.querySelector('button[aria-label="Queue"]').parentElement,
        devices: document.querySelector('svg[aria-label="Connect to a device"]').parentElement,
        mute: document.querySelector('button[aria-label="Mute"]'),
    };

    for (let icon in icons) {
        const el = icons[icon];
        if (el && !options.show_icons.includes(icon)) {
            el.style.display = hide ? 'none' : 'block';

            if (icon === 'devices') {
                if (document.querySelector('.encore-bright-accent-set')) {
                    document.querySelector(
                        '.encore-bright-accent-set'
                    ).parentElement.style.display = hide ? 'none' : 'block';
                }
            }
        }
    }
}

/* set localStorage token information */
function updateLSToken(token) {
    localStorage.setItem('spotify_fs_token', token);
}

/* inject overlay HTML */
function addOverlay() {
    fetch(chrome.runtime.getURL('/src/html/fullscreen.html'))
        .then((r) => r.text())
        .then((html) => {
            const overlay = document.createElement('div');
            overlay.innerHTML = html;
            overlay.className = 'fs-overlay-container';
            overlay.style.top = '-' + overlay.style.height;

            document.body.insertBefore(overlay, document.body.firstChild);
            resizeOverlay();
        });
}

/* inject toggle-button HTML */
function addButton(container) {
    fetch(chrome.runtime.getURL('/src/html/button.html'))
        .then((r) => r.text())
        .then((html) => {
            const button = document.createElement('div');
            button.innerHTML = html;
            button.addEventListener('click', toggleFullscreen);

            container.appendChild(button);
            log('Button added');
        });
}

/* set overlay size */
function resizeOverlay() {
    document.querySelector('.fs-overlay-container').style.height = `calc(100vh - ${
        document.querySelector('.Root__now-playing-bar').clientHeight
    }px)`;
}

/* detect "Listening on ..." div changes */
function addListeningOnObserver() {
    const targetNode = document.querySelector('.Root__now-playing-bar > footer');
    const observer = new MutationObserver(resizeOverlay);

    observer.observe(targetNode, { childList: true });
}

/* detect song changes */
function addSongObserver() {
    const observer = new MutationObserver(async () => {
        log(`Song changed: ${currentSong.title}`);
        updateCurrentSong(await getCurrentSongInfo());
        setFullscreenDetails();
    });

    observer.observe(infoNode, { attributes: true });
}

/* retry token generation when outdated or not present */
async function reFetch(url, retries) {
    return fetch(url, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('spotify_fs_token')}`,
        },
    }).then(async (res) => {
        if (res.ok) return res;
        if (retries > 0) {
            if (res.status === 401) {
                const newToken = await getToken();
                localStorage.setItem('spotify_fs_token', newToken);
            }
            return reFetch(url, retries - 1);
        }
        throw new Error(res.status === 401 ? 'Could not authenticate' : 'Error getting response');
    });
}

function log(val) {
    if (options.enable_logging) {
        console.log('[Spotify FS]: ', val);
    }
}
