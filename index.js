
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
    canvas.onclick = canvas.ontouchstart = calculate;
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
    camera.play();
}



/**
 * OCRの結果を解析
 */
function analyze(json) {
    var targets = [];
    if (json.responses[0].textAnnotations != undefined) {
        var words = json.responses[0].textAnnotations;

        for (var i = 0; i < words.length; i++) {
            var number = null;
            var unit = null;

            var result = words[i].description.match(/(カップ|さじ)*([0-9]+)(g|kg|cc|コ|カップ|本|パック)/iu);

            if (result == null) {
                number = words[i].description.match(/[0-9]+/iu);
                if (words[i + 1]) {
                    unit = words[i + 1].description.match(/g|kg|cc|コ|カップ|本|パック/iu);
                }

                if (number == null || unit == null) {
                    continue;
                }

                number = number[0];
                unit = unit[0];
            }
            else {
                number = result[2];
                unit = result[3];
            };

            var target = {
                number: Math.ceil(number * times * 10) / 10, // 数字（再計算）
                unit: unit, // 単位
                vertices: words[i].boundingPoly.vertices // 座標
            }
            targets.push(target);
        }
    }
    return targets;
}



/**
 * canvas に再計算した数字を描画する
 */
function drawTargets(targets) {
    if (targets.length < 1) return false;
    console.log(targets);

    var fontSize = getFontSize(targets);

    for (var i = 0; i < targets.length; i++) {
        var vertex = targets[i].vertices[2];
        var x = vertex.hasOwnProperty('x') ? vertex.x : 0;
        var y = vertex.hasOwnProperty('y') ? vertex.y : 0;

        ctx.font = fontSize + 'px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(targets[i].number + targets[i].unit, x, y);
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