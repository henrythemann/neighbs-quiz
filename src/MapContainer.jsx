import React, { useState } from 'react'
import shuffle from './shuffle';
import Dexie from 'dexie';
const bayData = require('./bayGeojson.json');
const sfData = require('./sfGeojson.json');

export const db = new Dexie('quizDatabase');
db.version(1).stores({
  quizIndex: 'id, quizIndex',
  // allPlacesMap: 'name, guessed, missed',
  allPlacesNames: 'id, names'
});

export function MapContainer({ mapName, children: Children }) {
  const [data, setData] = useState(mapName === 'bay' ? bayData : sfData);
  const [quizIndex, setQuizIndex] = useState(0);
  const [allPlacesNames, setAllPlacesNames] = useState(shuffle(data.features.map((d) => d.properties.name)));
  const [allPlacesMap, setAllPlacesMap] = useState(new Map());

  React.useEffect(() => {
    if (mapName === 'sf') {
      setData(sfData);
      setAllPlacesNames(shuffle(sfData.features.map((d) => d.properties.name)));
      setAllPlacesMap(new Map());
    } else if (mapName === 'bay') {
      setData(bayData);
      setAllPlacesNames(shuffle(bayData.features.map((d) => d.properties.name)));
      setAllPlacesMap(new Map());
    }
  }, [mapName])
  

  React.useEffect(() => {
    const f = async () => {
      const dbQuizIndex = await db.quizIndex.get(mapName);
      if (dbQuizIndex === undefined) {
        db.quizIndex.put({
          quizIndex: quizIndex,
          id: mapName
        })
      } else {
        setQuizIndex(dbQuizIndex.quizIndex);
      }
    }
    f();
  }, [])
  React.useEffect(() => {
    const f = async () => {
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
  }, [])
  
  const props = { data, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex }
  return (
    <Children
      {...props}
    />
  )
  // return <div>
  //   <h1>{quizIndex}</h1>
  //   <h1>{allPlacesNames[quizIndex]}</h1>
  //   <button onClick={() => db.quizIndex.clear()}>clear</button>
  //   <button onClick={() => {
  //     setQuizIndex(quizIndex + 1);
  //     db.quizIndex.put(
  //       {
  //         quizIndex: quizIndex + 1,
  //         id: 1
  //       }
  //     )
  //   }}>increment</button>
  // </div>
}