
$(function () {
    var image = $('#camera')[0];
    var imageString = imageToBase64(image);

    callApi(imageString);

    $('div#navi select').change(function (e) {
        console.log(e);
    });
});



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

    var res = await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    console.log(res.json());
}



/**
 * 画像をbase64エンコードする
 */
function imageToBase64(image) {
    var canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    var ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    var data = canvas.toDataURL();
    var index = data.indexOf(',');

    return data.slice(index + 1);
}
