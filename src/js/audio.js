/**
 * @fileoverview Web Audio APIを使用した音声再生管理
 * ビンゴゲームで使用する効果音の読み込みと再生を制御します。
 */

/**
 * Web Audio API用のオーディオコンテキスト
 * @type {AudioContext|null}
 */
let audioContext = null;
 
/**
 * 読み込む音声ソースファイルのパスマッピング
 * プロパティ名は再生時に使用するキー名として機能します
 * @type {Object<string, string>}
 */
const audioFiles = {
    drawButton: "../../sounds/Button_SE4.mp3",
    drawStart: "../../sounds/Digital_Count_SE1.mp3",
    drawStop: "../../sounds/Digital_Count_Stop_SE1.mp3",
};
 
/**
 * 音声ソース読み込み後のオーディオバッファ格納用オブジェクト
 * @type {Object<string, AudioBuffer>}
 */
let audioBuffers = {};    

/**
 * 音声ファイルを非同期で読み込み、AudioBufferに変換する関数
 * 全ての音声ファイルを並列で読み込み、完了後にバッファを返します
 * @param {Array<Array<string>>} entries - [キー名, ファイルパス]の配列
 * @returns {Promise<Object<string, AudioBuffer>>} 読み込み完了したオーディオバッファのオブジェクト
 */
const getAudioBuffer = async (entries) => {
    const promises = [];    // 各音声ファイルの読み込み完了通知用Promise配列
    const buffers = {};     // 読み込んだオーディオバッファの格納用オブジェクト
 
    entries.forEach((entry)=>{
        const promise = new Promise((resolve)=>{
            const [name, url] = entry;    // プロパティ名とファイルのURLに分割
            console.log(`${name}[${url}] 読み込み開始...`);
 
            // 音声ファイルをfetchで取得し、AudioBufferに変換
            fetch(url)
            .then(response => response.blob())         // レスポンスをBlobとして取得
            .then(data => data.arrayBuffer())          // BlobをArrayBufferに変換
            .then(arrayBuffer => {
                // ArrayBufferを音声データ（AudioBuffer）にデコードしてバッファに格納
                  audioContext.decodeAudioData(arrayBuffer, function(audioBuffer){
                    buffers[name] = audioBuffer;
                    console.log(`audioBuffers["${name}"] loaded. オーディオバッファに格納完了！`);
                    resolve();    // このファイルの読み込み完了を通知
                });
            });
        })
        promises.push(promise);        // 実行中のPromiseを配列に追加
    });
    await Promise.all(promises);    // 全ての音声ファイルの読み込みが完了するまで待機
    return buffers;                 // 読み込み完了したオーディオバッファを返す
};

/**
 * 単一音声ファイルを再生する関数
 * @param {string} name - audioBuffersオブジェクトに格納されているキー名
 */
function playSound(name) {
    // AudioContextが停止状態の場合は再開する（ブラウザのポリシー対応）
    if(audioContext.state === "suspended"){
        audioContext.resume();
    }
 
    let source = audioContext.createBufferSource();    // 音声再生用のソースノードを作成
    source.buffer = audioBuffers[name];                // 再生する音声バッファを設定
    source.connect(audioContext.destination);          // 出力先（スピーカー）に接続
    source.start();                                    // 音声再生を開始
};

/**
 * 抽選ボタン押下時の音声再生関数
 * ボタン押下音、数字めくり音（ループ）、停止音を順番に再生します
 * @param {number} playTime - 数字めくりアニメーションの再生時間（秒）
 */
function playDrawSound(playTime) {
    if(audioContext.state === "suspended"){
        audioContext.resume();
    }

    // ボタン押下音
    let sourcePush = audioContext.createBufferSource();
    sourcePush.buffer = audioBuffers["drawButton"];
    sourcePush.connect(audioContext.destination);
 
    // 数字めくり音（ループ再生）
    let sourceStart = audioContext.createBufferSource();
    sourceStart.buffer = audioBuffers["drawStart"];
    sourceStart.connect(audioContext.destination);
    sourceStart.loop = true;
    sourceStart.loopEnd = 3.9;  // ループ時に音声が途切れないよう再生終了時間を調整

    // 停止音
    let sourceStop = audioContext.createBufferSource();
    sourceStop.buffer = audioBuffers["drawStop"];
    sourceStop.connect(audioContext.destination);

    // 各音声を適切なタイミングで再生
    sourcePush.start();                                   // ボタン音を即座に再生
    sourceStart.start();                                  // めくり音を開始
    sourceStart.stop(audioContext.currentTime + playTime); // 指定時間後にめくり音を停止
    sourceStop.start(audioContext.currentTime + playTime); // めくり音停止と同時に停止音を再生
} 

/**
 * ページ読み込み時の初期化処理
 * AudioContextを生成し、全ての音声ファイルを非同期で読み込みます
 */
window.addEventListener("load", async ()=>{
 
    // Web Audio API用のAudioContextを生成
    audioContext = new AudioContext();
 
    // audioFilesオブジェクトを[キー, パス]の配列に変換
    const entries = Object.entries(audioFiles);
 
    // 全ての音声ファイルを読み込み、audioBuffersに格納
    audioBuffers = await getAudioBuffer(entries);
    // デバッグ用: alert("音声ソース読み込み完了！");
});
