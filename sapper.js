window.onload = function () {
    /*
     Каждая клетка - объект создаваемый по шаблону
     {
     info: m|0|1|...|8,   m - мина, 0 - мин рядом нет, 1 - рядом одна мина и тд
     open: true|false      клетка.закрыта или открыта
     mark: 0|1           0 - без метки,1 флаг
     }

     Клетки  (объекты) записываются в псевдодвумерный массив, каждый ряд - это массив
     [
     [{open: false, info: 1, mark: 0},{},{},...{}],
     [[{},{},{},...{}],
     ....,
     [[{},{},{},...{}]
     ]
     */

    "use strict";
    var game = {
            noob: {
                row: 9, // кол-во рядов
                column: 9,  // кол-во столбцов
                mines_count: 10, // кол-во мин
                cell_size: 30 // размер клетки
            },
            amateur: {
                row: 16,
                column: 16,
                mines_count: 40,
                cell_size: 28
            },
            prof: {
                row: 16,
                column: 40,
                mines_count: 99,
                cell_size: 24
            }
        },
        start_time,
        timer,
        marked_count = 0,
        field = [], // "двумерный" массив с информацией о каждой клетке игрового поля (отбъкт типа {mine:0, status: 1})
        is_first_move = true, // счетчик ходов
        OPEN_MAP = {
            m: {
                color: '#000',
                html: '&bull;'
            },
            0: {
                color: '#ddd',
                html: '&nbsp;'
            },
            1: {
                color: '#0099CC',
                html: '1'
            },
            2: {
                color: '#669900',
                html: '2'
            },
            3: {
                color: '#CC0000',
                html: '3'
            },
            4: {
                color: '#9933CC',
                html: '4'
            },
            5: {
                color: '#FF8800',
                html: '5'
            },
            6: {
                color: '#FF8800',
                html: '6'
            },
            7: {
                color: '#FF8800',
                html: '7'
            },
            8: {
                color: '#FF8800',
                html: '8'
            }
        },
        CLOSE_MAP = [
            {
                css: {
                    textShadow: '',
                    color: ''
                },
                html: '&nbsp;'
            },
            {
                css: {
                    textShadow: '2px 2px 1px rgba(150, 150, 150, 1)',
                    color: '#CC0000'
                },
                html: '&#9658;'
            }
        ],
        THEME_MAP = {
            green: '#C5E26D',
            blue: '#8AD5F0',
            orange: '#FFD980'
        },
        OPEN_BG_COLOR = '#ddd',
        game_type = (function () {
            localStorage.game_type = localStorage.game_type || 'noob';
            return game[localStorage.game_type];
        }()),
        theme = (function () {
            localStorage.theme = localStorage.theme || 'green';
            return THEME_MAP[localStorage.theme];
        }()),
        xmlhttp,
        el_field = document.getElementById('field'),
        el_smile = document.getElementById('smile'),
        el_game_type = document.getElementById('game_type'),
        el_timer = document.getElementById('timer'),
        el_open = document.getElementById('open');

    function showMarkedCount() {
        var marked = (game_type.mines_count - marked_count).toString();
        while (marked.length < 3) {
            marked = '0' + marked;
        }
        el_open.innerHTML = marked;
    }

    function css(el, obj) {
        var prop,
            i,
            el_len = el.length;

        function applyCss(item) {
            for (prop in obj) {
                item.style[prop] = obj[prop];
            }
        }

        if (el_len) {
            for (i = 0; i < el_len; i++) {
                applyCss(el[i]);
            }
        } else {
            applyCss(el);
        }
    }

    // строю игровое поле HTML. каждая клетка - div с id="i_j" (позволяет связать клетку с элементом массива),
    // где i - ряд, j - столбец
    // одновременно в этом же цикле заполняю массив field стартовой информацие о клетках
    function start() {
        var html = '',
            font_size = Math.floor(game_type.cell_size * 0.6),
            field_width = (game_type.cell_size + 2) * game_type.column,
            i,
            j;

        clearInterval(timer);
        marked_count = 0;
        showMarkedCount();
        el_timer.innerHTML = '000';
        is_first_move = true;
        el_smile.getElementsByTagName('span')[0].innerHTML = '&#9787;';
        css(el_smile, {width: field_width + 'px'});

        css(document.getElementById('container'), {width: field_width + 'px'});
        css(el_field, {
            fontSize: font_size + 'px',
            lineHeight: Math.floor(game_type.cell_size / font_size * 100) + '%'
        });
        el_field.classList.remove('stop');

        el_game_type.querySelector('.active').classList.remove('active');
        el_game_type.querySelector('#' + localStorage.game_type).className = 'active';

        for (i = 0; i < game_type.row; i++) {
            field[i] = [];
            for (j = 0; j < game_type.column; j++) {
                field[i][j] = {info: 0, open: false, mark: 0};
                html += '<div id="' + i + '_' + j + '" class="close">' + CLOSE_MAP[0].html + '</div>';
            }
        }
        el_field.innerHTML = html;
        css(el_field.querySelectorAll('div'), {
            width: game_type.cell_size + 'px',
            height: game_type.cell_size + 'px'
        });
        css(el_field.querySelectorAll('.close'), {backgroundColor: theme});
    }

    function getNeighborsPoints(ij) {
        ij[0] = parseInt(ij[0], 10);
        ij[1] = parseInt(ij[1], 10);

        return [
            [ij[0] - 1, ij[1] - 1],
            [ij[0] - 1, ij[1]],
            [ij[0] - 1, ij[1] + 1],
            [ij[0], ij[1] - 1],
            [ij[0], ij[1] + 1],
            [ij[0] + 1, ij[1] - 1],
            [ij[0] + 1, ij[1]],
            [ij[0] + 1, ij[1] + 1]
        ];
    }

    function fillField(clicked) {
        var mines = 0,
            mine_point,
            mines_arr = [],
            i,
            j,
            neighbors,
            neighbor;
        clicked = [parseInt(clicked[0], 10), parseInt(clicked[1], 10)];
        // 1. Рэндомно залить массив нужным кол-вом мин. Рекурсия при повторах или если мина ставится на кликнутое поле
        function randomPoint() {
            var point;

            function random(max) {
                return Math.floor(Math.random() * max);
            }

            point = [random(game_type.row), random(game_type.column)];
            if (field[point[0]][point[1]].info === 'm' || (point[0] === clicked[0] && point[1] === clicked[1])) {
                return randomPoint();
            } else {
                return point;
            }
        }

        do {
            ++mines;
            mine_point = randomPoint();
            mines_arr.push(mine_point);
            field[mine_point[0]][mine_point[1]].info = 'm';
        } while (mines < game_type.mines_count);

        // 2. посчитать всех соседей
        for (i = 0; i < mines_arr.length; i++) {
            neighbors = getNeighborsPoints(mines_arr[i]);
            for (j = 0; j < neighbors.length; j++) {
                neighbor = neighbors[j];
                if (field[neighbor[0]] && field[neighbor[0]][neighbor[1]] && field[neighbor[0]][neighbor[1]].info !== 'm') {
                    field[neighbor[0]][neighbor[1]].info++;
                }
            }
        }
    }

    function setStyles(el, cell) {
        if (!cell.open) {
            el.className = 'close';
            css(el, CLOSE_MAP[cell.mark].css);
            el.innerHTML = CLOSE_MAP[cell.mark].html;
        } else {
            el.className = 'open';
            css(el, {
                'color': OPEN_MAP[cell.info].color,
                backgroundColor: OPEN_BG_COLOR
            });
            el.innerHTML = OPEN_MAP[cell.info].html;
        }
    }


    function endGame() {
        clearInterval(timer);
        el_field.classList.add('stop');
    }


    function checkWin() {
        if (el_field.querySelectorAll('.open').length === game_type.row * game_type.column - game_type.mines_count && marked_count === game_type.mines_count) {
            el_smile.classList.add('rotor');
            setTimeout(function () {
                el_smile.classList.remove('rotor');
            }, 1000);
            endGame();
        }
    }

    function checkGame(el, cell, ij) {
        var i,
            j;

        function checkNeighbors(e) {
            var neighbors = getNeighborsPoints(e),
                neighbor,
                i;

            field[e[0]][e[1]].open = true;
            setStyles(document.getElementById(e.join('_')), field[e[0]][e[1]]);

            for (i = 0; i < neighbors.length; i++) {
                neighbor = neighbors[i];
                if (field[neighbor[0]] && field[neighbor[0]][neighbor[1]] && !field[neighbor[0]][neighbor[1]].open &&
                    field[neighbor[0]][neighbor[1]].mark === 0) {
                    switch (field[neighbor[0]][neighbor[1]].info) {
                    case 'm':
                        break;
                    case 0:
                        checkNeighbors(neighbor);
                        break;
                    default:
                        field[neighbor[0]][neighbor[1]].open = true;
                        setStyles(document.getElementById(neighbor.join('_')), field[neighbor[0]][neighbor[1]]);
                    }
                }
            }
        }

        switch (cell.info) {
        case 'm':
            cell.open = true;
            setStyles(el, cell);
            for (i = 0; i < game_type.row; i++) {
                for (j = 0; j < game_type.column; j++) {
                    if (field[i][j].info === 'm') {
                        field[i][j].open = true;
                        setStyles(document.getElementById(i + '_' + j), field[i][j]);
                        // end game
                        el_smile.getElementsByTagName('span')[0].innerHTML = '&#9785;';
                        endGame();
                    }
                }
            }
            break;
        case 0:
            checkNeighbors(ij);
            checkWin();
            break;
        default:
            cell.open = true;
            setStyles(el, cell);
            checkWin();
            break;
        }
    }

    function fireTimer() {
        timer = setInterval(function () {
            var time = Math.floor((((new Date()).getTime() - start_time) / 1000)).toString();

            while (time.length < 3) {
                time = '0' + time;
            }
            if (time < 999) {
                el_timer.innerHTML = time;
            }

        }, 250);
    }

    el_field.onmousedown = function (e) {
        var el = e.target,
            ij = el.id.split('_'),
            cell = field[ij[0]][ij[1]];
        e = e || window.event;

        if (is_first_move) {
            is_first_move = false;
            fillField(ij);
            start_time = (new Date()).getTime();
            fireTimer();
        }

        if (e.which === 3) {
            if (!cell.open) {
                if (!cell.mark) {
                    if (marked_count < game_type.mines_count) {
                        cell.mark = 1;
                        ++marked_count;
                    }
                } else {
                    cell.mark = 0;
                    --marked_count;
                }
                showMarkedCount();
                setStyles(el, cell);
            }

            checkWin();
        } else {
            if (!cell.mark && !cell.open) {
                checkGame(el, cell, ij);
            }
        }
    };

    el_field.oncontextmenu = function (e) {
        return false;
    };

    el_smile.getElementsByTagName('span')[0].onclick = function () {
        start();
    };

    el_game_type.onclick = function (e) {
        var el;

        e = e || window.event;
        el = e.target;
        if (el.tagName.toLowerCase() === 'a') {
            if (!el.classList.contains('active')) {
                el_game_type.querySelector('.active').classList.remove('active');
                el.classList.add('active');
            }
            localStorage.game_type = el.id;
            game_type = game[el.id];
            start();
            return false;
        }
    };

    document.querySelector('#theme').onclick = function (e) {
        var el;

        e = e || window.event;
        el = e.target;
        if (el.tagName.toLowerCase() === 'a') {
            localStorage.theme = el.className;
            theme = THEME_MAP[el.className];
            css(el_field.querySelectorAll('.close'), {backgroundColor: theme});
            return false;
        }
    };

    start();
};