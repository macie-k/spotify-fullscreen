var infoNode = null;
var currentSong = {};
var client_id = 'd882d791766e4a32969c10c265c57337';
var client_secret = '39274d1fbb84487a9e821797e310b5b1';

var fullscreen = false;

const waitForBar = new Promise((resolve) => {
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

window.addEventListener('load', () => {
    addOverlay();

    waitForBar.then((container) => {
        infoNode = document.querySelector('a[data-testid="context-link"]');

        addButton(container);
        addSongObserver();
    });
});

function addSongObserver() {
    const observer = new MutationObserver(async () => {
        const info = await getCurrentSongInfo();
        currentSong = {
            id: infoNode.href.split('track%3A')[1],
            title: info.title,
            artists: info.artists,
            cover: info.cover,
        };
        log('SONG CHANGED: ', currentSong);
    });

    observer.observe(infoNode, { attributes: true });
}

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

async function getCurrentSongInfo() {
    if (!localStorage.getItem('spotify_fs_token')) {
        localStorage.setItem('spotify_fs_token', await getToken());
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

// document.querySelector('a[data-testid="context-link"]')
async function showFullscreen(show) {
    const overlay = document.querySelector('.fs-overlay-container');

    if (show) {
        log('Showing fullscreen');
        overlay.style.top = '0px';
    } else {
        log('Hiding fullscreen');
        overlay.style.top = window.innerHeight + 'px';
    }
}

function addOverlay() {
    fetch(chrome.runtime.getURL('/src/html/fsView.html'))
        .then((r) => r.text())
        .then((html) => {
            const overlay = document.createElement('div');
            overlay.innerHTML = html;
            overlay.className = 'fs-overlay-container';
            overlay.style.top = window.innerHeight + 'px';

            //addOverlayListeners();

            document.body.appendChild(overlay);
        });
}

function addButton(container) {
    fetch(chrome.runtime.getURL('/src/html/toggleButton.html'))
        .then((r) => r.text())
        .then((html) => {
            const button = document.createElement('div');
            button.innerHTML = html;
            button.addEventListener('click', toggleFullscreen);

            container.appendChild(button);
            log('Button added');
        });
}

function log(val, val2 = '') {
    console.log('[Spotify FS]: ', val, val2);
}
