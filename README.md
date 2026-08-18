# Techniques

あとで思い出すための、やり方の置き場。

PC・仕事・暮らしなど、ジャンルを限定せず「どうやるんやったっけ？」をすぐ取り戻すための小さな手順を残します。

## 方針

- まず結論を書く
- 1分程度で要点がつかめる長さを基本にする
- 必要な項目だけ背景や仕組みまで少し深掘りする
- コマンドや手順は、そのまま使える形にする
- ITだけに限定しない
- 参考にした公式情報・一次情報へのリンクを付ける

## カテゴリ

カテゴリは細分化しすぎず、大きな用途で分けます。

- PC・スマホ
- 動画・音声
- Web・開発
- 仕事・事務
- 暮らし
- お金
- 移動・旅行
- 健康・身体
- その他

必要になった時点で追加・整理します。

## Techniqueを追加する

`data/techniques.json` に1件追加すると、トップの一覧・検索・カテゴリ絞り込み・個別ページに自動反映されます。

基本データ：

- `id`: URL用の一意な英数字
- `title`: やりたいことをそのまま書く
- `summary`: 一覧用の短い説明
- `category`: 大分類
- `tags`: 検索補助
- `updated`: 更新日
- `quickAnswer`: 最初に見せる結論
- `steps`: 手順
- `commands`: コピペ用コマンドがある場合
- `explanation`: 仕組みやコマンドの意味を補足する場合
- `tips`: 注意点や代替方法
- `sources`: 参考URL

## 最初のTechnique

- MOVファイルから音声だけ抜く
  - FFmpegでMP3へ変換
  - 再エンコードせず音声のみコピーする方法も掲載

## GitHub Pages

`.github/workflows/pages.yml` で静的サイトをデプロイします。

初回のみリポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

公開URL想定：

`https://silovar-uk.github.io/techniques/`
