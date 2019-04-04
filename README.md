# ReCalRecipe

スマートフォンのカメラでレシピ本から文字を読み取り、レシピの分量を自動的に再計算するモバイル用の小さなWebアプリです。

- 文字の認識（OCR）には Google Cloud Vision API を使用しています。
- iOS 12.1.2 / Safari 604.1 で動作確認しています。


## 使い方

### どこかにデプロイする

https://asuka4624254.github.io/ReCalRecipe/

GCPは無料の範囲で使っているのでそれを超えてしまうとOCRができずにエラーになるかもしれません。

自前でサーバにデプロイする場合は、カメラから画像を取り込む `navigator.mediaDevices.getUserMedia()` の都合で、HTTPSでないと動作しませんのでご注意ください。


### ローカルで動かす

上記の理由で、ローカルで試してみる場合もHTTPSでローカルサーバを立ち上げる必要があります。

`npm i http-server` でインストールできる、http-serverが簡単で便利でした。

http-serverでSSLにする方法はこちらが参考になりました。  
[スマフォカメラにブラウザからアクセス - Qiita](https://qiita.com/tkyko13/items/1871d906736ac88a1f35)
