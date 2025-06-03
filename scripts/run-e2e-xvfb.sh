#!/bin/bash

# WSL環境でXvfbを使用してE2Eテストを実行するスクリプト

echo "=== WSL環境 E2Eテスト (Xvfb使用) ==="

# Xvfbが利用可能かチェック
if ! command -v xvfb-run &> /dev/null; then
    echo "エラー: Xvfbがインストールされていません"
    echo "以下のコマンドでインストールしてください:"
    echo "sudo apt update && sudo apt install -y xvfb"
    exit 1
fi

# 既存のXvfbプロセスを終了
echo "既存のXvfbプロセスをクリーンアップ中..."
pkill -f Xvfb || true
pkill -f electron || true

# 少し待機
sleep 2

# 仮想ディスプレイの設定
DISPLAY_NUM=99
SCREEN_SIZE="1920x1080x24"
DISPLAY=":$DISPLAY_NUM"

echo "仮想ディスプレイを起動中... (DISPLAY=$DISPLAY, サイズ=$SCREEN_SIZE)"

# Xvfbをバックグラウンドで起動
Xvfb $DISPLAY -screen 0 $SCREEN_SIZE -ac -nolisten tcp -dpi 96 &
XVFB_PID=$!

echo "Xvfb PID: $XVFB_PID"

# Xvfbが起動するまで待機
sleep 3

# ディスプレイが利用可能かテスト
if ! DISPLAY=$DISPLAY xdpyinfo &> /dev/null; then
    echo "警告: ディスプレイの確認ができませんでした（xdpyinfoが利用不可）"
else
    echo "ディスプレイ確認: OK"
fi

# 環境変数を設定
export DISPLAY=$DISPLAY
export LIBGL_ALWAYS_INDIRECT=1
export MESA_GL_VERSION_OVERRIDE=3.3
export WEBKIT_DISABLE_COMPOSITING_MODE=1

echo "環境変数設定完了:"
echo "  DISPLAY=$DISPLAY"
echo "  LIBGL_ALWAYS_INDIRECT=$LIBGL_ALWAYS_INDIRECT"
echo "  MESA_GL_VERSION_OVERRIDE=$MESA_GL_VERSION_OVERRIDE"

# クリーンアップ関数
cleanup() {
    echo "クリーンアップ中..."
    if [ ! -z "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
    fi
    pkill -f Xvfb || true
    pkill -f electron || true
    echo "クリーンアップ完了"
}

# シグナルハンドラーを設定
trap cleanup EXIT

# E2Eテストを実行
echo "E2Eテストを実行中..."

# 引数がある場合はそれを使用、なければデフォルトテストを実行
if [ $# -eq 0 ]; then
    # デフォルト: 基本的な起動テストのみ
    npm run test:e2e -- --grep "正常な起動と終了" --timeout 600000
else
    # 引数で指定されたテストを実行
    npm run test:e2e -- "$@"
fi

TEST_EXIT_CODE=$?

echo "テスト実行完了 (終了コード: $TEST_EXIT_CODE)"

# 結果レポート
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ E2Eテスト成功"
else
    echo "❌ E2Eテスト失敗"
fi

exit $TEST_EXIT_CODE