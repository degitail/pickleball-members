// 週次戦術のデータ。新しい週は、この配列の先頭に1件追加します。
// 図解は assets/tactics/ に SVG ファイルを置き、image にそのパスを書きます。
export const TACTICS_ISSUES = [
  {
    vol: 2,
    date: "2026-11-08",
    title: "今週のピックルボール戦術 3選（Vol.2）",
    items: [
      {
        title: "1. 目的のあるディンク",
        image: "assets/tactics/vol2-01.svg",
        imageAlt: "図解：相手のバックハンド側の足元を狙うディンクのコート図",
        body: "ディンクは「ただ返す」ものではなく、相手を困らせるために打ちます。狙いは相手のバックハンド側の腰・足元です。低いボールを打たせ続ければ相手は攻められず、こちらは攻めるのはネットより高い球だけに絞ります。",
        point: "実戦メモ：1球ごとに「どこへ落とすか」を決めてから打つと、なんとなくの返球が減ります。",
        sourceLabel: "Pickleball Strategy Guide（pickleballus.org）Strategy #5「Dinking With Intent」",
        sourceUrl: "https://pickleballus.org/play/strategy/",
      },
      {
        title: "2. スタッキング",
        image: "assets/tactics/vol2-02.svg",
        imageAlt: "図解：2人が同じ側に並び、打った後に得意な側へ動くスタッキングのコート図",
        body: "サーブ／リターンの前に2人が同じ側に並び、打った後にそれぞれ得意な側へ動く並び方です。目的は、強いフォアを真ん中に置くこと。並び方・移動先・合図を先に決めておくのが前提になります。",
        point: "実戦メモ：始めるなら「サーブの時だけ」など小さい範囲から試すと混乱しません。",
        sourceLabel: "The Dink「How to Be a Better Doubles Partner in Pickleball」",
        sourceUrl: "https://www.thedinkpickleball.com/how-to-be-a-better-doubles-partner-in-pickleball/",
      },
      {
        title: "3. ポーチング",
        image: "assets/tactics/vol2-03.svg",
        imageAlt: "図解：クロスコート返球を読んでキッチンから割り込むポーチングのコート図",
        body: "パートナーのディンクで相手をバックハンド側コーナーに追い込んだら、返球はほぼクロスコートに限られます。そこを読んでキッチンラインから真ん中へ割り込んで取るのがポーチングです。合図なしにやると衝突や空きの原因になるので、ペアでの約束事が必須です。",
        point: "実戦メモ：外した場合にパートナーが空いた側をカバーする約束まで、セットで決めておきます。",
        sourceLabel: "The Dink「How to Be a Better Doubles Partner in Pickleball」",
        sourceUrl: "https://www.thedinkpickleball.com/how-to-be-a-better-doubles-partner-in-pickleball/",
      },
    ],
  },
  {
    vol: 1,
    date: "2026-11-01",
    title: "今週のピックルボール戦術 3選（Vol.1）",
    items: [
      {
        title: "1. サードショットはリターンで決める",
        image: "assets/tactics/vol1-01.svg",
        imageAlt: "図解：高いリターンはドライブ、低いリターンはドロップでキッチンへ落とすコート図",
        body: "「いつもドロップ」でも「いつもドライブ」でもなく、相手のリターンを見て選びます。短く高く浮いたらドライブで圧をかける。深く強くて体勢が崩れたら、まずドライブで次の球を楽にする。逆に浅くて低い球、深くても柔らかい球は、キッチンへ落とすドロップが合います。",
        point: "実戦メモ：打つ前に「高いか、低いか」だけ声に出すと判断が速くなります。",
        sourceLabel: "Pickleball.com「Take your pickleball IQ to the next level with Tanner Tomassi」",
        sourceUrl: "https://pickleball.com/learn/take-your-pickleball-iq-to-the-next-level-with-tanner-tomassi",
      },
      {
        title: "2. 基本はクロスコート",
        image: "assets/tactics/vol1-02.svg",
        imageAlt: "図解：クロスコートへの矢印と、ネット中央が一番低いことを示すコート図",
        body: "プロがクロスを多用する理由は、ネット中央が一番低く、対角は奥行きの余裕も大きくなるからです。リターン、ディンク、サードドロップ、ドライブのどれも、まずはクロスか「真ん中寄りのクロス」が安定します。ストレートは相手の裏をかく時だけに絞ると、サイドアウトが減ります。",
        point: "実戦メモ：迷ったらクロス。ストレートは「相手がクロスを待っている」と感じた時だけ。",
        sourceLabel: "Pickleball.com「Hit it crosscourt!」",
        sourceUrl: "https://pickleball.com/learn/hit-it-crosscourt",
      },
      {
        title: "3. 真ん中は左側フォア優先（50/50にしない）",
        image: "assets/tactics/vol1-03.svg",
        imageAlt: "図解：左側プレイヤーが約60%、右側が約40%を担当し、真ん中は左のフォアで取るコート図",
        body: "右利き同士のペアでは、左側の選手のフォアが真ん中に来ます。だから真ん中の球は左側が広く取る方が、角度的にも強さ的にも有利です。右側は少し外寄りに構えてバックハンドでスピードアップを待ち、返球が真ん中へ流れて左側のフォアにつながる形を作ります。",
        point: "実戦メモ：試合前に一言「真ん中は左フォア優先」でOK。左利きが混ざるペアでは逆になるので、その都度確認を。",
        sourceLabel: "The Dink Pickleball「Advanced Pickleball Doubles Strategy from Top Pro（Collin Johns）」",
        sourceUrl: "https://www.thedinkpickleball.com/advanced-pickleball-doubles-strategy/",
      },
    ],
  },
];
