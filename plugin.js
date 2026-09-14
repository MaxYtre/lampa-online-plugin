(function () {
    'use strict';

    if (window.plugin_online_mod_ready) return;
    window.plugin_online_mod_ready = true;

    var PLUGIN_NAME = 'Online Mod';
    var PLUGIN_VERSION = '1.0.0';
    var KODIK_TOKEN_DEFAULT = '41dd95f84c21719b09d6c71182237a25';
    var TEST_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

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
            online_mod_select_source: {
                ru: 'Выберите источник или действие',
                en: 'Select source or action',
                uk: 'Оберіть джерело або дію'
            },
            online_mod_test_player: {
                ru: '⚡ Проверка плеера (Тестовый HLS поток)',
                en: '⚡ Player Test (Direct HLS Stream)',
                uk: '⚡ Перевірка плеєра (Тестовий HLS потік)'
            },
            online_mod_test_player_desc: {
                ru: 'Моментальная проверка встроенного плеера Lampa (1080p/720p/480p)',
                en: 'Instant check of Lampa built-in player (1080p/720p/480p)',
                uk: 'Миттєва перевірка вбудованого плеєра Lampa (1080p/720p/480p)'
            },
            online_mod_anilibria: {
                ru: '🎌 AniLibria (Аниме, многосерийный HLS)',
                en: '🎌 AniLibria (Anime, multi-episode HLS)',
                uk: '🎌 AniLibria (Аніме, багатосерійний HLS)'
            },
            online_mod_kodik: {
                ru: '🎬 Kodik (Фильмы, сериалы, озвучки)',
                en: '🎬 Kodik (Movies, Series, Dubs)',
                uk: '🎬 Kodik (Фільми, серіали, озвучки)'
            },
            online_mod_searching: {
                ru: 'Поиск видеопотока...',
                en: 'Searching for video stream...',
                uk: 'Пошук відеопотоку...'
            },
            online_mod_not_found: {
                ru: 'По запросу ничего не найдено',
                en: 'Nothing found for query',
                uk: 'За запитом нічого не знайдено'
            },
            online_mod_found_episodes: {
                ru: 'Найдено серий: ',
                en: 'Episodes found: ',
                uk: 'Знайдено серій: '
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
            online_mod_error_extract: {
                ru: 'Не удалось извлечь видеопоток',
                en: 'Failed to extract video stream',
                uk: 'Не вдалося отримати відеопотік'
            }
        });
    }

    // Вспомогательные функции
    var Utils = {
        cleanTitle: function (str) {
            return (str || '').replace(/[\s.,:;’'`!?]+/g, ' ').trim();
        },
        normalizeTitle: function (str) {
            return this.cleanTitle((str || '').toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, '-').replace(/ё/g, 'е'));
        },
        containsTitle: function (str, title) {
            if (!str || !title) return false;
            return this.normalizeTitle(str).indexOf(this.normalizeTitle(title)) !== -1;
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
            var original = movie.original_title || movie.title || '';
            return Lampa.Utils.hash(original + (extra || ''));
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
        }
    };

    // ==========================================
    // 1. Тестовый HLS поток
    // ==========================================
    function playTestHls(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        var testStreams = {
            '1080p': TEST_STREAM_URL,
            '720p': TEST_STREAM_URL,
            '480p': TEST_STREAM_URL
        };

        var hash = Utils.buildCardHash(movie, '_test_stream');
        var view = Lampa.Timeline.view(hash);

        var first = {
            url: TEST_STREAM_URL,
            title: (movie.title || 'Big Buck Bunny') + ' [Тестовый HLS]',
            quality: testStreams,
            timeline: view
        };

        Utils.markViewed(hash);
        Lampa.Player.play(first);
        Lampa.Player.playlist([first]);
    }

    // ==========================================
    // 2. AniLibria API источник
    // ==========================================
    var AniLibria = {
        search: function (movie, onComplete, onError) {
            var network = new Lampa.Reguest();
            var title = movie.title || movie.name || '';
            var orig = movie.original_title || movie.original_name || '';
            var query = title || orig;

            if (!query) {
                onError(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            var url = 'https://api.anilibria.app/api/v1/app/search/releases?query=' + encodeURIComponent(query);
            network.clear();
            network.timeout(12000);
            network.silent(url, function (releases) {
                if (releases && releases.length) {
                    AniLibria.findBestMatch(releases, movie, onComplete, onError);
                } else {
                    // Fallback поиск по оригинальному названию
                    if (orig && orig !== title) {
                        var fallbackUrl = 'https://api.anilibria.app/api/v1/app/search/releases?query=' + encodeURIComponent(orig);
                        network.clear();
                        network.timeout(12000);
                        network.silent(fallbackUrl, function (fbReleases) {
                            if (fbReleases && fbReleases.length) {
                                AniLibria.findBestMatch(fbReleases, movie, onComplete, onError);
                            } else {
                                onError(Lampa.Lang.translate('online_mod_not_found'));
                            }
                        }, function () {
                            onError(Lampa.Lang.translate('online_mod_not_found'));
                        });
                    } else {
                        onError(Lampa.Lang.translate('online_mod_not_found'));
                    }
                }
            }, function (a, c) {
                onError('AniLibria API недоступен: ' + network.errorDecode(a, c));
            });
        },

        findBestMatch: function (releases, movie, onComplete, onError) {
            var targetTitle = movie.title || '';
            var targetOrig = movie.original_title || '';
            var targetYear = parseInt((movie.release_date || movie.first_air_date || '').slice(0, 4)) || 0;

            // Сортировка по релевантности
            var matched = releases.filter(function (rel) {
                var ru = rel.name && rel.name.main;
                var en = rel.name && rel.name.english;
                var alt = rel.name && rel.name.alternative;
                return Utils.containsTitle(ru, targetTitle) ||
                       Utils.containsTitle(en, targetOrig) ||
                       Utils.containsTitle(alt, targetOrig);
            });

            var chosen = matched.length ? matched[0] : releases[0];
            AniLibria.loadReleaseDetails(chosen.id, movie, onComplete, onError);
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
                    onError('У релиза нет доступных серий');
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
                    title: (release.name && release.name.main || movie.title) + ' - ' + epTitle,
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
            var title = movie.title || '';
            var orig = movie.original_title || '';
            var kp_id = movie.kinopoisk_id || movie.kp_id;
            var imdb_id = movie.imdb_id;

            var params = 'token=' + token + '&limit=50&with_episodes=true';
            if (kp_id) params += '&kinopoisk_id=' + encodeURIComponent(kp_id);
            else if (imdb_id) params += '&imdb_id=' + encodeURIComponent(imdb_id);
            else if (title) params += '&title=' + encodeURIComponent(title);
            else if (orig) params += '&title=' + encodeURIComponent(orig);
            else {
                onError(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            var url = 'https://kodik-api.com/search?' + params;
            network.clear();
            network.timeout(15000);
            network.silent(url, function (res) {
                if (res && res.results && res.results.length) {
                    onComplete(res.results);
                } else {
                    // Если по kp_id/imdb_id не нашло, пробуем по названию
                    if ((kp_id || imdb_id) && title) {
                        var fallbackUrl = 'https://kodik-api.com/search?token=' + token + '&limit=50&with_episodes=true&title=' + encodeURIComponent(title);
                        network.clear();
                        network.timeout(15000);
                        network.silent(fallbackUrl, function (fbRes) {
                            if (fbRes && fbRes.results && fbRes.results.length) {
                                onComplete(fbRes.results);
                            } else {
                                onError(Lampa.Lang.translate('online_mod_not_found'));
                            }
                        }, function () {
                            onError(Lampa.Lang.translate('online_mod_not_found'));
                        });
                    } else {
                        onError(Lampa.Lang.translate('online_mod_not_found'));
                    }
                }
            }, function (a, c) {
                onError('Kodik API недоступен: ' + network.errorDecode(a, c));
            });
        },

        // Разрешение прямой ссылки на m3u8 поток из плеера Kodik
        extractStream: function (link, onStream, onError) {
            var fullUrl = Utils.fixLinkProtocol(link);
            var network = new Lampa.Reguest();
            network.clear();
            network.timeout(12000);

            network.native(fullUrl, function (html) {
                html = (html || '').replace(/\n/g, '');
                var urlParamsMatch = html.match(/\burlParams\s*=\s*'([^']+)'/);
                var typeMatch = html.match(/\b(?:videoInfo|vInfo)\.type\s*=\s*'([^']+)'/);
                var hashMatch = html.match(/\b(?:videoInfo|vInfo)\.hash\s*=\s*'([^']+)'/);
                var idMatch = html.match(/\b(?:videoInfo|vInfo)\.id\s*=\s*'([^']+)'/);
                var playerMatch = html.match(/<script [^>]*\bsrc="(\/assets\/js\/app\.player_single[^"]+)"/);

                var json = null;
                try {
                    json = urlParamsMatch && JSON.parse(urlParamsMatch[1]);
                } catch (e) {}

                if (json && typeMatch && hashMatch && idMatch) {
                    var postdata = 'd=' + json.d +
                        '&d_sign=' + json.d_sign +
                        '&pd=' + json.pd +
                        '&pd_sign=' + json.pd_sign +
                        '&ref=' + json.ref +
                        '&ref_sign=' + json.ref_sign +
                        '&bad_user=true' +
                        '&cdn_is_working=true' +
                        '&type=' + typeMatch[1] +
                        '&hash=' + hashMatch[1] +
                        '&id=' + idMatch[1] +
                        '&info=%7B%7D';

                    var linkMatch = fullUrl.match(/^((https?:)?\/\/[^\/]+)/);
                    var origin = linkMatch ? linkMatch[1] : 'https://kodikplayer.com';
                    var playerScriptUrl = origin + (playerMatch ? playerMatch[1] : '/assets/js/app.player_single.js');

                    // Запрашиваем js плеера для получения endpoint декодирования
                    network.clear();
                    network.timeout(12000);
                    network.native(playerScriptUrl, function (jsCode) {
                        var ajaxMatch = (jsCode || '').match(/\$\.ajax\({type:\s*"POST",\s*url:\s*atob\("([^"]+)"\)/);
                        var postPath = '';
                        try {
                            if (ajaxMatch) postPath = atob(ajaxMatch[1]);
                        } catch (e) {}

                        if (!postPath || postPath.indexOf('/') !== 0) {
                            postPath = '/gvi'; // стандартный fallback путь Kodik
                        }

                        var apiUrl = origin + postPath;
                        network.clear();
                        network.timeout(12000);
                        network.native(apiUrl, function (data) {
                            var parsed = typeof data === 'string' ? JSON.parse(data) : data;
                            if (parsed && parsed.links) {
                                var qualityMap = {};
                                var bestUrl = '';
                                Object.keys(parsed.links).forEach(function (qKey) {
                                    var itemArr = parsed.links[qKey];
                                    if (itemArr && itemArr.length && itemArr[0].src) {
                                        var decodedStream = Utils.decodeRot18(itemArr[0].src);
                                        decodedStream = Utils.fixLinkProtocol(decodedStream);
                                        qualityMap[qKey + 'p'] = decodedStream;
                                        if (!bestUrl) bestUrl = decodedStream;
                                    }
                                });

                                if (bestUrl) {
                                    onStream(bestUrl, qualityMap);
                                } else {
                                    onError();
                                }
                            } else {
                                onError();
                            }
                        }, function () {
                            onError();
                        }, postdata);
                    }, function () {
                        onError();
                    });
                } else {
                    onError();
                }
            }, function () {
                onError();
            });
        }
    };

    // ==========================================
    // UI: Открытие модального меню «Онлайн»
    // ==========================================
    function openOnlineMenu(movie) {
        var items = [
            {
                title: Lampa.Lang.translate('online_mod_test_player'),
                subtitle: Lampa.Lang.translate('online_mod_test_player_desc'),
                action: 'test_hls'
            },
            {
                title: Lampa.Lang.translate('online_mod_anilibria'),
                subtitle: 'Быстрый доступ к аниме релизам и озвучке AniLibria (HLS)',
                action: 'anilibria'
            },
            {
                title: Lampa.Lang.translate('online_mod_kodik'),
                subtitle: 'Поиск по базе фильмов, сериалов и мультфильмов',
                action: 'kodik'
            }
        ];

        Lampa.Select.show({
            title: Lampa.Lang.translate('online_mod_sources'),
            items: items,
            onSelect: function (a) {
                if (a.action === 'test_hls') {
                    playTestHls(movie);
                } else if (a.action === 'anilibria') {
                    handleAniLibria(movie);
                } else if (a.action === 'kodik') {
                    handleKodik(movie);
                }
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    // Обработка AniLibria
    function handleAniLibria(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        AniLibria.search(movie, function (release) {
            var episodes = release.episodes || [];
            if (!episodes.length) {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            if (episodes.length === 1) {
                // Если всего одна серия / фильм — сразу воспроизводим
                AniLibria.playRelease(release, movie, 0);
            } else {
                // Меню выбора серии
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
                    title: (release.name && release.name.main || movie.title) + ' - ' + Lampa.Lang.translate('online_mod_select_episode'),
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

    // Обработка Kodik
    function handleKodik(movie) {
        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));

        Kodik.search(movie, function (results) {
            if (!results.length) {
                Lampa.Noty.show(Lampa.Lang.translate('online_mod_not_found'));
                return;
            }

            // Группировка вариантов переводов / озвучек
            var voiceItems = results.map(function (res, idx) {
                var voiceName = res.translation ? (res.translation.title || 'Стандартная озвучка') : 'Оригинал';
                var voiceType = res.translation && res.translation.type ? (' (' + res.translation.type + ')') : '';
                var isSerial = res.type && (res.type.indexOf('serial') !== -1 || res.seasons_count > 0);
                var epCountInfo = isSerial ? (' | Сезонов: ' + (res.seasons_count || 1) + ', Серий: ' + (res.episodes_count || '?')) : ' | Фильм';

                return {
                    title: voiceName + voiceType,
                    subtitle: (res.title || movie.title) + ' | ' + (res.quality || '720p') + epCountInfo,
                    raw: res,
                    index: idx
                };
            });

            if (voiceItems.length === 1 && !voiceItems[0].raw.seasons) {
                // Один результат и это фильм
                playKodikItem(voiceItems[0].raw, movie, voiceItems[0].title);
            } else {
                Lampa.Select.show({
                    title: Lampa.Lang.translate('online_mod_select_voice'),
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

    // Выбор сезона Kodik
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
            title: Lampa.Lang.translate('online_mod_select_season'),
            items: seasonItems,
            onSelect: function (selSeason) {
                selectKodikEpisode(chosen, selSeason.seasonKey, movie, voiceTitle);
            },
            onBack: function () {
                handleKodik(movie);
            }
        });
    }

    // Выбор серии Kodik
    function selectKodikEpisode(chosen, seasonKey, movie, voiceTitle) {
        var season = chosen.seasons[seasonKey];
        var epObj = season && season.episodes ? season.episodes : {};
        var epKeys = Object.keys(epObj);

        if (!epKeys.length) {
            Lampa.Noty.show(Lampa.Lang.translate('online_mod_not_found'));
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
                Utils.markViewed(hash);

                Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));
                Kodik.extractStream(selEp.link, function (bestUrl, qualityMap) {
                    var item = {
                        url: bestUrl,
                        title: (movie.title || chosen.title) + ' - S' + seasonKey + 'E' + selEp.epKey + ' (' + voiceTitle + ')',
                        quality: qualityMap,
                        timeline: Lampa.Timeline.view(hash)
                    };
                    Lampa.Player.play(item);
                    Lampa.Player.playlist([item]);
                }, function () {
                    // Fallback на открывание через плеер Lampa или веб-ссылку
                    var fallbackItem = {
                        url: Utils.fixLinkProtocol(selEp.link),
                        title: (movie.title || chosen.title) + ' - S' + seasonKey + 'E' + selEp.epKey,
                        timeline: Lampa.Timeline.view(hash)
                    };
                    Lampa.Player.play(fallbackItem);
                    Lampa.Player.playlist([fallbackItem]);
                });
            },
            onBack: function () {
                selectKodikSeason(chosen, movie, voiceTitle);
            }
        });
    }

    // Воспроизведение фильма Kodik
    function playKodikItem(chosen, movie, voiceTitle) {
        var hash = Utils.buildCardHash(movie, '_kodik_movie');
        Utils.markViewed(hash);

        Lampa.Noty.show(Lampa.Lang.translate('online_mod_searching'));
        Kodik.extractStream(chosen.link, function (bestUrl, qualityMap) {
            var item = {
                url: bestUrl,
                title: (movie.title || chosen.title) + ' (' + voiceTitle + ')',
                quality: qualityMap,
                timeline: Lampa.Timeline.view(hash)
            };
            Lampa.Player.play(item);
            Lampa.Player.playlist([item]);
        }, function () {
            var fallbackItem = {
                url: Utils.fixLinkProtocol(chosen.link),
                title: (movie.title || chosen.title) + ' (' + voiceTitle + ')',
                timeline: Lampa.Timeline.view(hash)
            };
            Lampa.Player.play(fallbackItem);
            Lampa.Player.playlist([fallbackItem]);
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

                // Проверка, нет ли уже кнопки
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
        }
    }

    // ==========================================
    // Старт плагина
    // ==========================================
    function startPlugin() {
        initLang();
        initSettings();
        addButtonToMovieCard();

        // Регистрация в манифесте и плагинах Lampa
        if (Lampa.Plugins && Lampa.Plugins.add) {
            Lampa.Plugins.add({
                name: PLUGIN_NAME,
                version: PLUGIN_VERSION,
                description: 'Онлайн просмотр фильмов, сериалов и аниме (AniLibria, Kodik, HLS)',
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
