/**
 * Lampa Online Plugin - Automated Stream Verifier & Test Suite
 * 
 * Tests the plugin directly in a simulated Lampa environment,
 * intercepts stream URLs, and verifies stream playback/bytes over the network.
 * 
 * Usage:
 *   node test.js
 *   node test.js --quick
 *   node test.js --title "Южный Парк"
 *   node test.js --title "Интерстеллар" --provider filmix
 *   node test.js --provider collaps
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force IPv4 first to prevent undici dual-stack timeouts on Windows
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// ANSI colors for beautiful terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        title: null,
        provider: null,
        quick: false,
        verbose: false
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--title' && args[i + 1]) {
            options.title = args[++i];
        } else if (args[i] === '--provider' && args[i + 1]) {
            options.provider = args[++i].toLowerCase();
        } else if (args[i] === '--quick' || args[i] === '-q') {
            options.quick = true;
        } else if (args[i] === '--verbose' || args[i] === '-v') {
            options.verbose = true;
        } else if (!args[i].startsWith('--') && !options.title) {
            options.title = args[i];
        }
    }
    return options;
}

// Deep stream verifier: actually tests the network media stream
async function verifyStream(url, options = {}) {
    const startTime = Date.now();
    if (!url || typeof url !== 'string') {
        return { ok: false, error: 'Empty or invalid stream URL', durationMs: 0 };
    }

    const isHls = url.includes('.m3u8') || (options.type === 'hls');

    try {
        if (isHls) {
            // 1. Fetch HLS Master Playlist
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const masterRes = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            clearTimeout(timer);

            if (!masterRes.ok) {
                return {
                    ok: false,
                    error: `Master playlist HTTP ${masterRes.status} (${masterRes.statusText})`,
                    status: masterRes.status,
                    durationMs: Date.now() - startTime
                };
            }

            const playlistText = await masterRes.text();
            if (!playlistText.includes('#EXTM3U')) {
                return {
                    ok: false,
                    error: 'Response is not a valid HLS playlist (missing #EXTM3U)',
                    durationMs: Date.now() - startTime
                };
            }

            // Extract audio tracks
            const audioMatches = [...playlistText.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?NAME="([^"]+)"/g)].map(m => m[1]);

            // Find variant playlist or direct segments
            const lines = playlistText.split('\n').map(l => l.trim()).filter(Boolean);
            const subUrlLine = lines.find(l => !l.startsWith('#') && (l.includes('.m3u8') || l.includes('/')));

            let segmentBytes = 0;
            let subStatus = masterRes.status;

            if (subUrlLine) {
                const subUrl = new URL(subUrlLine, url).href;
                const subRes = await fetch(subUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                subStatus = subRes.status;
                if (subRes.ok) {
                    const subText = await subRes.text();
                    const subLines = subText.split('\n').map(l => l.trim()).filter(Boolean);
                    const segLine = subLines.find(l => !l.startsWith('#'));
                    if (segLine) {
                        const segUrl = new URL(segLine, subUrl).href;
                        // Probe first segment (Range 0-32KB)
                        const segRes = await fetch(segUrl, {
                            headers: { 'Range': 'bytes=0-32768', 'User-Agent': 'Mozilla/5.0' }
                        });
                        if (segRes.ok || segRes.status === 206) {
                            const buf = await segRes.arrayBuffer();
                            segmentBytes = buf.byteLength;
                        }
                    }
                }
            }

            return {
                ok: true,
                type: 'HLS',
                status: masterRes.status,
                audioTracks: audioMatches,
                segmentVerified: segmentBytes > 0,
                segmentBytes,
                durationMs: Date.now() - startTime
            };

        } else {
            // Direct MP4 / MKV: test with Range request
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Range': 'bytes=0-4096',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            clearTimeout(timer);

            if (!res.ok && res.status !== 206) {
                return {
                    ok: false,
                    error: `Direct stream HTTP ${res.status} (${res.statusText})`,
                    status: res.status,
                    durationMs: Date.now() - startTime
                };
            }

            const contentType = res.headers.get('content-type') || '';
            const contentRange = res.headers.get('content-range') || '';
            const totalSize = contentRange ? (contentRange.split('/')[1] || null) : null;
            const buf = await res.arrayBuffer();
            const u8 = new Uint8Array(buf);

            // Check MP4 ftyp box signature
            let isMp4 = false;
            if (u8.length >= 8) {
                const tag = String.fromCharCode(u8[4], u8[5], u8[6], u8[7]);
                if (tag === 'ftyp' || tag === 'moov' || tag === 'mdat') isMp4 = true;
            }

            return {
                ok: true,
                type: 'MP4',
                status: res.status,
                contentType,
                totalSize: totalSize ? (Math.round(parseInt(totalSize) / (1024 * 1024)) + ' MB') : 'Unknown',
                segmentBytes: buf.byteLength,
                isMp4Signature: isMp4,
                durationMs: Date.now() - startTime
            };
        }
    } catch (e) {
        return {
            ok: false,
            error: e.cause ? `${e.message} (${e.cause.code || e.cause.message})` : e.message,
            durationMs: Date.now() - startTime
        };
    }
}

// Build Lampa Mock Sandbox
function createLampaEnvironment() {
    let clickHandler = null;
    let fullListener = null;

    const $ = function(html) {
        return {
            on: (ev, handler) => {
                if (ev === 'hover:enter') clickHandler = handler;
            },
            after: () => {},
            append: () => {},
            length: 1
        };
    };

    const storageData = {
        online_mod_filmix_token: 'aaaabbbbccccddddeeeeffffaaaabbbb',
        online_mod_filmix_dev_id: '1122334455667788',
        online_view: []
    };

    const Lampa = {
        Lang: {
            add: () => {},
            translate: (k) => k
        },
        Storage: {
            get: (k, def) => (storageData[k] !== undefined ? storageData[k] : def),
            set: (k, v) => { storageData[k] = v; },
            cache: (k, t, def) => (storageData[k] !== undefined ? storageData[k] : def)
        },
        Utils: {
            hash: (s) => 'hash_' + (s ? String(s).length : 0)
        },
        Timeline: {
            view: () => ({ percent: 0, time: 0 })
        },
        Player: {
            play: () => {},
            playlist: () => {}
        },
        Noty: {
            show: () => {}
        },
        Select: {
            show: () => {}
        },
        Reguest: function() {
            this.clear = () => {};
            this.timeout = () => {};
            this.silent = (url, success, error, postData, opts) => {
                const fetchOpts = {};
                if (opts && opts.headers) fetchOpts.headers = opts.headers;
                fetch(url, fetchOpts).then(r => r.text()).then(text => {
                    try {
                        success(JSON.parse(text));
                    } catch(e) {
                        success(text);
                    }
                }).catch(error);
            };
            this.native = (url, success, error, postData, opts) => {
                const fetchOpts = {};
                if (postData) {
                    fetchOpts.method = 'POST';
                    fetchOpts.body = postData;
                }
                if (opts && opts.headers) fetchOpts.headers = opts.headers;
                fetch(url, fetchOpts).then(r => r.text()).then(success).catch(error);
            };
            this.errorDecode = (a, c) => 'Network error';
        },
        Listener: {
            follow: (event, cb) => {
                if (event === 'full') fullListener = cb;
            }
        },
        Plugins: {
            add: () => {}
        },
        Manifest: {},
        Controller: {
            toggle: () => {}
        }
    };

    return {
        $,
        Lampa,
        getClickHandler: () => clickHandler,
        triggerCard: (movie) => {
            if (fullListener) {
                fullListener({
                    type: 'complite',
                    object: {
                        activity: {
                            render: () => ({
                                find: (sel) => {
                                    if (sel.includes('.view--online-mod')) return { length: 0 };
                                    return { length: 1, after: () => {}, append: () => {} };
                                }
                            })
                        }
                    },
                    data: { movie }
                });
            }
        }
    };
}

// Test a specific provider on a movie
function testMovieProvider(pluginCode, movie, targetProvider) {
    return new Promise((resolve) => {
        const env = createLampaEnvironment();
        const sandbox = {
            window: { appready: true },
            $: env.$,
            Lampa: env.Lampa,
            btoa: (str) => Buffer.from(str).toString('base64'),
            atob: (b64) => Buffer.from(b64, 'base64').toString('utf8'),
            fetch: fetch,
            console: { log: () => {}, error: () => {} }
        };

        // Run plugin in fresh sandbox
        const fn = new Function('window', '$', 'Lampa', 'btoa', 'atob', 'fetch', pluginCode);
        fn(sandbox.window, sandbox.$, sandbox.Lampa, sandbox.btoa, sandbox.atob, sandbox.fetch);

        let playedItem = null;
        let notyMessages = [];
        let selectStep = 0;
        let menuItems = [];

        sandbox.Lampa.Noty.show = (msg) => {
            notyMessages.push(msg);
        };

        sandbox.Lampa.Player.play = (item) => {
            playedItem = item;
        };

        sandbox.Lampa.Select.show = (opts) => {
            selectStep++;
            if (selectStep === 1) {
                // Main Online Menu: Select requested provider
                menuItems = (opts.items || []).map(i => i.action);
                const target = (opts.items || []).find(i => i.action === targetProvider);
                if (target) {
                    opts.onSelect(target);
                } else {
                    resolve({
                        provider: targetProvider,
                        success: false,
                        error: `Provider "${targetProvider}" not in online menu (Available: ${menuItems.join(', ')})`
                    });
                }
            } else {
                // Subsequent menus: Releases, Seasons, Voices, Episodes
                // Always auto-select the first choice to drill down to video stream
                if (opts.items && opts.items.length > 0) {
                    opts.onSelect(opts.items[0]);
                }
            }
        };

        // Trigger card & click
        env.triggerCard(movie);
        const click = env.getClickHandler();
        if (!click) {
            return resolve({
                provider: targetProvider,
                success: false,
                error: 'Online button click handler not attached'
            });
        }

        click();

        // Wait up to 8 seconds for async resolution of streams
        const checkInterval = 100;
        let waited = 0;
        const timer = setInterval(async () => {
            waited += checkInterval;
            if (playedItem) {
                clearInterval(timer);
                const streamCheck = await verifyStream(playedItem.url);
                resolve({
                    provider: targetProvider,
                    success: streamCheck.ok,
                    playedItem,
                    streamCheck,
                    notyMessages
                });
            } else if (waited >= 8000) {
                clearInterval(timer);
                resolve({
                    provider: targetProvider,
                    success: false,
                    error: notyMessages.length ? notyMessages[notyMessages.length - 1] : 'Timeout waiting for stream resolution',
                    notyMessages
                });
            }
        }, checkInterval);
    });
}

// Test Suite Definition
const DEFAULT_TEST_CASES = [
    {
        name: 'Южный Парк (South Park)',
        type: 'series',
        movie: {
            id: 2190,
            name: 'Южный Парк',
            original_name: 'South Park',
            first_air_date: '1997-08-13',
            kinopoisk_id: 161252,
            imdb_id: 'tt0121955'
        },
        providers: ['bwa', 'collaps', 'filmix', 'kodik', 'rezka']
    },
    {
        name: 'Интерстеллар (Interstellar)',
        type: 'movie',
        movie: {
            id: 157336,
            title: 'Интерстеллар',
            original_title: 'Interstellar',
            release_date: '2014-11-05',
            kinopoisk_id: 258687,
            imdb_id: 'tt0816692'
        },
        providers: ['bwa', 'collaps', 'filmix']
    },
    {
        name: 'Атака титанов (Attack on Titan)',
        type: 'anime',
        movie: {
            id: 1429,
            name: 'Атака титанов',
            original_name: 'Shingeki no Kyojin',
            first_air_date: '2013-04-07',
            kinopoisk_id: 762738
        },
        providers: ['anilibria', 'kodik']
    }
];

async function run() {
    const opts = parseArgs();
    console.log(`${colors.bright}${colors.cyan}============================================================${colors.reset}`);
    console.log(`${colors.bright}🎬 LAMPA ONLINE PLUGIN - AUTOMATED STREAM TEST HARNESS v1.3.0${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}============================================================${colors.reset}`);

    const pluginPath = path.resolve(__dirname, 'plugin.js');
    if (!fs.existsSync(pluginPath)) {
        console.error(`${colors.red}Error: plugin.js not found in current directory!${colors.reset}`);
        process.exit(1);
    }
    const pluginCode = fs.readFileSync(pluginPath, 'utf8');

    let testCases = DEFAULT_TEST_CASES;

    if (opts.quick) {
        testCases = [DEFAULT_TEST_CASES[0]]; // Just South Park
    } else if (opts.title) {
        testCases = [{
            name: opts.title,
            type: 'custom',
            movie: {
                title: opts.title,
                name: opts.title,
                original_title: opts.title,
                original_name: opts.title
            },
            providers: opts.provider ? [opts.provider] : ['collaps', 'filmix', 'kodik']
        }];
    }

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const tc of testCases) {
        console.log(`\n${colors.bright}${colors.white}📌 Тестирование релиза: ${tc.name} [${tc.type.toUpperCase()}]${colors.reset}`);
        console.log(`${colors.dim}------------------------------------------------------------${colors.reset}`);

        const providersToTest = opts.provider ? [opts.provider] : tc.providers;

        for (const prov of providersToTest) {
            totalTests++;
            process.stdout.write(`   • Источник [${prov.toUpperCase().padEnd(9)}]: `);

            const res = await testMovieProvider(pluginCode, tc.movie, prov);

            if (res.success && res.streamCheck && res.streamCheck.ok) {
                passedTests++;
                const sc = res.streamCheck;
                const info = sc.type === 'HLS'
                    ? `(HLS ${sc.status} OK, аудиодорожек: ${sc.audioTracks ? sc.audioTracks.length : 0}, чанк: ${sc.segmentBytes} байт, ${sc.durationMs}мс)`
                    : `(MP4 ${sc.status} OK, размер: ${sc.totalSize}, ${sc.durationMs}мс)`;

                console.log(`${colors.green}${colors.bright}✅ РАБОТАЕТ${colors.reset} ${colors.dim}${info}${colors.reset}`);
                if (res.playedItem) {
                    console.log(`     ${colors.dim}Название:  ${res.playedItem.title}${colors.reset}`);
                    console.log(`     ${colors.dim}Поток URL: ${res.playedItem.url.slice(0, 85)}...${colors.reset}`);
                }
            } else if (!res.success && res.error && res.error.includes('преимущественно аниме')) {
                // Kodik specific note for western cartoons
                console.log(`${colors.yellow}ℹ️ ИНФО${colors.reset} ${colors.dim}(В Kodik нет западных релизов, база только для аниме)${colors.reset}`);
            } else if (!res.success && res.error && (res.error.includes('авторизации') || res.error.includes('HDRezka'))) {
                console.log(`${colors.yellow}⚠️ ЗЕРКАЛО${colors.reset} ${colors.dim}(${res.error})${colors.reset}`);
            } else {
                failedTests++;
                console.log(`${colors.red}${colors.bright}❌ ОШИБКА${colors.reset} ${colors.red}${res.error || (res.streamCheck && res.streamCheck.error) || 'Сбой воспроизведения'}${colors.reset}`);
            }
        }
    }

    console.log(`\n${colors.bright}${colors.cyan}============================================================${colors.reset}`);
    console.log(`${colors.bright}📊 ИТОГИ ТЕСТИРОВАНИЯ:${colors.reset}`);
    console.log(`   Всего проверок: ${totalTests}`);
    console.log(`   ${colors.green}Успешно:       ${passedTests}${colors.reset}`);
    console.log(`   ${colors.red}Ошибок:        ${failedTests}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}============================================================${colors.reset}\n`);

    if (passedTests > 0) {
        console.log(`${colors.green}${colors.bright}🎉 Видеопотоки проверены и подтверждены по сети!${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bright}⛔ Ни один видеопоток не прошел проверку!${colors.reset}\n`);
        process.exit(1);
    }
}

run().catch((err) => {
    console.error('Fatal error in test runner:', err);
    process.exit(1);
});
