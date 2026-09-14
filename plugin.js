(function () {
    'use strict';

    if (window.plugin_online_mod_ready) return;
    window.plugin_online_mod_ready = true;

    var PLUGIN_NAME = 'Online Mod';
    var PLUGIN_VERSION = '1.3.0';
    var KODIK_TOKEN_DEFAULT = '41dd95f84c21719b09d6c71182237a25';
    var TEST_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    var CORS_PROXIES = [
        'https://cors.nb557.workers.dev/',
        'https://cors.fx666.workers.dev/'
    ];

    // Инициализация локализации
    function initLang() {
        if (!Lampa.Lang) {
            var lang_data = {};
            Lampa.Lang = {
                add: function (data) { lang_data = data; },
                translate: function (key) { return lang_data[key] ? lang_data[key].ru : key; }
            };
        }

        Lampa.Lang.add({
            online_mod_title: {
                ru: 'Онлайн',
                en: 'Online',
                uk: 'Онлайн'
            },
            online_mod_watch: {
                ru: 'Смотреть онлайн',
                en: 'Watch online',
                uk: 'Дивитися онлайн'
            },
            online_mod_sources: {
                ru: 'Источники онлайн',
                en: 'Online Sources',
                uk: 'Джерела онлайн'
            },
            online_mod_collaps: {
                ru: '⚡ Collaps (HLS, Paramount, Кубик, Rezka, LostFilm)',
                en: '⚡ Collaps (HLS, Paramount, Kubik, Rezka, LostFilm)',
                uk: '⚡ Collaps (HLS, Paramount, Кубик, Rezka, LostFilm)'
            },
            online_mod_collaps_desc: {
                ru: 'Прямые HLS (.m3u8) потоки, все сезоны и дорожки без авторизации',
                en: 'Direct HLS (.m3u8) streams, all seasons and dubs without auth',
                uk: 'Прямі HLS (.m3u8) потоки, всі сезони та доріжки без авторизації'
            },
            online_mod_filmix: {
                ru: '🎞️ Filmix (Фильмы, сериалы, 4K/1080p)',
                en: '🎞️ Filmix (Movies, Series, 4K/1080p)',
                uk: '🎞️ Filmix (Фільми, серіали, 4K/1080p)'
            },
            online_mod_filmix_desc: {
                ru: 'Огромная база фильмов и сериалов в Full HD и 4K (все сезоны, озвучки)',
                en: 'Huge library of movies and series in Full HD and 4K (all seasons, dubs)',
                uk: 'Величезна база фільмів та серіалів у Full HD та 4K (всі сезони, озвучки)'
            },
            online_mod_rezka: {
                ru: '🌐 HDRezka (Каталог и зеркала)',
                en: '🌐 HDRezka (Catalog & Mirrors)',
                uk: '🌐 HDRezka (Каталог та дзеркала)'
            },
            online_mod_rezka_desc: {
                ru: 'Каталог озвучек HDRezka (зеркала kvk.zone / rezka.ag)',
                en: 'HDRezka catalog and mirrors',
                uk: 'Каталог озвучок HDRezka'
            },
            online_mod_test_player: {
                ru: '🔧 Диагностика плеера (демо Big Buck Bunny)',
                en: '🔧 Player Diagnostics (demo Big Buck Bunny)',
                uk: '🔧 Діагностика плеєра (демо Big Buck Bunny)'
            },
            online_mod_test_player_desc: {
                ru: 'Тестовое демо-видео HLS для проверки работы плеера на ТВ (не относится к фильму)',
                en: 'Test demo HLS video to verify TV player compatibility (not the movie)',
                uk: 'Тестове демо-відео HLS для перевірки роботи плеєра на ТВ (не стосується фільму)'
            },
            online_mod_anilibria: {
                ru: '🎌 AniLibria (Аниме, озвучка AniLibria HLS)',
                en: '🎌 AniLibria (Anime, AniLibria voice HLS)',
                uk: '🎌 AniLibria (Аніме, озвучка AniLibria HLS)'
            },
            online_mod_kodik: {
                ru: '🎬 Kodik (Аниме, дорамы, сериалы)',
                en: '🎬 Kodik (Anime, Doramas, Series)',
                uk: '🎬 Kodik (Аніме, дорами, серіали)'
            },
            online_mod_searching: {
                ru: 'Поиск видеопотока...',
                en: 'Searching for video stream...',
                uk: 'Пошук відеопотоку...'
            },
            online_mod_not_found: {
                ru: 'В источнике ничего не найдено по названию',
                en: 'Nothing found for title in this source',
                uk: 'У джерелі нічого не знайдено за назвою'
            },
            online_mod_select_episode: {
                ru: 'Выберите серию',
                en: 'Select episode',
                uk: 'Оберіть серію'
            },
            online_mod_select_voice: {
                ru: 'Выберите озвучку',
                en: 'Select translation / voice',
                uk: 'Оберіть озвучку'
            },
            online_mod_select_season: {
                ru: 'Выберите сезон',
                en: 'Select season',
                uk: 'Оберіть сезон'
            },
            online_mod_select_release: {
                ru: 'Выберите релиз',
                en: 'Select release',
                uk: 'Оберіть реліз'
            },
            online_mod_error_extract: {
                ru: 'Не удалось извлечь прямой видеопоток',
                en: 'Failed to extract direct video stream',
                uk: 'Не вдалося отримати прямий відеопотік'
            }
        });
    }

    // Вспомогательные функции
    var Utils = {
        getMovieTitle: function (movie) {
            return (movie && (movie.title || movie.name)) || '';
        },
        getMovieOrigTitle: function (movie) {
            return (movie && (movie.original_title || movie.original_name)) || '';
        },
        getMovieYear: function (movie) {
            if (!movie) return 0;
            var d = movie.release_date || movie.first_air_date || movie.last_air_date || movie.year || '';
            return parseInt(String(d).slice(0, 4)) || 0;
        },
        cleanTitle: function (str) {
            return (str || '').replace(/[\s.,:;’'`!?()\[\]\-_\\/]+/g, ' ').trim();
        },
        normalizeTitle: function (str) {
            return this.cleanTitle((str || '').toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
        },
        randomHex: function (len) {
            var s = '';
            var hex = '0123456789abcdef';
            for (var i = 0; i < (len || 16); i++) {
                s += hex[Math.floor(Math.random() * 16)];
            }
            return s;
        },
        isTitleMatch: function (itemTitle, itemOrigTitle, targetTitle, targetOrigTitle, itemYear, targetYear) {
            var normItemRu = Utils.normalizeTitle(itemTitle);
            var normItemEn = Utils.normalizeTitle(itemOrigTitle);
            var normTargetRu = Utils.normalizeTitle(targetTitle);
            var normTargetEn = Utils.normalizeTitle(targetOrigTitle);

            if (itemYear && targetYear) {
                var y1 = parseInt(itemYear);
                var y2 = parseInt(targetYear);
                if (y1 && y2 && Math.abs(y1 - y2) > 1) {
                    return false;
                }
            }

            if (normTargetRu && (normItemRu === normTargetRu || normItemEn === normTargetRu)) return true;
            if (normTargetEn && (normItemEn === normTargetEn || normItemRu === normTargetEn)) return true;

            function hasWords(source, target) {
                if (!source || !target) return false;
                var targetWords = target.split(' ').filter(function (w) { return w.length > 1; });
                if (!targetWords.length) return false;
                return targetWords.every(function (w) {
                    return source.indexOf(w) !== -1;
                });
            }

            if (normTargetRu && normTargetRu.length > 2) {
                if (hasWords(normItemRu, normTargetRu) || hasWords(normItemEn, normTargetRu)) return true;
            }
            if (normTargetEn && normTargetEn.length > 2) {
                if (hasWords(normItemEn, normTargetEn) || hasWords(normItemRu, normTargetEn)) return true;
            }

            return false;
        },
        decodeRot18: function (str) {
            if (!str) return '';
            if (str.indexOf('http') === 0 || str.indexOf('//') === 0) return str;
            try {
                var replaced = str.replace(/[a-zA-Z]/g, function (x) {
                    return String.fromCharCode((x <= 'Z' ? 90 : 122) >= (x = x.charCodeAt(0) + 18) ? x : x - 26);
                });
                return atob(replaced);
            } catch (e) {
                return str;
            }
        },
        fixLinkProtocol: function (link) {
            if (!link) return '';
            if (link.indexOf('//') === 0) {
                return (window.location.protocol === 'https:' ? 'https:' : 'http:') + link;
            }
            return link;
        },
        buildCardHash: function (movie, extra) {
            var orig = Utils.getMovieOrigTitle(movie) || Utils.getMovieTitle(movie) || '';
            return Lampa.Utils.hash(orig + (extra || ''));
        },
        markViewed: function (hash) {
            var viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash) === -1) {
                viewed.push(hash);
                Lampa.Storage.set('online_view', viewed);
            }
        },
        isViewed: function (hash) {
            var viewed = Lampa.Storage.cache('online_view', 5000, []);
            return viewed.indexOf(hash) !== -1;
        },
        encodeBase64: function (str) {
            if (typeof btoa === 'function') return btoa(str);
            if (typeof Buffer !== 'undefined') return Buffer.from(str).toString('base64');
            return str;
        },
        buildProxyUrl: function (url, filename, proxyIndex, customParam) {
            if (!url) return '';
            var baseHost = CORS_PROXIES[proxyIndex || 0] || CORS_PROXIES[0];
            var prefix = customParam ? (customParam + '/') : '';
            var enc = encodeURIComponent(Utils.encodeBase64(prefix + url));
            var name = filename || 'api';
            return baseHost + 'enc2/' + enc + '/' + name + '?jacred.test';
        },
        requestWithProxyFallback: function (targetUrl, filename, onSuccess, onError, customParam) {
            var network = new Lampa.Reguest();
            var proxy0 = Utils.buildProxyUrl(targetUrl, filename, 0, customParam);

            network.clear();
            network.timeout(12000);
            network.silent(proxy0, function (res) {
                var parsed = Utils.parseJson(res);
                if (parsed) {
                    onSuccess(parsed);
                } else if (typeof res === 'string' && res.length > 5 && res.indexOf('<html') === -1) {
                    onSuccess(res);
                } else {
                    tryFallback();
                }
            }, function () {
                tryFallback();
            });

            function tryFallback() {
                var proxy1 = Utils.buildProxyUrl(targetUrl, filename, 1, customParam);
                network.clear();
                network.timeout(12000);
                network.silent(proxy1, function (res2) {
                    var parsed2 = Utils.parseJson(res2);
                    if (parsed2) {
                        onSuccess(parsed2);
                    } else if (typeof res2 === 'string' && res2.length > 5) {
                        onSuccess(res2);
                    } else {
                        onError('Ошибка ответа прокси сервера');
                    }
                }, function (a, c) {
                    onError('Прокси сервер недоступен: ' + network.errorDecode(a, c));
                });
            }
        },
        parseJson: function (data) {
            if (typeof data === 'object' && data !== null) return data;
            if (typeof data === 'string') {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return null;
                }
            }
            return null;
        },
        countKeys: function (obj) {
            if (!obj) return 0;
            if (Array.isArray(obj)) return obj.length;
            if (typeof obj === 'string') {
                var p = Utils.parseJson(obj);
                if (p) return Utils.countKeys(p);
                return 0;
            }
            if (typeof obj === 'object') {
                var c = 0;
                for (var k in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, k)) c++;
                }
                return c;
            }
            return 0;
        }
    };

    // ==========================================
    // 1. Диагностический тестовый HLS поток
    // ==========================================
    function playTestHls(movie) {
        Lampa.Noty.show('Запуск тестового видео (Big Buck Bunny)...');

        var testStreams = {
            '1080p': TEST_STREAM_URL,
            '720p': TEST_STREAM_URL,
            '480p': TEST_STREAM_URL
        };

        var hash = Utils.buildCardHash(movie, '_test_stream');
        var view = Lampa.Timeline.view(hash);

        var first = {
            url: TEST_STREAM_URL,
            title: 'Диагностика плеера - Тестовый поток HLS',
            quality: testStreams,
            timeline: view
        };

        Lampa.Player.play(first);
        Lampa.Player.playlist([first]);
    }

    // ==========================================
    // 2. AniLibria API источник
    // ==========================================
    var AniLibria = {
        search: function (movie, onComplete, onError) {
            var network = new Lampa.Reguest();
            var title = Utils.getMovieTitle(movie);
            var orig = Utils.getMovieOrigTitle(movie);
            var query = title || orig;

            if (!query) {
                onError('Не указано название для поиска аниме');
                return;
            }

            var cleanQuery = Utils.cleanTitle(query);
            var searchUrl = 'https://api.anilibria.app/api/v1/anime/releases/search?query=' + encodeURIComponent(cleanQuery);

            network.clear();
            network.timeout(12000);
            network.silent(searchUrl, function (res) {
                var releases = (res && res.data) || [];
                if (releases.length > 0) {
                    AniLibria.filterMatches(releases, movie, onComplete, onError);
                } else {
                    if (orig && orig !== title) {
                        var fbUrl = 'https://api.anilibria.app/api/v1/anime/releases/search?query=' + encodeURIComponent(Utils.cleanTitle(orig));
                        network.clear();
                        network.timeout(12000);
                        network.silent(fbUrl, function (fbRes) {
                            var fbReleases = (fbRes && fbRes.data) || [];
                            if (fbReleases.length > 0) {
                                AniLibria.filterMatches(fbReleases, movie, onComplete, onError);
                            } else {
                                onError('На AniLibria релиз "' + query + '" не найден (в базе только аниме)');
                            }
                        }, function () {
                            onError('На AniLibria релиз "' + query + '" не найден (в базе только аниме)');
                        });
                    } else {
                        onError('На AniLibria релиз "' + query + '" не найден (в базе только аниме)');
                    }
                }
            }, function (a, c) {
                onError('AniLibria API недоступен: ' + network.errorDecode(a, c));
            });
        },

        filterMatches: function (releases, movie, onComplete, onError) {
            var targetTitle = Utils.getMovieTitle(movie);
            var targetOrig = Utils.getMovieOrigTitle(movie);
            var targetYear = Utils.getMovieYear(movie);

            var matched = releases.filter(function (rel) {
                var ru = rel.name && rel.name.main;
                var en = rel.name && rel.name.english;
                var alt = rel.name && rel.name.alternative;
                var itemYear = rel.year || 0;

                return Utils.isTitleMatch(ru, en, targetTitle, targetOrig, itemYear, targetYear) ||
                       Utils.isTitleMatch(ru, alt, targetTitle, targetOrig, itemYear, targetYear);
            });

            if (!matched.length) {
                onError('На AniLibria релиз "' + (targetTitle || targetOrig) + '" не найден (в базе только аниме)');
                return;
            }

            if (matched.length === 1) {
                AniLibria.loadReleaseDetails(matched[0].id, movie, onComplete, onError);
            } else {
                var items = matched.map(function (rel) {
                    var rName = rel.name && rel.name.main || 'Релиз';
                    var epTotal = rel.episodes_total ? (' | ' + rel.episodes_total + ' эп.') : '';
                    return {
                        title: rName + (rel.year ? (' (' + rel.year + ')') : ''),
                        subtitle: (rel.name && rel.name.english || '') + epTotal,
                        releaseId: rel.id
                    };
                });

                Lampa.Select.show({
                    title: Lampa.Lang.translate('online_mod_select_release'),
                    items: items,
                    onSelect: function (sel) {
                        AniLibria.loadReleaseDetails(sel.releaseId, movie, onComplete, onError);
                    },
                    onBack: function () {
                        openOnlineMenu(movie);
                    }
                });
            }
        },

        loadReleaseDetails: function (releaseId, movie, onComplete, onError) {
            var network = new Lampa.Reguest();
            var url = 'https://api.anilibria.app/api/v1/anime/releases/' + releaseId;
            network.clear();
            network.timeout(12000);
            network.silent(url, function (release) {
                if (release && release.episodes && release.episodes.length) {
                    onComplete(release);
                } else {
                    onError('У релиза AniLibria нет доступных серий');
                }
            }, function (a, c) {
                onError('Ошибка загрузки серий AniLibria: ' + network.errorDecode(a, c));
            });
        },

        playRelease: function (release, movie, startIndex) {
            startIndex = startIndex || 0;
            var episodes = release.episodes;
            var playlist = [];

            episodes.forEach(function (ep, idx) {
                var qMap = {};
                if (ep.hls_1080) qMap['1080p'] = ep.hls_1080;
                if (ep.hls_720) qMap['720p'] = ep.hls_720;
                if (ep.hls_480) qMap['480p'] = ep.hls_480;

                var defaultStream = ep.hls_1080 || ep.hls_720 || ep.hls_480;
                var epNum = ep.ordinal !== undefined ? ep.ordinal : (idx + 1);
                var epTitle = (ep.name ? ('Серия ' + epNum + ' - ' + ep.name) : ('Серия ' + epNum)) + ' / AniLibria';

                var hash = Utils.buildCardHash(movie, '_anilibria_s1_e' + epNum);
                var view = Lampa.Timeline.view(hash);

                playlist.push({
                    url: defaultStream,
                    title: (release.name && release.name.main || Utils.getMovieTitle(movie)) + ' - ' + epTitle,
                    quality: qMap,
                    timeline: view,
                    episode: epNum
                });
            });

            var currentItem = playlist[startIndex] || playlist[0];
            var currentHash = Utils.buildCardHash(movie, '_anilibria_s1_e' + (currentItem.episode || (startIndex + 1)));
            Utils.markViewed(currentHash);

            Lampa.Player.play(currentItem);
            Lampa.Player.playlist(playlist);
        }
    };

    // ==========================================
    // 3. Kodik API источник
    // ==========================================
    var Kodik = {
        getToken: function () {
            return Lampa.Storage.get('online_mod_kodik_token', KODIK_TOKEN_DEFAULT);
        },

        search: function (movie, onComplete, onError) {
            var network = new Lampa.Reguest();
            var token = Kodik.getToken();
            var title = Utils.getMovieTitle(movie);
            var orig = Utils.getMovieOrigTitle(movie);
            var kp_id = movie.kinopoisk_id || movie.kp_id;
            var imdb_id = movie.imdb_id;
            var targetYear = Utils.getMovieYear(movie);

            var params = 'token=' + token + '&limit=50&with_episodes=true';
            if (kp_id) params += '&kinopoisk_id=' + encodeURIComponent(kp_id);
            else if (imdb_id) params += '&imdb_id=' + encodeURIComponent(imdb_id);
            else if (title) params += '&title=' + encodeURIComponent(title);
            else if (orig) params += '&title=' + encodeURIComponent(orig);
            else {
                onError('Не указано название или идентификатор для Kodik');
                return;
            }

            var url = 'https://kodik-api.com/search?' + params;
            network.clear();
            network.timeout(15000);
            network.silent(url, function (res) {
                var rawList = res && res.results ? res.results : [];
                Kodik.filterStrict(rawList, movie, targetYear, onComplete, function () {
                    if (orig && orig !== title) {
                        var fbUrl = 'https://kodik-api.com/search?token=' + token + '&limit=50&with_episodes=true&title=' + encodeURIComponent(orig);
                        network.clear();
                        network.timeout(15000);
                        network.silent(fbUrl, function (fbRes) {
                            var fbList = fbRes && fbRes.results ? fbRes.results : [];
                            Kodik.filterStrict(fbList, movie, targetYear, onComplete, function () {
                                onError('В базе Kodik релиз "' + (title || orig) + '" не найден (Kodik содержит преимущественно аниме и дорамы)');
                            });
                        }, function () {
                            onError('В базе Kodik релиз "' + (title || orig) + '" не найден (Kodik содержит преимущественно аниме и дорамы)');
                        });
                    } else {
                        onError('В базе Kodik релиз "' + (title || orig) + '" не найден (Kodik содержит преимущественно аниме и дорамы)');
                    }
                });
            }, function (a, c) {
                onError('Kodik API недоступен: ' + network.errorDecode(a, c));
            });
        },

        filterStrict: function (results, movie, targetYear, onComplete, onEmpty) {
            var targetTitle = Utils.getMovieTitle(movie);
            var targetOrig = Utils.getMovieOrigTitle(movie);

            var filtered = results.filter(function (r) {
                return Utils.isTitleMatch(r.title, r.title_orig, targetTitle, targetOrig, r.year, targetYear);
            });

            if (filtered.length) {
                onComplete(filtered);
            } else {
                onEmpty();
            }
        },

        extractStream: function (link, onStream, onError) {
            var fullUrl = Utils.fixLinkProtocol(link);
            var proxiedUrl = CORS_PROXIES[0] + fullUrl;
            var network = new Lampa.Reguest();
            network.clear();
            network.timeout(15000);

            network.native(proxiedUrl, function (html) {
                html = (html || '').replace(/\n/g, '');

                var d = html.match(/var domain = "([^"]+)";/);
                var d_sign = html.match(/var d_sign = "([^"]+)";/);
                var pd = html.match(/var pd = "([^"]+)";/);
                var pd_sign = html.match(/var pd_sign = "([^"]+)";/);
                var ref = html.match(/var ref = "([^"]*)";/);
                var ref_sign = html.match(/var ref_sign = "([^"]*)";/);
                var type = html.match(/var type = "([^"]+)";/);
                var videoId = html.match(/var videoId = "([^"]+)";/);
                var hash = html.match(/var hash = "([^"]+)";/) || fullUrl.match(/\/video\/\d+\/([a-f0-9]+)\//) || fullUrl.match(/\/serial\/\d+\/([a-f0-9]+)\//);

                if (!videoId || !hash) {
                    onError('Не удалось определить идентификатор видео в плеере');
                    return;
                }

                var postData = 'd=' + encodeURIComponent(d ? d[1] : 'kodikplayer.com') +
                    '&d_sign=' + encodeURIComponent(d_sign ? d_sign[1] : '') +
                    '&pd=' + encodeURIComponent(pd ? pd[1] : 'kodikplayer.com') +
                    '&pd_sign=' + encodeURIComponent(pd_sign ? pd_sign[1] : '') +
                    '&ref=' + encodeURIComponent(ref ? ref[1] : '') +
                    '&ref_sign=' + encodeURIComponent(ref_sign ? ref_sign[1] : '') +
                    '&bad_user=true' +
                    '&cdn_is_working=true' +
                    '&type=' + encodeURIComponent(type ? type[1] : 'video') +
                    '&hash=' + encodeURIComponent(hash ? hash[1] : '') +
                    '&id=' + encodeURIComponent(videoId[1]) +
                    '&info=%7B%7D';

                var gviUrl = CORS_PROXIES[0] + 'https://kodikplayer.com/ftor';
                network.clear();
                network.timeout(15000);

                network.native(gviUrl, function (data) {
                    var parsed = null;
                    try {
                        parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    } catch (e) {}

                    if (parsed && parsed.links) {
                        var qualityMap = {};
                        var bestUrl = '';
                        var availableQualities = Object.keys(parsed.links).sort(function (a, b) {
                            return parseInt(b) - parseInt(a);
                        });

                        availableQualities.forEach(function (qKey) {
                            var itemArr = parsed.links[qKey];
                            if (itemArr && itemArr.length && itemArr[0].src) {
                                var decoded = Utils.decodeRot18(itemArr[0].src);
                                decoded = Utils.fixLinkProtocol(decoded);
                                qualityMap[qKey + 'p'] = decoded;
                                if (!bestUrl) bestUrl = decoded;
                            }
                        });

                        if (bestUrl) {
                            onStream(bestUrl, qualityMap);
                        } else {
                            onError(Lampa.Lang.translate('online_mod_error_extract'));
                        }
                    } else {
                        onError(Lampa.Lang.translate('online_mod_error_extract'));
                    }
                }, function () {
                    onError(Lampa.Lang.translate('online_mod_error_extract'));
                }, postData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
            }, function () {
                onError('Ошибка подключения к Kodik через прокси');
            });
        }
    };

    // ==========================================
    // 4. Filmix API источник
    // ==========================================
    var Filmix = {
        getToken: function () {
            var userToken = Lampa.Storage.get('online_mod_filmix_token', '') || Lampa.Storage.get('filmix_token', '');
            return userToken || 'aaaabbbbccccddddeeeeffffaaaabbbb';
        },

        getDevId: function () {
            var devId = Lampa.Storage.get('online_mod_filmix_dev_id', '');
            if (!devId) {
                devId = Utils.randomHex(16);
                Lampa.Storage.set('online_mod_filmix_dev_id', devId);
            }
            return devId;
        },

        getApiParams: function () {
            return '?user_dev_id=' + Filmix.getDevId() +
                   '&user_dev_name=Xiaomi' +
                   '&user_dev_token=' + Filmix.getToken() +
                   '&user_dev_vendor=Xiaomi' +
                   '&user_dev_os=14' +
                   '&user_dev_apk=2.2.0' +
                   '&app_lang=ru-rRU';
        },

        formatStreamUrl: function (link, quality) {
            if (!link) return '';
            var clean = link;
            if (clean.indexOf('%s') !== -1) {
                clean = clean.replace('%s', quality);
            } else if (/\[[^\]]+\]/.test(clean)) {
                clean = clean.replace(/\[[^\]]+\]/, quality);
            }
            return clean;
        },

        extractQualities: function (item) {
            if (!item) return [1080, 720, 480];
            if (item.qualities && Array.isArray(item.qualities) && item.qualities.length) {
                return item.qualities.map(function (q) { return parseInt(q); }).filter(Boolean).sort(function (a, b) { return b - a; });
            }
            if (item.link) {
                var match = item.link.match(/\[([0-9, ]+)\]/);
                if (match) {
                    var parts = match[1].split(',').map(function (s) { return parseInt(s.trim()); }).filter(Boolean);
                    if (parts.length) return parts.sort(function (a, b) { return b - a; });
                }
            }
            return [1080, 720, 480];
        },

        search: function (movie, onComplete, onError) {
            var title = Utils.getMovieTitle(movie);
            var orig = Utils.getMovieOrigTitle(movie);
            var query = title || orig;
            var targetYear = Utils.getMovieYear(movie);
            var filmixParam = 'param/User-Agent=' + encodeURIComponent('okhttp/3.10.0');

            if (!query) {
                onError('Не указано название для поиска на Filmix');
                return;
            }

            var searchApiUrl = 'http://filmixapp.cyou/api/v2/search' + Filmix.getApiParams() + '&story=' + encodeURIComponent(Utils.cleanTitle(query));

            Utils.requestWithProxyFallback(searchApiUrl, 'search', function (results) {
                var list = Array.isArray(results) ? results : [];
                Filmix.filterStrict(list, movie, targetYear, onComplete, function () {
                    if (orig && orig !== title) {
                        var fbApiUrl = 'http://filmixapp.cyou/api/v2/search' + Filmix.getApiParams() + '&story=' + encodeURIComponent(Utils.cleanTitle(orig));
                        Utils.requestWithProxyFallback(fbApiUrl, 'search', function (fbRes) {
                            var fbList = Array.isArray(fbRes) ? fbRes : [];
                            Filmix.filterStrict(fbList, movie, targetYear, onComplete, function () {
                                onError('На Filmix релиз "' + (title || orig) + '" не найден');
                            });
                        }, function () {
                            onError('На Filmix релиз "' + (title || orig) + '" не найден');
                        }, filmixParam);
                    } else {
                        onError('На Filmix релиз "' + (title || orig) + '" не найден');
                    }
                });
            }, function (errMsg) {
                onError('Filmix недоступен: ' + errMsg);
            }, filmixParam);
        },

        filterStrict: function (list, movie, targetYear, onComplete, onNoStrict) {
            var targetTitle = Utils.getMovieTitle(movie);
            var targetOrig = Utils.getMovieOrigTitle(movie);

            var matched = list.filter(function (item) {
                var itemTitle = item.title || '';
                var itemOrig = item.original_title || '';
                var itemYear = item.year || 0;

                return Utils.isTitleMatch(itemTitle, itemOrig, targetTitle, targetOrig, itemYear, targetYear);
            });

            var normTarget = Utils.normalizeTitle(targetTitle);
            var exacts = matched.filter(function (item) {
                return Utils.normalizeTitle(item.title) === normTarget || Utils.normalizeTitle(item.original_title) === normTarget;
            });

            if (exacts.length > 0) {
                onComplete(exacts);
            } else if (matched.length > 0) {
                onComplete(matched);
            } else {
                onNoStrict();
            }
        },

        loadDetails: function (postId, onComplete, onError) {
            var postApiUrl = 'http://filmixapp.cyou/api/v2/post/' + postId + Filmix.getApiParams();
            var filmixParam = 'param/User-Agent=' + encodeURIComponent('okhttp/3.10.0');

            Utils.requestWithProxyFallback(postApiUrl, 'post', function (post) {
                if (typeof post === 'string') post = Utils.parseJson(post) || {};
                if (post && post.post) post = post.post;
                if (post && post.data) post = post.data;

                var pl = (post && post.player_links) || {};
                if (typeof pl === 'string') pl = Utils.parseJson(pl) || {};

                var playlist = pl.playlist;
                if (typeof playlist === 'string') playlist = Utils.parseJson(playlist) || {};

                var movieData = pl.movie;
                if (typeof movieData === 'string') movieData = Utils.parseJson(movieData) || [];

                post.player_links = {
                    playlist: playlist || {},
                    movie: movieData || []
                };

                onComplete(post);
            }, function (errMsg) {
                onError('Ошибка загрузки данных с Filmix: ' + errMsg);
            }, filmixParam);
        }
    };

    // ==========================================
    // 5. Collaps API источник (HLS, мульти-аудио)
    // ==========================================
    var Collaps = {
        getKpId: function (movie, callback) {
            if (movie.kinopoisk_id || movie.kp_id) {
                return callback(movie.kinopoisk_id || movie.kp_id);
            }
            var query = Utils.getMovieTitle(movie);
            if (!query) return callback(null);

            var network = new Lampa.Reguest();
            var url = 'https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=' + encodeURIComponent(Utils.cleanTitle(query));
            network.clear();
            network.timeout(8000);
            network.silent(url, function (res) {
                res = Utils.parseJson(res);
                var films = (res && res.films) || [];
                var targetTitle = Utils.getMovieTitle(movie);
                var targetOrig = Utils.getMovieOrigTitle(movie);
                var targetYear = Utils.getMovieYear(movie);
                var match = films.find(function (f) {
                    return Utils.isTitleMatch(f.nameRu, f.nameEn, targetTitle, targetOrig, f.year, targetYear);
                }) || films[0];

                var foundId = match ? match.filmId : null;
                if (foundId) {
                    movie.kinopoisk_id = foundId;
                }
                callback(foundId);
            }, function () {
                callback(null);
            }, false, {
                headers: {
                    'X-API-KEY': 'c20595a1-3d8c-4cbd-92eb-fd7b0fa75c67'
                }
            });
        },

        search: function (movie, onComplete, onError) {
            var imdb_id = movie.imdb_id;
            var kp_id = movie.kinopoisk_id || movie.kp_id;

            function fetchCollaps(apiPath, fallbackApiPath, onDone, onFail) {
                var mirrors = [
                    'https://api.kinogram.best/embed/' + apiPath,
                    'https://api.ortified.ws/embed/' + apiPath
                ];
                var mIdx = 0;

                function nextMirror() {
                    if (mIdx >= mirrors.length) {
                        if (fallbackApiPath) {
                            return fetchCollaps(fallbackApiPath, null, onDone, onFail);
                        }
                        return onFail();
                    }

                    var currentUrl = mirrors[mIdx++];
                    var network = new Lampa.Reguest();
                    network.clear();
                    network.timeout(8000);
                    network.native(currentUrl, function (html) {
                        if (typeof html !== 'string') html = String(html || '');
                        var match = html.match(/makePlayer\(({.*?})\);/s);
                        if (match) {
                            try {
                                var json = eval('(' + match[1] + ')');
                                if (json && (json.playlist || json.source || json.hls)) {
                                    return onDone(json);
                                }
                            } catch (e) {}
                        }
                        nextMirror();
                    }, function () {
                        nextMirror();
                    });
                }

                nextMirror();
            }

            if (kp_id) {
                var fbPath = imdb_id ? ('imdb/' + imdb_id) : null;
                fetchCollaps('kp/' + kp_id, fbPath, onComplete, function () {
                    onError('В Collaps видеопотоки для этого релиза не найдены');
                });
            } else if (imdb_id) {
                fetchCollaps('imdb/' + imdb_id, null, onComplete, function () {
                    Collaps.getKpId(movie, function (foundKp) {
                        if (foundKp) {
                            fetchCollaps('kp/' + foundKp, null, onComplete, function () {
                                onError('В Collaps видеопотоки для этого релиза не найдены');
                            });
                        } else {
                            onError('В Collaps видеопотоки для этого релиза не найдены');
                        }
                    });
                });
            } else {
                Collaps.getKpId(movie, function (foundKp) {
                    if (foundKp) {
                        fetchCollaps('kp/' + foundKp, null, onComplete, function () {
                            onError('В Collaps видеопотоки для этого релиза не найдены');
                        });
                    } else {
                        onError('Не удалось определить Кинопоиск или IMDB ID для Collaps');
                    }
                });
            }
        }
    };

    // ==========================================
    // 6. HDRezka источник
    // ==========================================
    var Rezka = {
        getMirror: function () {
            var mirror = Lampa.Storage.get('online_mod_rezka_mirror', '') || 'https://kvk.zone';
            if (mirror.indexOf('://') === -1) mirror = 'https://' + mirror;
            if (mirror.slice(-1) === '/') mirror = mirror.slice(0, -1);
            return mirror;
        },

        search: function (movie, onComplete, onError) {
            var query = Utils.getMovieTitle(movie) || Utils.getMovieOrigTitle(movie);
            if (!query) return onError('Не указано название для поиска на HDRezka');

            var mirror = Rezka.getMirror();
            var searchUrl = mirror + '/search/?do=search&subaction=search&q=' + encodeURIComponent(Utils.cleanTitle(query));

            Utils.requestWithProxyFallback(searchUrl, 'rezka_search', function (html) {
                if (typeof html !== 'string') html = String(html || '');
                if (html.indexOf('check-form') !== -1 || html.indexOf('<title>Вход</title>') !== -1) {
                    return onError('HDRezka требует авторизации на зеркале ' + mirror + '. Рекомендуется использовать Collaps (все озвучки HDRezka доступны без авторизации).');
                }

                var regex = /<div class="b-content__inline_item"[^>]*data-id="(\d+)"[^>]*>[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<div>([^<]*)<\/div>/g;
                var match;
                var list = [];
                while ((match = regex.exec(html)) !== null) {
                    list.push({
                        id: match[1],
                        link: match[2],
                        title: match[3],
                        info: match[4]
                    });
                }

                if (list.length) {
                    onComplete(list);
                } else {
                    onError('В HDRezka релиз не найден');
                }
            }, function (errMsg) {
                onError('Ошибка подключения к HDRezka: ' + errMsg);
            });
        }
    };

    // ==========================================
    // UI: Меню «Онлайн» источников
    // ==========================================
    function openOnlineMenu(movie) {
        var movieTitle = Utils.getMovieTitle(movie);
        var items = [
            {
                title: Lampa.Lang.translate('online_mod_collaps'),
                subtitle: Lampa.Lang.translate('online_mod_collaps_desc'),
                action: 'collaps'
            },
            {
                title: Lampa.Lang.translate('online_mod_filmix'),
                subtitle: Lampa.Lang.translate('online_mod_filmix_desc'),
                action: 'filmix'
            },
            {
                title: Lampa.Lang.translate('online_mod_kodik'),
                subtitle: 'Каталог аниме, дорам и сериалов',
                action: 'kodik'
            },
            {
                title: Lampa.Lang.translate('online_mod_rezka'),
                subtitle: Lampa.Lang.translate('online_mod_rezka_desc'),
                action: 'rezka'
            },
            {
                title: Lampa.Lang.translate('online_mod_anilibria'),
                subtitle: 'Быстрый доступ к аниме релизам (AniLibria HLS)',
                action: 'anilibria'
            },
            {
                title: Lampa.Lang.translate('online_mod_test_player'),
                subtitle: Lampa.Lang.translate('online_mod_test_player_desc'),
                action: 'test_hls'
            }
        ];

        Lampa.Select.show({
            title: movieTitle ? (movieTitle + ' - ' + Lampa.Lang.translate('online_mod_sources')) : Lampa.Lang.translate('online_mod_sources'),
            items: items,
            onSelect: function (a) {
                if (a.action === 'collaps') {
                    handleCollaps(movie);
                } else if (a.action === 'filmix') {
                    handleFilmix(movie);
                } else if (a.action === 'kodik') {
                    handleKodik(movie);
                } else if (a.action === 'rezka') {
                    handleRezka(movie);
                } else if (a.action === 'anilibria') {
                    handleAniLibria(movie);
                } else if (a.action === 'test_hls') {
                    playTestHls(movie);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // ==========================================
    // Обработка Collaps
    // ==========================================
    function handleCollaps(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Collaps.search(movie, function (data) {
            if (data.playlist && data.playlist.seasons && data.playlist.seasons.length) {
                showCollapsSeries(data, movie);
            } else if (data.source || data.hls) {
                playCollapsMovie(data, movie);
            } else {
                Lampa.Noty.show('В Collaps нет доступных видеопотоков для релиза');
            }
        }, function (err) {
            Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_not_found'));
        });
    }

    function showCollapsSeries(data, movie) {
        var seasons = data.playlist.seasons.slice().sort(function (a, b) {
            return parseInt(a.season) - parseInt(b.season);
        });

        if (seasons.length === 1) {
            selectCollapsEpisode(data, seasons[0], movie);
            return;
        }

        var items = seasons.map(function (s) {
            return {
                title: 'Сезон ' + s.season,
                subtitle: 'Серий: ' + (s.episodes ? s.episodes.length : 0),
                seasonObj: s
            };
        });

        Lampa.Select.show({
            title: Utils.getMovieTitle(movie) + ' - ' + Lampa.Lang.translate('online_mod_select_season'),
            items: items,
            onSelect: function (sel) {
                selectCollapsEpisode(data, sel.seasonObj, movie);
            },
            onBack: function () {
                openOnlineMenu(movie);
            }
        });
    }

    function selectCollapsEpisode(data, seasonObj, movie) {
        var episodes = seasonObj.episodes || [];
        if (!episodes.length) {
            Lampa.Noty.show('В этом сезоне нет серий');
            return;
        }

        var items = episodes.map(function (ep, idx) {
            var epNum = ep.episode || (idx + 1);
            var epHash = Utils.buildCardHash(movie, '_collaps_s' + seasonObj.season + '_e' + epNum);
            var isSeen = Utils.isViewed(epHash);
            var audios = ep.audio && ep.audio.names ? ep.audio.names.join(', ') : 'Стандарт';

            return {
                title: (isSeen ? '✓ ' : '') + 'Серия ' + epNum + (ep.title ? (' - ' + ep.title) : ''),
                subtitle: 'Озвучки: ' + audios,
                index: idx
            };
        });

        Lampa.Select.show({
            title: 'Сезон ' + seasonObj.season + ' - ' + Lampa.Lang.translate('online_mod_select_episode'),
            items: items,
            onSelect: function (sel) {
                playCollapsSeries(data, seasonObj, sel.index, movie);
            },
            onBack: function () {
                showCollapsSeries(data, movie);
            }
        });
    }

    function playCollapsSeries(data, seasonObj, startIndex, movie) {
        var episodes = seasonObj.episodes || [];
        var playlist = [];
        var mainTitle = Utils.getMovieTitle(movie);

        episodes.forEach(function (ep, idx) {
            var epNum = ep.episode || (idx + 1);
            var hash = Utils.buildCardHash(movie, '_collaps_s' + seasonObj.season + '_e' + epNum);
            var view = Lampa.Timeline.view(hash);
            var streamUrl = ep.hls || (ep.dash ? ep.dash : '');
            var audios = ep.audio && ep.audio.names ? (' (' + ep.audio.names.slice(0, 3).join(', ') + ')') : '';

            playlist.push({
                url: streamUrl,
                title: mainTitle + ' - S' + seasonObj.season + 'E' + epNum + audios,
                timeline: view,
                episode: parseInt(epNum)
            });
        });

        var currentItem = playlist[startIndex] || playlist[0];
        var curEpNum = episodes[startIndex] ? (episodes[startIndex].episode || (startIndex + 1)) : 1;
        var curHash = Utils.buildCardHash(movie, '_collaps_s' + seasonObj.season + '_e' + curEpNum);
        Utils.markViewed(curHash);

        Lampa.Player.play(currentItem);
        Lampa.Player.playlist(playlist);
    }

    function playCollapsMovie(data, movie) {
        var streamUrl = (data.source && data.source.hls) || data.hls || (data.source && data.source.dash) || '';
        if (!streamUrl) {
            Lampa.Noty.show('Не найдена ссылка на видеопоток в Collaps');
            return;
        }

        var audios = (data.source && data.source.audio && data.source.audio.names) ? (' (' + data.source.audio.names.slice(0, 3).join(', ') + ')') : '';
        var hash = Utils.buildCardHash(movie, '_collaps_movie');
        var view = Lampa.Timeline.view(hash);
        Utils.markViewed(hash);

        var item = {
            url: streamUrl,
            title: Utils.getMovieTitle(movie) + audios,
            timeline: view
        };

        Lampa.Player.play(item);
        Lampa.Player.playlist([item]);
    }

    // ==========================================
    // Обработка HDRezka
    // ==========================================
    function handleRezka(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Rezka.search(movie, function (results) {
            var items = results.map(function (res) {
                return {
                    title: res.title,
                    subtitle: res.info || 'HDRezka релиз',
                    item: res
                };
            });

            Lampa.Select.show({
                title: Utils.getMovieTitle(movie) + ' - HDRezka',
                items: items,
                onSelect: function () {
                    Lampa.Noty.show('Для мгновенного просмотра без авторизации используйте Collaps (все озвучки HDRezka доступны там)');
                },
                onBack: function () {
                    openOnlineMenu(movie);
                }
            });
        }, function (err) {
            Lampa.Noty.show(err);
        });
    }

    // ==========================================
    // Обработка Filmix
    // ==========================================
    function handleFilmix(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Filmix.search(movie, function (results) {
            if (!results.length) {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            if (results.length === 1) {
                loadFilmixPostDetails(results[0].id, movie, results[0].title);
            } else {
                var items = results.map(function (res) {
                    var isSerial = res.last_episode || (res.categories && res.categories.indexOf('Мультсериалы') !== -1) || (res.categories && res.categories.indexOf('Сериалы') !== -1);
                    var extra = isSerial ? (' | Сериал' + (res.last_episode && res.last_episode.season ? (', ' + res.last_episode.season + ' сез.') : '')) : ' | Фильм';
                    return {
                        title: res.title + (res.year ? (' (' + res.year + ')') : ''),
                        subtitle: (res.original_title || '') + extra + (res.quality ? (' | ' + res.quality) : ''),
                        postId: res.id,
                        resTitle: res.title
                    };
                });

                Lampa.Select.show({
                    title: Utils.getMovieTitle(movie) + ' - ' + Lampa.Lang.translate('online_mod_select_release'),
                    items: items,
                    onSelect: function (sel) {
                        loadFilmixPostDetails(sel.postId, movie, sel.resTitle);
                    },
                    onBack: function () {
                        openOnlineMenu(movie);
                    }
                });
            }
        }, function (err) {
            Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_not_found'));
        });
    }

    function loadFilmixPostDetails(postId, movie, releaseTitle) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Filmix.loadDetails(postId, function (post) {
            var pl = (post && post.player_links) || {};
            var playlist = pl.playlist || {};
            var movieData = pl.movie || [];

            var hasPlaylist = Utils.countKeys(playlist) > 0;
            var hasMovie = Utils.countKeys(movieData) > 0;

            if (hasPlaylist) {
                showFilmixSeries(post, movie, releaseTitle);
            } else if (hasMovie) {
                showFilmixMovie(post, movie, releaseTitle);
            } else {
                Lampa.Noty.show('На Filmix нет доступных видеопотоков (попробуйте Collaps)');
            }
        }, function (err) {
            Lampa.Noty.show(err || 'Ошибка загрузки релиза Filmix');
        });
    }

    function showFilmixSeries(post, movie, releaseTitle) {
        var playlist = (post.player_links && post.player_links.playlist) || {};
        var seasonKeys = Object.keys(playlist).sort(function (a, b) {
            return parseInt(a) - parseInt(b);
        });

        if (!seasonKeys.length) {
            Lampa.Noty.show('Сезоны не найдены');
            return;
        }

        if (seasonKeys.length === 1) {
            selectFilmixTranslation(post, seasonKeys[0], movie, releaseTitle);
            return;
        }

        var seasonItems = seasonKeys.map(function (sKey) {
            var transObj = playlist[sKey] || {};
            var transCount = Utils.countKeys(transObj);
            return {
                title: 'Сезон ' + sKey,
                subtitle: 'Переводов / озвучек: ' + transCount,
                seasonKey: sKey
            };
        });

        Lampa.Select.show({
            title: (releaseTitle || post.title || Utils.getMovieTitle(movie)) + ' - ' + Lampa.Lang.translate('online_mod_select_season'),
            items: seasonItems,
            onSelect: function (sel) {
                selectFilmixTranslation(post, sel.seasonKey, movie, releaseTitle);
            },
            onBack: function () {
                openOnlineMenu(movie);
            }
        });
    }

    function selectFilmixTranslation(post, seasonKey, movie, releaseTitle) {
        var seasonObj = (post.player_links.playlist || {})[seasonKey] || {};
        var transKeys = Object.keys(seasonObj);

        if (!transKeys.length) {
            Lampa.Noty.show('Озвучки для этого сезона не найдены');
            return;
        }

        if (transKeys.length === 1) {
            selectFilmixEpisode(post, seasonKey, transKeys[0], movie, releaseTitle);
            return;
        }

        var transItems = transKeys.map(function (tKey) {
            var epObj = seasonObj[tKey] || {};
            var epCount = Utils.countKeys(epObj);
            return {
                title: tKey,
                subtitle: 'Доступно серий: ' + epCount,
                transKey: tKey
            };
        });

        Lampa.Select.show({
            title: 'Сезон ' + seasonKey + ' - ' + Lampa.Lang.translate('online_mod_select_voice'),
            items: transItems,
            onSelect: function (sel) {
                selectFilmixEpisode(post, seasonKey, sel.transKey, movie, releaseTitle);
            },
            onBack: function () {
                showFilmixSeries(post, movie, releaseTitle);
            }
        });
    }

    function selectFilmixEpisode(post, seasonKey, transKey, movie, releaseTitle) {
        var seasonObj = (post.player_links.playlist || {})[seasonKey] || {};
        var epObj = seasonObj[transKey] || {};
        var isArray = Array.isArray(epObj);
        var epKeys = isArray
            ? epObj.map(function (item, idx) { return String(idx + 1); })
            : Object.keys(epObj).sort(function (a, b) { return parseInt(a) - parseInt(b); });

        if (!epKeys.length) {
            Lampa.Noty.show('Серии не найдены');
            return;
        }

        var epItems = epKeys.map(function (eKey) {
            var epData = isArray ? epObj[parseInt(eKey) - 1] : epObj[eKey];
            var epHash = Utils.buildCardHash(movie, '_filmix_s' + seasonKey + '_e' + eKey + '_' + transKey);
            var isSeen = Utils.isViewed(epHash);
            var quals = Filmix.extractQualities(epData);

            return {
                title: (isSeen ? '✓ ' : '') + 'Серия ' + eKey,
                subtitle: transKey + ' | ' + quals.map(function (q) { return q + 'p'; }).join(' / '),
                epKey: eKey
            };
        });

        Lampa.Select.show({
            title: 'Сезон ' + seasonKey + ' (' + transKey + ') - ' + Lampa.Lang.translate('online_mod_select_episode'),
            items: epItems,
            onSelect: function (sel) {
                playFilmixEpisode(post, seasonKey, transKey, epKeys, sel.epKey, movie, releaseTitle);
            },
            onBack: function () {
                selectFilmixTranslation(post, seasonKey, movie, releaseTitle);
            }
        });
    }

    function playFilmixEpisode(post, seasonKey, transKey, epKeys, startEpKey, movie, releaseTitle) {
        var seasonObj = (post.player_links.playlist || {})[seasonKey] || {};
        var epObj = seasonObj[transKey] || {};
        var isArray = Array.isArray(epObj);
        var playlist = [];
        var startIndex = 0;
        var mainTitle = releaseTitle || post.title || Utils.getMovieTitle(movie);

        epKeys.forEach(function (eKey, idx) {
            if (eKey === startEpKey) startIndex = idx;
            var epData = (isArray ? epObj[parseInt(eKey) - 1] : epObj[eKey]) || {};
            var quals = Filmix.extractQualities(epData);
            var qualityMap = {};

            quals.forEach(function (q) {
                qualityMap[q + 'p'] = Filmix.formatStreamUrl(epData.link, q);
            });

            var defaultStream = qualityMap['1080p'] || qualityMap['720p'] || qualityMap['480p'] || qualityMap[Object.keys(qualityMap)[0]];
            var hash = Utils.buildCardHash(movie, '_filmix_s' + seasonKey + '_e' + eKey + '_' + transKey);
            var view = Lampa.Timeline.view(hash);

            playlist.push({
                url: defaultStream,
                title: mainTitle + ' - S' + seasonKey + 'E' + eKey + ' (' + transKey + ')',
                quality: qualityMap,
                timeline: view,
                episode: parseInt(eKey) || (idx + 1)
            });
        });

        var currentItem = playlist[startIndex] || playlist[0];
        var currentHash = Utils.buildCardHash(movie, '_filmix_s' + seasonKey + '_e' + startEpKey + '_' + transKey);
        Utils.markViewed(currentHash);

        Lampa.Player.play(currentItem);
        Lampa.Player.playlist(playlist);
    }

    function showFilmixMovie(post, movie, releaseTitle) {
        var rawMovie = (post.player_links && post.player_links.movie) || [];
        var transList = [];

        if (Array.isArray(rawMovie)) {
            transList = rawMovie;
        } else if (typeof rawMovie === 'object' && rawMovie !== null) {
            Object.keys(rawMovie).forEach(function (k) {
                transList.push(rawMovie[k]);
            });
        }

        transList = transList.filter(function (t) {
            return t && t.link;
        });

        if (!transList.length) {
            Lampa.Noty.show('Нет доступных видеопотоков для фильма');
            return;
        }

        if (transList.length === 1) {
            playFilmixMovie(post, transList[0], movie, releaseTitle);
            return;
        }

        var transItems = transList.map(function (tItem, idx) {
            var quals = Filmix.extractQualities(tItem);
            return {
                title: tItem.translation || ('Вариант озвучки ' + (idx + 1)),
                subtitle: 'Качество: ' + quals.map(function (q) { return q + 'p'; }).join(' / '),
                tItem: tItem
            };
        });

        Lampa.Select.show({
            title: (releaseTitle || post.title || Utils.getMovieTitle(movie)) + ' - ' + Lampa.Lang.translate('online_mod_select_voice'),
            items: transItems,
            onSelect: function (sel) {
                playFilmixMovie(post, sel.tItem, movie, releaseTitle);
            },
            onBack: function () {
                openOnlineMenu(movie);
            }
        });
    }

    function playFilmixMovie(post, tItem, movie, releaseTitle) {
        var quals = Filmix.extractQualities(tItem);
        var qualityMap = {};

        quals.forEach(function (q) {
            qualityMap[q + 'p'] = Filmix.formatStreamUrl(tItem.link, q);
        });

        var defaultStream = qualityMap['1080p'] || qualityMap['720p'] || qualityMap['480p'] || qualityMap[Object.keys(qualityMap)[0]];
        var voiceName = tItem.translation || 'Filmix';
        var hash = Utils.buildCardHash(movie, '_filmix_movie_' + voiceName);
        var view = Lampa.Timeline.view(hash);
        Utils.markViewed(hash);

        var item = {
            url: defaultStream,
            title: (releaseTitle || post.title || Utils.getMovieTitle(movie)) + ' (' + voiceName + ')',
            quality: qualityMap,
            timeline: view
        };

        Lampa.Player.play(item);
        Lampa.Player.playlist([item]);
    }

    // ==========================================
    // Обработка AniLibria
    // ==========================================
    function handleAniLibria(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        AniLibria.search(movie, function (release) {
            var episodes = release.episodes || [];
            if (!episodes.length) {
                Lampa.Noty.show('У релиза нет доступных серий');
                return;
            }

            if (episodes.length === 1) {
                AniLibria.playRelease(release, movie, 0);
            } else {
                var epItems = episodes.map(function (ep, idx) {
                    var epNum = ep.ordinal !== undefined ? ep.ordinal : (idx + 1);
                    var epHash = Utils.buildCardHash(movie, '_anilibria_s1_e' + epNum);
                    var isSeen = Utils.isViewed(epHash);

                    return {
                        title: (isSeen ? '✓ ' : '') + 'Серия ' + epNum + (ep.name ? (' - ' + ep.name) : ''),
                        subtitle: 'AniLibria | 1080p / 720p / 480p' + (ep.duration ? (' | ' + Math.round(ep.duration / 60) + ' мин.') : ''),
                        index: idx
                    };
                });

                Lampa.Select.show({
                    title: (release.name && release.name.main || Utils.getMovieTitle(movie)) + ' - ' + Lampa.Lang.translate('online_mod_select_episode'),
                    items: epItems,
                    onSelect: function (selected) {
                        AniLibria.playRelease(release, movie, selected.index);
                    },
                    onBack: function () {
                        openOnlineMenu(movie);
                    }
                });
            }
        }, function (err) {
            Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_not_found'));
        });
    }

    // ==========================================
    // Обработка Kodik
    // ==========================================
    function handleKodik(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Kodik.search(movie, function (results) {
            if (!results.length) {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            var voiceItems = results.map(function (res, idx) {
                var voiceName = res.translation ? (res.translation.title || 'Стандартная озвучка') : 'Оригинал';
                var voiceType = res.translation && res.translation.type ? (' (' + res.translation.type + ')') : '';
                var isSerial = res.type && (res.type.indexOf('serial') !== -1 || res.seasons_count > 0);
                var epCountInfo = isSerial ? (' | Сезонов: ' + (res.seasons_count || 1) + ', Серий: ' + (res.episodes_count || '?')) : ' | Фильм';

                return {
                    title: voiceName + voiceType,
                    subtitle: (res.title || Utils.getMovieTitle(movie)) + (res.year ? (' (' + res.year + ')') : '') + epCountInfo,
                    raw: res,
                    index: idx
                };
            });

            if (voiceItems.length === 1 && !voiceItems[0].raw.seasons) {
                playKodikItem(voiceItems[0].raw, movie, voiceItems[0].title);
            } else {
                Lampa.Select.show({
                    title: Utils.getMovieTitle(movie) + ' - ' + Lampa.Lang.translate('online_mod_select_voice'),
                    items: voiceItems,
                    onSelect: function (selVoice) {
                        var chosen = selVoice.raw;
                        if (chosen.seasons) {
                            selectKodikSeason(chosen, movie, selVoice.title);
                        } else {
                            playKodikItem(chosen, movie, selVoice.title);
                        }
                    },
                    onBack: function () {
                        openOnlineMenu(movie);
                    }
                });
            }
        }, function (err) {
            Lampa.Noty.show(err || Lampa.Lang.translate('online_mod_not_found'));
        });
    }

    function selectKodikSeason(chosen, movie, voiceTitle) {
        var seasonsKeys = Object.keys(chosen.seasons || {});
        if (!seasonsKeys.length) {
            playKodikItem(chosen, movie, voiceTitle);
            return;
        }

        if (seasonsKeys.length === 1) {
            selectKodikEpisode(chosen, seasonsKeys[0], movie, voiceTitle);
            return;
        }

        var seasonItems = seasonsKeys.map(function (sKey) {
            var epObj = chosen.seasons[sKey].episodes || {};
            var count = Object.keys(epObj).length;
            return {
                title: 'Сезон ' + sKey,
                subtitle: 'Серий доступно: ' + count,
                seasonKey: sKey
            };
        });

        Lampa.Select.show({
            title: (chosen.title || Utils.getMovieTitle(movie)) + ' - ' + Lampa.Lang.translate('online_mod_select_season'),
            items: seasonItems,
            onSelect: function (selSeason) {
                selectKodikEpisode(chosen, selSeason.seasonKey, movie, voiceTitle);
            },
            onBack: function () {
                handleKodik(movie);
            }
        });
    }

    function selectKodikEpisode(chosen, seasonKey, movie, voiceTitle) {
        var season = chosen.seasons[seasonKey];
        var epObj = season && season.episodes ? season.episodes : {};
        var epKeys = Object.keys(epObj);

        if (!epKeys.length) {
            Lampa.Noty.show('В этом сезоне нет доступных серий');
            return;
        }

        var epItems = epKeys.map(function (epKey) {
            var epHash = Utils.buildCardHash(movie, '_kodik_s' + seasonKey + '_e' + epKey);
            var isSeen = Utils.isViewed(epHash);
            return {
                title: (isSeen ? '✓ ' : '') + 'Серия ' + epKey,
                subtitle: voiceTitle,
                link: epObj[epKey],
                epKey: epKey
            };
        });

        Lampa.Select.show({
            title: 'Сезон ' + seasonKey + ' - ' + Lampa.Lang.translate('online_mod_select_episode'),
            items: epItems,
            onSelect: function (selEp) {
                var hash = Utils.buildCardHash(movie, '_kodik_s' + seasonKey + '_e' + selEp.epKey);
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

                Kodik.extractStream(selEp.link, function (bestUrl, qualityMap) {
                    Utils.markViewed(hash);
                    var item = {
                        url: bestUrl,
                        title: (chosen.title || Utils.getMovieTitle(movie)) + ' - S' + seasonKey + 'E' + selEp.epKey + ' (' + voiceTitle + ')',
                        quality: qualityMap,
                        timeline: Lampa.Timeline.view(hash)
                    };
                    Lampa.Player.play(item);
                    Lampa.Player.playlist([item]);
                }, function (errMsg) {
                    Lampa.Noty.show(errMsg || Lampa.Lang.translate('online_mod_error_extract'));
                });
            },
            onBack: function () {
                selectKodikSeason(chosen, movie, voiceTitle);
            }
        });
    }

    function playKodikItem(chosen, movie, voiceTitle) {
        var hash = Utils.buildCardHash(movie, '_kodik_movie');
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Kodik.extractStream(chosen.link, function (bestUrl, qualityMap) {
            Utils.markViewed(hash);
            var item = {
                url: bestUrl,
                title: (chosen.title || Utils.getMovieTitle(movie)) + ' (' + voiceTitle + ')',
                quality: qualityMap,
                timeline: Lampa.Timeline.view(hash)
            };
            Lampa.Player.play(item);
            Lampa.Player.playlist([item]);
        }, function (errMsg) {
            Lampa.Noty.show(errMsg || Lampa.Lang.translate('online_mod_error_extract'));
        });
    }

    // ==========================================
    // Встраивание кнопки в карточку фильма
    // ==========================================
    function addButtonToMovieCard() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var activityRender = e.object.activity.render();
                var movie = e.data.movie;

                if (activityRender.find('.view--online-mod').length) return;

                var buttonHtml = '<div class="full-start__button selector view--online-mod" style="margin-left: 0.5em;">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="margin-right: 0.5em; vertical-align: middle;">' +
                        '<path d="M8 5v14l11-7z"/>' +
                    '</svg>' +
                    '<span>' + Lampa.Lang.translate('online_mod_title') + '</span>' +
                '</div>';

                var button = $(buttonHtml);

                button.on('hover:enter', function () {
                    openOnlineMenu(movie);
                });

                var torrentBtn = activityRender.find('.view--torrent');
                if (torrentBtn.length) {
                    torrentBtn.after(button);
                } else {
                    var container = activityRender.find('.full-start-new__buttons, .full-start__buttons');
                    if (container.length) {
                        container.append(button);
                    }
                }
            }
        });
    }

    // ==========================================
    // Настройки плагина в Lampa
    // ==========================================
    function initSettings() {
        if (Lampa.Params && Lampa.Params.select) {
            Lampa.Params.select('online_mod_kodik_token', '', KODIK_TOKEN_DEFAULT);
            Lampa.Params.select('online_mod_rezka_mirror', '', 'https://kvk.zone');
        }
    }

    // ==========================================
    // Старт плагина
    // ==========================================
    function startPlugin() {
        initLang();
        initSettings();
        addButtonToMovieCard();

        if (Lampa.Plugins && Lampa.Plugins.add) {
            Lampa.Plugins.add({
                name: PLUGIN_NAME,
                version: PLUGIN_VERSION,
                description: 'Онлайн просмотр фильмов, сериалов и аниме (Collaps, Filmix, Kodik, HDRezka, AniLibria)',
                type: 'video'
            });
        }

        if (Lampa.Manifest) {
            Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
            Lampa.Manifest.plugins.online_mod = {
                type: 'video',
                version: PLUGIN_VERSION,
                name: PLUGIN_NAME,
                description: 'Онлайн просмотр в плеере Lampa',
                component: 'online_mod'
            };
        }

        console.log(PLUGIN_NAME, 'v' + PLUGIN_VERSION, 'initialized successfully');
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
