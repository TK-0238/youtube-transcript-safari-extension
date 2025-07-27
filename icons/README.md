# アイコンについて

この拡張機能では以下のサイズのアイコンが必要です：

- icon-16.png (16x16px) - ツールバー用
- icon-32.png (32x32px) - 拡張機能一覧用
- icon-48.png (48x48px) - 拡張機能管理用
- icon-128.png (128x128px) - Chrome ウェブストア用

## デザイン仕様

作成済みのSVGファイル (icon.svg) を基に、以下の手順でPNGアイコンを作成してください：

### デザイン要素
1. **背景**: グラデーション (青紫 #667eea → 紫 #764ba2)
2. **メインアイコン**: 白い再生ボタン（YouTubeを象徴）
3. **テキストライン**: 文字起こしを表現する白い線
4. **AIアシスタント**: 黄色い小さなロボットアイコン

### 変換方法

#### オンラインツールを使用
1. [Convertio](https://convertio.co/svg-png/) などのオンライン変換ツール
2. [SVGOMG](https://jakearchibald.github.io/svgomg/) でSVG最適化後、PNG変換

#### ローカルツールを使用
```bash
# ImageMagickを使用（macOS）
brew install imagemagick
convert icon.svg -resize 16x16 icon-16.png
convert icon.svg -resize 32x32 icon-32.png
convert icon.svg -resize 48x48 icon-48.png
convert icon.svg -resize 128x128 icon-128.png
```

#### 手動作成
1. 任意の画像編集ソフト（Photoshop、GIMP、Sketch等）
2. SVGファイルを読み込み
3. 各サイズでエクスポート

## 代替方法

PNGファイルが準備できない場合は、manifest.jsonの`icons`セクションを一時的にコメントアウトすることで、デフォルトアイコンが使用されます。

```json
// "icons": {
//   "16": "icons/icon-16.png",
//   "32": "icons/icon-32.png",
//   "48": "icons/icon-48.png",
//   "128": "icons/icon-128.png"
// },
```