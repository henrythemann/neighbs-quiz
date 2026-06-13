export const normalizeQuizAnswer = (value, locale) => {
  return `${value}`
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase(locale)
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ');
};

export const getAcceptedQuizAnswers = (name, locale, { aliases = [], optionalSuffixes = [] } = {}) => {
  const acceptedAnswers = new Set();
  const answerValues = [name, ...aliases];

  answerValues.forEach((value) => {
    const normalizedValue = normalizeQuizAnswer(value, locale);
    if (!normalizedValue) {
      return;
    }

    acceptedAnswers.add(normalizedValue);
    optionalSuffixes.forEach((suffix) => {
      const normalizedSuffix = normalizeQuizAnswer(suffix, locale);
      if (normalizedSuffix && normalizedValue.endsWith(normalizedSuffix)) {
        const suffixlessValue = normalizedValue.slice(0, -normalizedSuffix.length).trim();
        if (suffixlessValue) {
          acceptedAnswers.add(suffixlessValue);
        }
      }
    });
  });

  return acceptedAnswers;
};
