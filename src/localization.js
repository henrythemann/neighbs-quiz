export const DEFAULT_LOCALE = 'en';

const UI_COPY = {
  en: {
    locale: 'en',
    htmlLang: 'en',
    loading: 'Loading...',
    loadError: 'Unable to load this map.',
    scoreLabel: 'Your score:',
    placesLeft: ({ count, pluralLabel, singularLabel }) => (
      `${count} ${count === 1 ? singularLabel : pluralLabel} left`
    ),
    skipButton: 'Skip',
    skipDetails: ' and come back later',
    troublePrefix: 'Having trouble? ',
    quitQuiz: ({ quizTypePlural }) => `Quit the quiz and learn the ${quizTypePlural}`,
    enableGeolocation: ({ locationLabel }) => (
      `Please enable geolocation to show your location in the ${locationLabel}.`
    ),
    geolocationUnavailable: 'Geolocation is not available.',
    knowPrompt: ({ areaName }) => `Think you know ${areaName}? `,
    takeQuiz: ({ quizTypePlural }) => `Take our ${quizTypePlural} quiz`,
    currentLocationPrefix: "You're in",
    congrats: 'Congrats!',
    restart: 'Restart',
    or: 'OR',
    tryMap: ({ label }) => `Try ${label}`,
    switchMapsLabel: 'Switch maps',
  },
  ja: {
    locale: 'ja',
    htmlLang: 'ja',
    loading: '読み込み中...',
    loadError: 'この地図を読み込めませんでした。',
    scoreLabel: 'スコア:',
    placesLeft: ({ count, pluralLabel }) => `残り${count}${pluralLabel}`,
    skipButton: 'スキップ',
    skipDetails: 'して後で戻る',
    troublePrefix: 'お困りですか？',
    quitQuiz: ({ quizTypePlural }) => `クイズをやめて${quizTypePlural}を学ぶ`,
    enableGeolocation: ({ locationLabel }) => (
      `現在地を${locationLabel}内で表示するには、位置情報を有効にしてください。`
    ),
    geolocationUnavailable: '位置情報は利用できません。',
    knowPrompt: ({ quizTypePlural }) => `${quizTypePlural}を知っていますか？`,
    takeQuiz: ({ quizTypePlural }) => `${quizTypePlural}クイズを受ける`,
    currentLocationPrefix: '現在地',
    congrats: 'おめでとうございます！',
    restart: '最初から',
    or: 'または',
    tryMap: ({ label }) => `${label}に挑戦`,
    switchMapsLabel: '地図を切り替える',
  },
};

export const getUiCopy = (locale = DEFAULT_LOCALE) => {
  return UI_COPY[locale] || UI_COPY[DEFAULT_LOCALE];
};
