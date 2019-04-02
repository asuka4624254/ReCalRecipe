
var URL = 'https://vision.googleapis.com/v1/images:annotate';
var API_KEY = 'AIzaSyBePpoAr3J_W-FdbZGMgYRhDopY4Emlf7w';

var PREFIX_UNIT = ['カップ', 'さじ'];
var SUFFIX_UNIT = ['g', 'kg', '㎏', 'cc', '㏄', 'ml', '㎖', 'コ', '個', 'カップ', '本', 'パック', '粒', '片', '枚'];



var camera;
var canvas;
var ctx;
var times = 2;

window.onload = async function () {
    camera = document.getElementById('camera');
    canvas = document.getElementById('info');
    ctx = canvas.getContext('2d');

    var constraints = {
        audio: false,
        video: {
            facingMode: 'environment'
        }
    };

    try {
        // カメラから画像を取得してリアルタイムで表示する
        var stream = await navigator.mediaDevices.getUserMedia(constraints);
        camera.srcObject = stream;
    }
    catch (e) {
        alert('Oops! Some error occurred. ' + JSON.stringify(e));
        return;
    }

    // 画面タップで計算する
    canvas.onclick = calculate;
    // 計算の倍数を変更
    var select = document.getElementById('times');
    select.onchange = function (e) {
        times = e.target.value;
        clearCanvas();
    }
};



var flag = false;

async function calculate() {
    if (flag) {
        // canvas の内容をクリア
        clearCanvas();
        flag = false;
        return;
    }

    flag = true;

    // タップしたときの静止画を表示
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    ctx.drawImage(camera, 0, 0);

    // 読み込み中を表示
    document.getElementById('loading').style.display = 'block';

    // 静止画をbase64エンコード
    var data = canvas.toDataURL();
    var index = data.indexOf(',');
    var dataString = data.slice(index + 1);

    // GoogleのOCR APIを叩く
    var json = await callApi(dataString);
    console.log(json);

    // OCRの結果を解析
    var targets = analyze(json);
    // canvas に再計算した数字を描画する
    var result = drawTargets(targets);

    // 読み込み中を非表示
    document.getElementById('loading').style.display = 'none';

    if (!result) {
        alert('Could not find stuff to recalculate!');
        clearCanvas();
    }
    return;
}



/**
 * GoogleのOCR APIを叩く
 */
async function callApi(imageString) {
    var url = 'https://vision.googleapis.com/v1/images:annotate';
    var apiKey = 'AIzaSyBePpoAr3J_W-FdbZGMgYRhDopY4Emlf7w';
    var apiUrl = url + '?key=' + apiKey;

    var body = {
        requests: [{
            image: {
                content: imageString
            },
            features: {
                type: 'TEXT_DETECTION'
            }
        }]
    }

    try {
        var res = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            throw new Error();
        }
    }
    catch (e) {
        alert('Oops! Some error occurred. ' + JSON.stringify(e));
        clearCanvas();
        return;
    }

    return res.json();
}



/**
 * canvas の内容をクリア
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}



/**
 * OCRの結果を解析
 */
function analyze(json) {
    var targets = [];
    if (json.responses[0].textAnnotations != undefined) {
        var words = json.responses[0].textAnnotations;

        for (var i = 0; i < words.length; i++) {
            var text = null;

            // ['100g']
            var pattern = '^([0-9]+)(' + SUFFIX_UNIT.join('|') + ')*$';
            var result = words[i].description.match(new RegExp(pattern, 'iu'));
            if (result !== null && result[2] !== undefined) {
                text = recalculate(result[1]) + result[2];
                targets.push({
                    text: text,
                    vertices: words[i].boundingPoly.vertices // 座標
                });
                continue;
            }

            // ['100', 'g'] のように次に続く数字を探す場合
            if (result !== null && result[2] == undefined && words[i + 1]) {
                var pattern = '^(' + SUFFIX_UNIT.join('|') + ')$';
                var unit = words[i + 1].description.match(new RegExp(pattern, 'iu'));
                if (unit !== null) {
                    text = recalculate(result[1]) + unit[0];
                    targets.push({
                        text: text,
                        vertices: words[i + 1].boundingPoly.vertices // 座標
                    });
                    continue;
                }
            }

            // ['大さじ2'] のように分かれていない場合
            var pattern = '^(.*[' + PREFIX_UNIT.join('') + '])([0-9]+)*$';
            var result = words[i].description.match(new RegExp(pattern, 'iu'));
            if (result !== null && result[2] !== undefined) {
                text = result[1] + recalculate(result[2]);
                targets.push({
                    text: text,
                    vertices: words[i].boundingPoly.vertices // 座標
                });
                continue;
            }

            // ['大さじ', '2'] のように次に続く数字を探す場合
            if (result !== null && result[2] == undefined && words[i + 1]) {
                var pattern = '^([0-9]+)$';
                var number = words[i + 1].description.match(new RegExp(pattern, 'iu'));
                if (number !== null) {
                    text = result[1] + recalculate(number[0]);
                    targets.push({
                        text: text,
                        vertices: words[i + 1].boundingPoly.vertices // 座標
                    });
                }
            }
        }
    }
    return targets;
}



/**
 * canvas に再計算した数字を描画する
 */
function drawTargets(targets) {
    if (targets.length < 1) return false;
    // console.log(targets);

    var fontSize = getFontSize(targets) + 1; // +の数字は調整

    for (var i = 0; i < targets.length; i++) {
        var vertex = targets[i].vertices[2];
        var x = vertex.hasOwnProperty('x') ? vertex.x : 0;
        var y = vertex.hasOwnProperty('y') ? vertex.y : 0;

        ctx.font = fontSize + 'px Arial';
        ctx.fillStyle = '#F2355B';
        ctx.fillText(targets[i].text, x, y);
    }
    return true;
}



/**
 * フォントサイズの平均値を返す
 */
function getFontSize(targets) {
    var total = 0;
    var count = 0;
    for (var i = 0; i < targets.length; i++) {
        if (!targets[i].vertices[3].hasOwnProperty('y')
            || !targets[i].vertices[3].hasOwnProperty('y')
            || i == 0) {
            continue;
        }
        total += targets[i].vertices[3].y - targets[i].vertices[0].y;
        count++;
    }
    return Math.ceil(total / count);
}


/**
 * 再計算
 */
function recalculate(number) {
    return Math.ceil(number * times * 10) / 10;
}