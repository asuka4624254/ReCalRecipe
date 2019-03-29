
window.onload = async function () {
    var camera = document.getElementById('camera');

    // カメラから画像を取得してリアルタイムで表示する
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    }).then(function (stream) {
        camera.srcObject = stream;
    }).catch(function (error) {
        console.error('mediaDevice.getUserMedia() error: ', error);
        return;
    });

    var canvas = document.getElementById('info');
    canvas.onclick = canvas.ontouchstart = calculate;
};



var flag = false;

async function calculate() {
    var camera = document.getElementById('camera');
    var canvas = document.getElementById('info');
    var ctx = canvas.getContext('2d');

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

    analyze(json);
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
        alert('Oops! Some error occurred.');
        clearCanvas();
        return;
    }

    return res.json();
}



/**
 * canvas の内容をクリア
 */
function clearCanvas() {
    var canvas = document.getElementById('info');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}



function analyze(json) {
    console.log(json[1]);
    if (json[0] != undefined
        && json.hasOwnProperty('textAnnotations')) {
        console.log(json.textAnnotations)
    }
}