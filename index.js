
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

    var targets = analyze(json);
    var result = drawTargets(targets);

    // 読み込み中を非表示
    document.getElementById('loading').style.display = 'none';

    if (!result) {
        alert('Could not find stuff to recal!');
        clearCanvas();
    }
    return;
}



/**
 * GoogleのOCR APIを叩く
 */
async function callApi(imageString) {
    var url = 'https://vision.googleapis.com/v1/images:annotate';
    var apiKey = 'AIzaSyCT5JIJSThwqHB1n1FMMgs6dXfy3Sd7OOo';
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



function analyze(json) {
    var targets = [];
    if (json.responses[0].textAnnotations != undefined) {
        var words = json.responses[0].textAnnotations;

        for (var i = 0; i < words.length; i++) {
            var result = words[i].description.match(/(カップ)*([0-9]+)(g|kg|cc|コ|カップ|本|さじ|パック)/iu);
            if (result == null) continue;
            console.log(result);
            var target = [
                Math.ceil(result[2] * times * 10) / 10, // 数字（再計算）
                result[3], // 単位
                words[i].boundingPoly.vertices // 座標
            ]
            targets.push(target);
        }
    }
    console.log(targets)
    return targets;
}



function drawTargets(targets) {
    if (targets.length < 1) return false;

    for (var i = 0; i < targets.length; i++) {
        var vertex = targets[i][2][0];
        var x = 0;
        var y = 0;
        if (vertex.hasOwnProperty('x')) {
            x = vertex.x;
        }
        if (vertex.hasOwnProperty('y')) {
            y = vertex.y;
        }
        ctx.fillText(targets[i][0] + targets[i][1], x, y);
    }
    return true;
}