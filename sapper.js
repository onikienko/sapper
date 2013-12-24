$(function () {
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
                cell_size: 28 // размер клетки
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
        game_type,
        start_time,
        timer,
        theme,
        marked_count = 0,
        field = [], // "двумерный" массив с информацией о каждой клетке игрового поля (отбъкт типа {mine:0, status: 1})
        move_counter, // счетчик ходов
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
            {color: '', html: '&nbsp;'},
            {color: '#CC0000', html: '&#9658;'}
        ],
        THEME_MAP = {
            green: '#C5E26D',
            blue: '#8AD5F0',
            orange: '#FFD980'
        },
        OPEN_BG_COLOR = '#ddd',
        $field = $('#field'),
        $smile = $('#smile'),
        $game_type = $('#game_type'),
        $timer = $('#timer'),
        $open = $('#open');

    function showMarkedCount() {
        var marked = (game_type.mines_count - marked_count).toString();
        while (marked.length < 3) {
            marked = '0' + marked;
        }
        $open.text(marked);
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
        $timer.text('000');
        move_counter = 0;
        $smile.find('span').html('&#9787;');
        $smile.css({width: field_width});

        $('#container').css({width: field_width});
        $field.css({
            fontSize: font_size + 'px',
            lineHeight: Math.floor(game_type.cell_size / font_size * 100) + '%'
        }).removeClass('stop');

        for (i = 0; i < game_type.row; i++) {
            field[i] = [];
            for (j = 0; j < game_type.column; j++) {
                field[i][j] = {info: 0, open: false, mark: 0};
                html += '<div id="' + i + '_' + j + '" class="close">' + CLOSE_MAP[0].html + '</div>';
            }
        }
        $field.html(html).find('>div').css({
            width: game_type.cell_size,
            height: game_type.cell_size
        });
        $field.find('.close').css({backgroundColor: theme});
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

    function setStyles($el, cell) {
        if (!cell.open) {
            $el.attr('class', 'close').css('color', CLOSE_MAP[cell.mark].color).html(CLOSE_MAP[cell.mark].html);
        } else {
            $el.attr('class', 'open').css({
                'color': OPEN_MAP[cell.info].color,
                backgroundColor: OPEN_BG_COLOR
            }).html(OPEN_MAP[cell.info].html);
        }
    }


    function endGame() {
        clearInterval(timer);
        $field.addClass('stop');
    }


    function checkWin() {
        if ($field.find('.open').length === game_type.row * game_type.column - game_type.mines_count && marked_count === game_type.mines_count) {
            $smile.addClass('rotor');
            setTimeout(function () {
                $smile.removeClass('rotor');
            }, 1000);
            endGame();
        }
    }

    function checkGame($el, cell, ij) {
        var i,
            j;

        function checkNeighbors(e) {
            var neighbors = getNeighborsPoints(e),
                neighbor,
                i;

            field[e[0]][e[1]].open = true;
            setStyles($('#' + e.join('_')), field[e[0]][e[1]]);

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
                        setStyles($('#' + neighbor.join('_')), field[neighbor[0]][neighbor[1]]);
                    }
                }
            }
        }

        switch (cell.info) {
        case 'm':
            cell.open = true;
            setStyles($el, cell);
            for (i = 0; i < game_type.row; i++) {
                for (j = 0; j < game_type.column; j++) {
                    if (field[i][j].info === 'm') {
                        field[i][j].open = true;
                        setStyles($('#' + i + '_' + j), field[i][j]);
                        // end game
                        $smile.find('span').html('&#9785;');
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
            setStyles($el, cell);
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
                $timer.text(time);
            }

        }, 250);
    }

    $field.on('mousedown', '>div', function (e) {
        var $this = $(this),
            ij = $this.attr('id').split('_'),
            cell = field[ij[0]][ij[1]];

        ++move_counter;

        if (move_counter === 1) {
            fillField(ij);
            start_time = (new Date()).getTime();
            fireTimer();
        }

        if (e.which === 3) { // клик правой княпой мыши
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
                setStyles($this, cell);
            }

            $this[0].oncontextmenu = function () {
                checkWin();
                return false; // отмена показа контекстного меню
            };
        } else {
            if (!cell.mark && !cell.open) {
                checkGame($this, cell, ij);
            }
        }
    });

    $smile.find('span').click(function () {
        start();
    });

    $game_type.on('click', 'a', function (e) {
        var $this = $(this);

        if (!$this.hasClass('active')) {
            $game_type.find('.active').removeClass('active');
            $this.addClass('active');
        }
        game_type = game[$this.attr('id')];
        start();
    });

    $('#theme').on('click', 'a', function () {
        var $this = $(this);
        theme = THEME_MAP[$this.attr('class')];
        $field.find('.close').css({backgroundColor: theme});
    });

    theme = THEME_MAP.green;
    game_type = game.noob;
    start();
});