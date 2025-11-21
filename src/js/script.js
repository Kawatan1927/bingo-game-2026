/**
 * @fileoverview ビンゴゲームのメインスクリプト
 * ビンゴ番号の抽選、景品選択、画面遷移などのゲーム全体の制御を行います。
 */

/**
 * ビンゴ番号の配列（1-75までをシャッフルしたもの）
 * @type {number[]}
 */
let bingoNumbers = [];

/**
 * 既に抽選された番号の履歴
 * @type {number[]}
 */
let calledNumbers = [];

/**
 * 現在の抽選回数
 * @type {number}
 */
let drawingCount = 0;

/**
 * 現在表示中の画面ID
 * @type {string}
 */
let currentScreen = 'bingoScreen';

/**
 * 全画面表示中かどうかのフラグ
 * @type {boolean}
 */
let isFullscreen = false;

/**
 * アニメーション長（ミリ秒）
 * @type {number}
 */
let animationLength;

/**
 * 初回抽選時のみ異なるアニメーション長を使用するかのフラグ
 * @type {boolean}
 */
let individualFirstAnimationSetting;

/**
 * 初回抽選時のアニメーション長（ミリ秒）
 * @type {number}
 */
let firstAnimationLength;

/**
 * アニメーション長の最小値（ミリ秒）
 * @type {number}
 */
let animationLengthMin = 1000;

/**
 * アニメーション長の最大値（ミリ秒）
 * @type {number}
 */
let animationLengthMax = 10000;

/**
 * 保存ログフォルダのパス
 * @type {string}
 */
let saveLogFolderPath;

/**
 * メインプロセスから設定ファイルの値を受信およびキャスト
 * アニメーション長などの設定値をレンダラープロセス側で受け取る
 */
window.api.on("settings", (arg) => {
    animationLength = parseInt(arg.animationLength);
    individualFirstAnimationSetting = Boolean(arg.individualFirstAnimationSetting);
    firstAnimationLength = parseInt(arg.firstAnimationLength);
});

// アニメーション長設定欄の要素取得
const inputAnimationLength = document.getElementById("animationLength");
const animationToggle = document.getElementById('animationToggle');
const inputFirstAnimation = document.getElementById('firstAnimationLength');

/**
 * 全画面表示の管理
 * 全画面表示ボタンをクリックすると画面全体を使用した表示に切り替わります
 */
document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!isFullscreen) {
        document.documentElement.requestFullscreen();
    }
});

/**
 * 全画面表示状態の変更を検知
 * 全画面表示ボタンの表示/非表示を制御します
 */
document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    document.getElementById('fullscreenBtn').style.display = isFullscreen ? 'none' : 'block';
});

/**
 * ESCキーでの全画面解除を防ぐ
 * 誤操作による全画面解除を防止します
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
    }
});

/**
 * 起動時処理
 * ビンゴ番号配列の生成と設定ファイルの値を設定欄に反映します
 * 音声ファイル読み込み完了を待つため、1.5秒の遅延を設けています
 */
window.onload = function () {
    setTimeout(() => {
    bingoNumbers = fisherYateShuffle(forRange(1, 75));  // 1-75の配列を生成してシャッフル
    console.log(bingoNumbers);

    // 設定値をUIに反映
    inputAnimationLength.value = animationLength;
    animationToggle.checked = individualFirstAnimationSetting;
    inputFirstAnimation.value = firstAnimationLength;
    if(animationToggle.checked != true){
        inputFirstAnimation.disabled = true;  // トグルOFFの場合は初回設定を無効化
    }
    }, 1500);
};

/**
 * a~zまでの連番配列を生成する関数
 * @param {number} a - 開始番号
 * @param {number} z - 終了番号
 * @returns {number[]} - 連番配列
 */
const forRange = (a, z) => {
    var lst = [];
    for (let i = a; i <= z; i++) {
        lst.push(i)
    }
    return lst
}

/**
 * 配列シャッフル関数(Fisher-Yate Shuffle)
 * @param {number[]} numberArray - シャッフルする配列
 * @returns {number[]} - シャッフルされた配列
 */
function fisherYateShuffle(numberArray) {
    for (let i = numberArray.length - 1; i > 0; i--) {
        let r = Math.floor(Math.random() * (i + 1));
        let tmp = numberArray[i];
        numberArray[i] = numberArray[r];
        numberArray[r] = tmp;
    }
    return numberArray;
};

/**
 * 画面遷移を制御する関数
 * @param {string} screenId - 遷移先の画面ID
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
}

/**
 * ビンゴ番号抽選処理
 * 抽選ボタンクリックで番号をアニメーション表示し、履歴に追加します
 * アニメーション中はボタンを無効化し、二重押しを防止します
 */
document.getElementById('drawButton').addEventListener('click', () => {
    const gameControlButtons = document.querySelectorAll('.game-control-btn');

    // 全75個の番号が出尽くしたかチェック
    if (calledNumbers.length >= 75) {
        alert('すべての番号が出ました');
        return;
    }

    // アニメーション中はボタンを無効化
    gameControlButtons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
    });

    let number = bingoNumbers[drawingCount];
    animateNumber(number);

    // 初回のみ異なるアニメーション長を使用するか判定
    const time = (drawingCount == 0) && animationToggle.checked ? firstAnimationLength : animationLength;
    drawingCount++;

    // メインプロセスにゲーム状態を送信（ログ保存用）
    if (drawingCount == 1){
        window.api.send(
            "gameStart",
            {
                bingoNumbers,
                drawingCount
            }
        );
    }else{
        window.api.send(
            "countUpdate",
            {
                bingoNumbers,
                drawingCount
            }
        );
    }

    playDrawSound(time / 1000);  // ミリ秒を秒に変換して音声再生

    // アニメーション完了後にボタンを再度有効化
    setTimeout(() => {
        gameControlButtons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
        });
        enhanceDrawAnimation(number);
    }, time);
});

/**
 * 数字めくりアニメーション
 * ランダムな数字を高速で切り替えた後、最終的に抽選された番号を表示します
 * @param {number} targetNumber - 最終的に表示する抽選番号
 */
function animateNumber(targetNumber) {
    const currentNumber = document.getElementById('currentNumber');
    let count = 0;
    const duration = (drawingCount == 0) && animationToggle.checked ? firstAnimationLength : animationLength;
    const interval = 50; // 50ミリ秒ごとに数字を更新
    const steps = duration / interval;  // 総更新回数を計算

    const animation = setInterval(() => {
        if (count < steps) {
            // ランダムな数字（1-75）を表示
            currentNumber.textContent = Math.floor(Math.random() * 75) + 1;
            count++;
        } else {
            // アニメーション完了時に正しい番号を表示
            clearInterval(animation);
            currentNumber.textContent = targetNumber;
            calledNumbers.push(targetNumber);  // 履歴に追加
            updateHistory();
        }
    }, interval);
}

/**
 * ビンゴ番号履歴を更新する関数
 */
function updateHistory() {
    const history = document.getElementById('numberHistory');
    history.innerHTML = '';
    calledNumbers.forEach(num => {
        const numberElement = document.createElement('div');
        numberElement.className = 'history-number';
        numberElement.textContent = num;
        history.appendChild(numberElement);
    });
}

/**
 * 画面の初期化処理を行う関数
 * 初期画面の表示を行います
 */
function initializeScreen() {
    // 初期画面（ビンゴ画面）を表示
    showScreen('bingoScreen');
    
    // 全画面ボタンの表示状態を初期化
    isFullscreen = !!document.fullscreenElement;
    document.getElementById('fullscreenBtn').style.display = isFullscreen ? 'none' : 'block';
}

/**
 * 画面読み込み時の初期化処理
 */
window.addEventListener('load', initializeScreen);

/**
 * エラーハンドリング
 * グローバルエラーをキャッチしてコンソールに出力します
 */
window.addEventListener('error', (e) => {
    console.error('エラーが発生しました:', e.message);
    // エラー時のフォールバック処理を追加することができます
});

/**
 * 画面サイズ変更時の処理
 * 全画面表示時は全画面ボタンを非表示にします
 */
window.addEventListener('resize', () => {
    if (document.fullscreenElement) {
        document.getElementById('fullscreenBtn').style.display = 'none';
    }
});

/**
 * ビンゴ番号抽選時の視覚演出
 * 抽選された番号を2秒間ハイライト表示します
 * @param {number} number - 抽選された番号
 */
function enhanceDrawAnimation(number) {
    const currentNumber = document.getElementById('currentNumber');
    currentNumber.classList.add('highlight');
    setTimeout(() => currentNumber.classList.remove('highlight'), 2000);
}

/**
 * 設定モーダル操作用の要素取得
 */
const modal = document.querySelector('.js-modal');
const modalButton = document.querySelector('.js-modal-button');
const modalComplete = document.querySelector('.js-complete-button');
const modalClose = document.querySelector('.js-close-button');
const saveLogFolder = document.getElementById('log-folder');

/**
 * 設定ボタン押下時イベント
 * 設定モーダルを開きます
 */
modalButton.addEventListener('click', () => {
    playTransitionSound();
    modal.classList.add('is-open');
});

/**
 * 設定完了ボタン押下時イベント
 * 入力された設定値を検証・保存し、ログファイルからの復元処理も行います
 */
modalComplete.addEventListener('click', () => {
    playDecisionSound();
    modal.classList.remove('is-open');
    
    // 入力値の検証と取得
    animationLength = inputValueCheck(inputAnimationLength);
    individualFirstAnimationSetting = animationToggle.checked;
    firstAnimationLength = inputValueCheck(inputFirstAnimation);

    var fileName = saveLogFolder.value.substr(12, 12);

    // メインプロセスにアニメーション設定を送信
    window.api.send(
        "update_animation_length",
        {
            animationLength,
            individualFirstAnimationSetting,
            firstAnimationLength
        }
    );

    // ログファイルが選択されている場合は復元処理
    if(saveLogFolder.value != ""){
        window.api.send(
            "readLogFile",
            {
                fileName
            }
        );

        // ログデータを受信して状態を復元
        setTimeout(() => {
            window.api.on("recover", (arg) => {
                // ビンゴ番号配列と抽選回数を復元
                for(var i = 0; i < 75; i++){
                    bingoNumbers[i] = arg.returnNumbers[i];
                }
    
                drawingCount = arg.returnNumbers[75];
    
                // 抽選履歴を復元
                for(var j = 0; j < drawingCount; j++){
                    calledNumbers.push(bingoNumbers[j]);
                    updateHistory();
                }
    
                console.log(bingoNumbers, drawingCount);
            });
        }, 500)
    }
});

/**
 * キャンセルボタン押下時イベント
 * 設定を元に戻してモーダルを閉じます
 */
modalClose.addEventListener('click', () => {
    playCancelSound();
    modal.classList.remove('is-open');
    inputAnimationLength.value = animationLength;  // 元の値に戻す
});

/**
 * 初回アニメーション長設定トグル押下時イベント
 * トグルの状態に応じて初回アニメーション長入力欄の有効/無効を切り替えます
 */
animationToggle.addEventListener('change', () => {
    if(animationToggle.checked){
        inputFirstAnimation.disabled = false;
    }else{
        inputFirstAnimation.disabled = true;
    }
})

/**
 * アニメーション長の入力値チェック関数
 * 入力値を1000ms～10000msの範囲に制限します
 * @param {HTMLInputElement} inputValueElem - チェック対象の入力要素
 * @returns {number} 検証後の値（最小値～最大値の範囲内）
 */
function inputValueCheck(inputValueElem) {
    if(inputValueElem.value < animationLengthMin){
        inputValueElem.value = animationLengthMin;
        return animationLengthMin;
    }else if(inputValueElem.value > animationLengthMax){
        inputValueElem.value = animationLengthMax;
        return animationLengthMax;
    }else{
        return inputValueElem.value;
    };
}

/**
 * 保存先フォルダ入力欄の制御（jQuery使用）
 * ボタンクリックで隠しファイル入力をトリガーします
 */
$('#js-selectFolder').on('click', 'button', function () {
    $('#log-folder').click();
    return false;
});

/**
 * ログフォルダ選択時の処理
 * 選択されたファイル情報を画面に表示します
 */
$('#log-folder').on('change', function() {
    // 選択したファイル情報を取得
    var file = $(this).prop('files')[0];
    // 選択状態表示を更新
    $('#js-selectFolder').find('.choose-status').addClass('select').html('選択中');
    // 初回選択時はファイル名表示用の要素を追加
    if(!($('.filename').length)){
        $('#js-selectFolder').append('<div class="foldername"></div>');
    };
    // ファイル名を表示
    $('.foldername').html('フォルダ名：' + file.name);
});