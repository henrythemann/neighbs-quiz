export const getQuizProgress = (allPlacesNames, allPlacesMap, quizIndex) => {
  let nextUnguessedIndex = -1;
  let fallbackUnguessedIndex = -1;
  let placesLeft = 0;

  allPlacesNames.forEach((name, index) => {
    if (allPlacesMap.get(name)?.guessed) {
      return;
    }

    placesLeft++;
    if (fallbackUnguessedIndex === -1) {
      fallbackUnguessedIndex = index;
    }
    if (nextUnguessedIndex === -1 && index >= quizIndex) {
      nextUnguessedIndex = index;
    }
  });

  const currentQuizIndex = nextUnguessedIndex === -1 ? fallbackUnguessedIndex : nextUnguessedIndex;
  return {
    currentQuizIndex,
    currentQuizName: currentQuizIndex === -1 ? '' : allPlacesNames[currentQuizIndex],
    placesLeft,
    answeredCount: allPlacesNames.length - placesLeft,
  };
};
