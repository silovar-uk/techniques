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
- 弱くしても意味は消さない。特にEvidenceはmobileでも原則ラベルを残す
- 戻る操作では、scroll位置だけでなくkeyboard focusの文脈も復元する
- 再訪時の検索・一覧到達を優先し、Introや自己紹介的な情報を大きくしすぎない
- tagsは検索用metadataを主用途とし、一覧・詳細で常時見せる情報は必要最小限にする
- UI変更は Retrieval Speed / Scan Efficiency / Action Readiness の改善理由を説明できるものだけ採用する
- 検索は複数語を空白で組み合わせられ、title / tags / category / summary / Quick Answerの近さで軽く並べ替える
- keyboardでは `/` → 入力 → `↓` → `↑↓` → `Enter` で検索からTechniqueを開ける。検索結果が1件だけなら入力欄の `Enter` から直接開ける
- 検索改善は新しいUI・dependency・network requestを増やさず、既存JSONだけで成立させる
- Quiet Delightは色やanimationを増やすのではなく、既存のT-number / Field Mark / connectionを使って小さな発見を作る
- Field Markはid由来のsignature、category由来のtick、Evidence表現を組み合わせたTechnique fingerprintとして扱う
- 記事末尾のONE MOREは候補を1件だけ表示し、shared tags / same category / deterministic odd connectionから軽く導出する
- WANDERは「用事がないときの回遊入口」として扱い、検索導線より強く主張させない

CSSは **`styles.css` を唯一の正本** とします。確定済みのQuiet UIルールを別ファイルで上書きせず、componentの元selectorとmedia queryへ直接記述します。新しいCSSファイルを「調整用レイヤー」として常設しません。

assetのcache versionは、見た目・挙動のまとまりごとに `YYYYMMDD-短いフェーズ名+連番`（例：`20260826-core1`）の形で更新します。変更していないassetのversionは無理に動かしません。

## カテゴリ

カテゴリの順序と許可値は `data/categories.json` を唯一の正本にします。

現在の順序：

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

カテゴリを増減・並べ替えするときは `data/categories.json` だけを編集します。表示側とvalidatorは同じファイルを参照します。

## プロンプト変換（特設コーナー）

公開ルート：`#/prompt-transforms`（個別URLは `#/prompt-transforms/<id>`）。
トップページの専用カードから入る。通常のTechniqueのカテゴリや検索結果へは混ぜない。

このコーナーは「完成したプロンプトを並べる」だけではなく、**使う状況から探す → Before/Afterで改善理由を把握する → 条件を差し替えてコピーする**ための道具。守・破・離は強制ステップではなく、画面内の3つの利用レベルとして扱う。

- **守（比較）**：曖昧な元の依頼と、改善の原理を対比する。
- **破（編集）**：テンプレートの `{{変数}}` を自分のテーマなどに差し替え、完成版をコピーする。個別URLを共有できる。
- **離（転用）**：特定の文面から独立した改善原理と、避けたい失敗を取り出す。
- 一覧は検索・6分類・直接コピーを優先。スマホでは編集とコピーを同じ画面で完結させる。
- テンプレートにAIの自動変換機能は含まれない。編集・差し替えはブラウザ上だけで実行し、入力内容を外部へ送信・永続保存しない（タブ内メモリのみ）。
- 検証の指標：目当ての変換発見時間、検索→コピーに必要な操作数、編集成功率、iPhoneでの誤操作、キーボード操作、画面復帰時の検索条件。

追加・編集する場合は **`data/prompt-transforms.json`** のみ修正する。
1件は `id / group / title / before / template / principle / avoid / defaults / tags / order` で構成。テンプレートで用いる `{{変数}}` と `defaults` のキーを揃える。`order` と `id` は重複禁止。表示ロジックは `prompt-transforms.js`、スタイルの正本は従来どおり `styles.css`。

データの検証は既存の `node scripts/validate-techniques.mjs` に含めてあり、GitHub Pagesのデプロイ時にも実行する。

### このUIの守破離

- **守**：現行TechniquesのHigh-density Quiet UIと色・文字・検索の一貫性を守る。
- **破**：1 Technique＝1説明ページという構造を、Before/After→編集→コピーへ置き換える。
- **離**：プロンプトという文章ではなく、仕事を改善する「変換原理」を再利用できるようにする。必要なら具体的な元文を忘れても使える。


## Techniqueを追加する

通常の追加作業は `data/techniques.json` の編集だけです。一時的なGitHub Actions workflowをTechnique追加のために作る必要はありません。

基本データ：

- `id`: URL用の一意な小文字英数字＋ハイフン
- `number`: `T-001` 形式の一意なTechnique番号
- `title`: やりたいことをそのまま書く
- `summary`: 一覧用の短い説明
- `category`: `data/categories.json` に存在する大分類
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

- `data/categories.json` が配列で、重複がないか
- JSONとして読めるか
- 必須fieldがあるか
- `id` / `number` が重複していないか
- categoryが正本に存在するか
- 日付形式が正しいか
- commands / explanation / sources等の構造が正しいか
- source URLが `http` / `https` か
- Evidenceが3段階のいずれかか

`main` へpushするとGitHub Actionsでも同じ検証を行い、エラーがある場合はPagesへdeployしません。

## Interactionの原則

- 検索結果の並び替えでposition animationを使わない
- WANDERは現在の検索・カテゴリ文脈を優先する
- `/` で検索へ移動、`Escape` でLibraryへ戻る操作を維持する
- keyboardでTechniqueを開いた場合、Detailの見出しへfocusを移す
- keyboardでLibraryへ戻った場合、直前のTechnique rowへfocusを戻す
- Copy feedbackは `COPY → COPIED ✓` の文字変化を基本とし、意味のない演出用stateを持たない

## GitHub Pages

`.github/workflows/pages.yml` で静的サイトをデプロイします。

公開経路はシンプルに保ちます。

```text
data/categories.json
        +
data/techniques.json
        ↓
validation
        ↓
GitHub Pages deploy
```

初回のみリポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。

公開URL：

`https://silovar-uk.github.io/techniques/`
