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

### 合言葉辞書（Personal Shortcuts） — Task-first UI

公開ルート：`#/prompt-transforms/shortcuts`（詳細：`#/prompt-transforms/shortcuts/<合言葉>`）。
登録当初の56件の原文（プロンプト53件、リンク3件）は変更しない。追加登録でも、指示の意味や強さを自動では書き換えない。

**情報設計（2軸）**

- **ユーザーの目的（intent）**：調べる6 / 考える13 / 書く8 / 作る6 / 学ぶ8 / 整理する4 / 進める8 / リンク3。最初の一覧に表示する分類。
- **指示の役割（role）**：主指示17 / 視点追加14 / 品質強化3 / 表現調整5 / 出力指定6 / 進行指定8 / リンク3。必要なときだけ詳細絞り込みから使用。
- **既存category**：過去の登録時カテゴリは履歴として残す。新しい分類の正本は`intent`/`role`。独立した2軸なので、従来の「調査」「批判」「文体」などの混在を避ける。
- **検索用keywords**：別表記・業務で使う検索語を補助的に付ける。名称・説明・登録原文・2軸から検索でき、合言葉完全一致を上位表示する。

**発見カード（2026-10-20追加）**

一覧を開くと58件のプロンプトからランダムで1件を提案する。登録原文を最初から表示し、コピー・再抽選・保存・組み合わせへ進める。リンク3件は除外。同じ候補は全件一巡まで再表示せず、周回境界でも直前の候補を避ける。従来の検索・分類・お気に入り・合成は継続。原文は改変せず長文だけカード内でスクロールする。

**使い方別の3層**

1. **検索→単体コピー（守）**：合言葉を覚えている人も、目的がまだ曖昧な人も、最初の検索欄から開始。結果行に名称・用途・役割とコピーを表示。全件を初期表示せず14件ずつ追加する。
2. **目的×役割の発見（破）**：上位の8分類と詳細の7役割で必要に応じて絞る。お気に入りと、未該当時の絞り込み解除で再発見を助ける。
3. **Prompt Stack（離）**：複数の合言葉を選んだときにのみ登場。↑↓で順序を変え、注意点を確認してまとめてコピーできる。おすすめの組み合わせは省略可能な詳細欄に置く。検索欄に複数の合言葉を入力したときも候補を提示する。

単体コピーは**原文そのまま**。複数を連結するときは合言葉とタイトルの見出しを区切りとして付けるが、各原文は改変しない。役割の衝突は警告するだけで勝手に削除しない。リンク用の3件は外部サイトを開く。お気に入りの合言葉キーだけを`localStorage`に保存し、プロンプト本文や検索条件は送信・永続保存しない。既存の「せい→せいぷろ」のキー変更はお気に入り移行処理で引き継ぐ。ChatGPT本体の入力欄で自動展開する機能は持たない。

**運用と検証**

- 内容の正本：`data/prompt-shortcuts.json`。`key`,`kind`,`title`,`summary`,`category`,`intent`,`role`,`content`または`url`,`order`、任意の`keywords`。
- UI：`prompt-shortcuts.js`、共通の`styles.css`。検索・編集・コピーはブラウザ上だけで処理。
- CI：`node scripts/validate-techniques.mjs`、`node scripts/check-prompt-shortcuts.mjs`、`node --check`を専用のGitHub Actions検証ジョブで実行。
- 受入試験：①既知の合言葉を1タップでコピー②知らない語から目的カテゴリ経由で発見③2件を追加し順序を変更、原文の無断変更なし④長文や複数条件でページが崩れない⑤iPhone Safariでタッチ・キーボード・スクロールが支障なく動く。
- 評価指標（測定前の目標）：既知語のコピーまで3操作以内、未知語は10秒以内に候補へ到達、組み合わせコピーは6操作以内を目安として実機テストで見直す。これは実測結果ではない。

#### 守破離の判断

守：Quiet UIの読みやすさ、原文保証、即コピーを保つ。
破：カテゴリの混線を「目的×役割」に分け、索引を覚えなくても探せるようにする。
離：原文の倉庫を「指示の部品で仕事の進め方を組み立てる道具」へ発展させる。ただし編集機能は必要になるまで隠し、便利さ＞演出を守る。

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

`main` へpushするとGitHub Actionsで検証します。**現在はGitHub Pagesの標準ブランチ公開とは別ジョブ**のため、検証失敗だけでは公開を自動停止しません。更新時には検証結果を確認してください。

## Interactionの原則

- 検索結果の並び替えでposition animationを使わない
- WANDERは現在の検索・カテゴリ文脈を優先する
- `/` で検索へ移動、`Escape` でLibraryへ戻る操作を維持する
- keyboardでTechniqueを開いた場合、Detailの見出しへfocusを移す
- keyboardでLibraryへ戻った場合、直前のTechnique rowへfocusを戻す
- Copy feedbackは `COPY → COPIED ✓` の文字変化を基本とし、意味のない演出用stateを持たない

## GitHub Pages

公開URL：`https://silovar-uk.github.io/techniques/`。

現在の公開はGitHubが生成する **pages build and deployment** ジョブで確認しています。
以前は`.github/workflows/pages.yml`からも`deploy-pages`を実行していましたが、標準のPages公開と同時実行になると競合（deployment in progress）するため、**このワークフローは検証専用**に変更しました。

- `main`への変更：`Validate Techniques and Shortcut UX`でデータ・JS構文・ショートカットの検索と結合のスモークテスト
- GitHub Pages：リポジトリ側の標準Pages公開機構で反映
- 検証ジョブと公開ジョブが独立しているため、検証失敗は自動的には公開を止めません。実装後は両方を確認します

検証の強制ゲートが必要になった場合は、Pagesの公開元をGitHub Actionsに一本化するなど、リポジトリ設定を含めて切り替えてください（同時に二系統からdeployしない）。

