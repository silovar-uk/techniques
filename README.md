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

## Quiet System

Techniques自身も「迷わず使える道具」であることを優先します。

表側は **High-density Quiet UI**：情報量を減らさず、視覚的ノイズ・不要な動き・ルール数を減らす。

裏側は **Quiet Infrastructure**：Technique追加時の特殊手順を減らし、壊れたデータを公開前に止める。

UIの基本ルール：

- 検索・一覧の情報密度は落とさない
- accent colorは意味・操作・Evidenceのために使い、装飾だけには使わない
- hoverでレイアウト位置を動かさない
- shadow・blur・pill・animationは役割が説明できる場合だけ使う
- 文字サイズ・weight・spacing・radiusの種類を増やしすぎない
- キーボードfocusと `prefers-reduced-motion` を維持する

`styles.css` が基本レイアウト、`refinements.css` が横断的なQuiet Systemの最終ルールです。

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
- 思考・学習
- 文章・表現
- その他

必要になった時点で追加・整理します。カテゴリを増やした場合は `scripts/validate-techniques.mjs` の許可リストも更新します。

## Techniqueを追加する

通常の追加作業は `data/techniques.json` の編集だけです。一時的なGitHub Actions workflowをTechnique追加のために作る必要はありません。

基本データ：

- `id`: URL用の一意な小文字英数字＋ハイフン
- `number`: `T-001` 形式の一意なTechnique番号
- `title`: やりたいことをそのまま書く
- `summary`: 一覧用の短い説明
- `category`: 大分類
- `tags`: 検索補助
- `updated`: `YYYY-MM-DD`
- `quickAnswer`: 最初に見せる結論
- `steps`: 手順
- `commands`: コピペ用コマンドがある場合。ない場合は空配列
- `explanation`: 仕組みや意味の補足。ない場合は空配列
- `tips`: 注意点や代替方法。ない場合は空配列
- `sources`: 参考URL。ない場合は空配列
- `evidence.level`: `VERIFIED` / `SUPPORTED` / `PERSONAL`
- `evidence.note`: 根拠の強さを説明する短い注記

追加後はローカルで次を実行します。

```bash
node scripts/validate-techniques.mjs
```

検証するもの：

- JSONとして読めるか
- 必須fieldがあるか
- `id` / `number` が重複していないか
- categoryが許可済みか
- 日付形式が正しいか
- commands / explanation / sources等の構造が正しいか
- source URLが `http` / `https` か
- Evidenceが3段階のいずれかか

`main` へpushするとGitHub Actionsでも同じ検証を行い、エラーがある場合はPagesへdeployしません。

## 最初のTechnique

- MOVファイルから音声だけ抜く
  - FFmpegでMP3へ変換
  - 再エンコードせず音声のみコピーする方法も掲載

## GitHub Pages

`.github/workflows/pages.yml` で静的サイトをデプロイします。

公開経路はシンプルに保ちます。

```text
data/techniques.json
        ↓
validation
        ↓
GitHub Pages deploy
```

初回のみリポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

公開URL：

`https://silovar-uk.github.io/techniques/`
