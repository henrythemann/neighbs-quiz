export const DEFAULT_LOCALE = 'en';

const getQuizTargetLabel = ({ quizTargetLabel, quizTypeSingular }) => (
  quizTargetLabel || quizTypeSingular
);

const getAnswerNameLabel = ({ answerNameLabel, quizTypeSingular }) => (
  answerNameLabel || `${quizTypeSingular} name`
);

const getJapaneseQuizTargetLabel = ({ quizTargetLabel, quizTypeSingular }) => (
  quizTargetLabel || `ハイライトされた${quizTypeSingular}`
);

const getJapaneseAnswerNameLabel = ({ answerNameLabel, quizTypeSingular }) => (
  answerNameLabel || `${quizTypeSingular}名`
);

const UI_COPY = {
  en: {
    locale: 'en',
    htmlLang: 'en',
    loading: 'Loading map...',
    loadError: 'Unable to load this map.',
    scoreLabel: 'Score:',
    placesLeft: ({ count, pluralLabel, singularLabel }) => (
      `${count} ${count === 1 ? singularLabel : pluralLabel} left`
    ),
    skipButton: 'Skip',
    skipDetails: ' and come back later',
    switchToTypeQuiz: () => 'Type names instead',
    switchToClickQuiz: () => 'Click the map instead',
    nameHighlightedPrompt: (labels) => `What is the highlighted ${getQuizTargetLabel(labels)}?`,
    answerInputLabel: (labels) => `Highlighted ${getAnswerNameLabel(labels)}`,
    answerInputPlaceholder: (labels) => `Type the ${getAnswerNameLabel(labels)}`,
    submitAnswer: 'Submit',
    troublePrefix: 'Need help?',
    quitQuiz: ({ quizTypePlural }) => `Leave the quiz and review the ${quizTypePlural}`,
    enableGeolocation: ({ locationLabel }) => (
      `Please enable location access to show where you are on the ${locationLabel} map.`
    ),
    geolocationUnavailable: 'Location is not available in this browser.',
    knowPrompt: ({ areaName }) => `Think you know ${areaName}? `,
    takeQuiz: ({ quizTypePlural }) => `Take the ${quizTypePlural} quiz`,
    currentLocationPrefix: "You're in",
    congrats: 'All done!',
    restart: 'Restart',
    or: 'OR',
    tryMap: ({ label }) => `Try ${label}`,
    switchMapsLabel: 'Switch maps',
  },
  ja: {
    locale: 'ja',
    htmlLang: 'ja',
    loading: '地図を読み込み中...',
    loadError: 'この地図を読み込めませんでした。',
    scoreLabel: '正解率:',
    placesLeft: ({ count }) => `残り${count}問`,
    skipButton: 'スキップ',
    skipDetails: 'して後で戻る',
    switchToTypeQuiz: () => '名前を入力する形式に切り替え',
    switchToClickQuiz: () => '地図をクリックする形式に切り替え',
    nameHighlightedPrompt: (labels) => `${getJapaneseQuizTargetLabel(labels)}は？`,
    answerInputLabel: (labels) => `ハイライトされた${getJapaneseAnswerNameLabel(labels)}`,
    answerInputPlaceholder: (labels) => `${getJapaneseAnswerNameLabel(labels)}を入力`,
    submitAnswer: '回答',
    troublePrefix: '困ったときは',
    quitQuiz: ({ quizTypePlural }) => `クイズを終了して${quizTypePlural}を確認する`,
    enableGeolocation: ({ locationLabel }) => (
      `現在地を${locationLabel}の地図上に表示するには、位置情報を有効にしてください。`
    ),
    geolocationUnavailable: 'このブラウザでは位置情報を利用できません。',
    knowPrompt: ({ areaName, quizTypePlural }) => `${areaName}の${quizTypePlural}、どれくらい知っていますか？`,
    takeQuiz: ({ quizTypePlural }) => `${quizTypePlural}クイズに挑戦する`,
    currentLocationPrefix: '現在地',
    congrats: '全問終了！',
    restart: 'もう一度挑戦',
    or: 'または',
    tryMap: ({ label }) => `「${label}」に挑戦`,
    switchMapsLabel: '地図を切り替える',
  },
};

export const getUiCopy = (locale = DEFAULT_LOCALE) => {
  return UI_COPY[locale] || UI_COPY[DEFAULT_LOCALE];
};
