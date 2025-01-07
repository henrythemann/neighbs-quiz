import React, { useState, useRef } from 'react'
import shuffle from './shuffle';
import { useParams } from 'react-router-dom';
import Dexie from 'dexie';
import bayData from './bayGeojson.json';
import sfData from './sfGeojson.json';
import MapPage from './MapPage';

export const db = new Dexie('quizDatabase');
db.version(1).stores({
  quizIndex: 'id, quizIndex',
  allPlacesMap: 'id, value',
  allPlacesNames: 'id, names'
});

export const replacer = (key, value) => {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    };
  } else {
    return value;
  }
}
export const reviver = (key, value) => {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export const getNewShuffledNames = (data) => {
  return shuffle(data.features
    .filter((d) => !d.properties?.not_quizzable)
    .map((d) => d.properties.name));
}
export function MapContainer() {
  const [quizIndex, setQuizIndex] = useState(0);
  const [allPlacesNames, setAllPlacesNames] = useState([]);
  const [allPlacesMap, setAllPlacesMap] = useState(new Map());
  const [numCorrect, setNumCorrect] = useState(0);
  const params = useParams();
  const isQuiz = params && params.quiz === 'quiz';
  const mapName = params && params.map ? params.map : 'map';
  const [data, setData] = useState(mapName === 'bay' ? bayData : sfData);
  // data
  React.useEffect(() => {
    if (mapName === 'sf') {
      setData(sfData);
      setAllPlacesNames(getNewShuffledNames(sfData));
    } else if (mapName === 'bay') {
      setData(bayData);
      setAllPlacesNames(getNewShuffledNames(bayData));
    }
    setAllPlacesMap(new Map());
  }, [mapName])

  React.useEffect(() => {
    const f = async () => {
      // allPlacesMap
      const dbAllPlacesMap = await db.allPlacesMap.get(mapName);
      if (dbAllPlacesMap === undefined) {
        db.allPlacesMap.put({
          value: JSON.stringify(allPlacesMap, replacer),
          id: mapName
        })
      } else {
        const tempMap = JSON.parse(dbAllPlacesMap.value, reviver);
        setAllPlacesMap(tempMap);
        let numCorrectTemp = 0;
        for (let [key, value] of tempMap) {
          if (value.missed === false && value.guessed === true) {
            numCorrectTemp++;
          }
        }
        setNumCorrect(numCorrectTemp);
      }

      // quizIndex
      const dbQuizIndex = await db.quizIndex.get(mapName);
      if (dbQuizIndex === undefined) {
        db.quizIndex.put({
          quizIndex: quizIndex,
          id: mapName
        })
      } else {
        setQuizIndex(dbQuizIndex.quizIndex);
      }

      // allPlacesNames
      const dbAllPlacesNames = await db.allPlacesNames.get(mapName);
      if (dbAllPlacesNames === undefined) {
        db.allPlacesNames.put({
          names: allPlacesNames,
          id: mapName
        })
      } else {
        setAllPlacesNames(dbAllPlacesNames.names);
      }
    }
    f();
  }, [mapName])

  const props = { data, db, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex, numCorrect, setNumCorrect, mapName, isQuiz }
  return (
    <MapPage
      {...props}
    />
  )
}