import { useEffect, useState } from 'react'
import shuffle from './shuffle';
import { useParams } from 'react-router-dom';
import Dexie from 'dexie';
import MapPage from './MapPage';
import { DEFAULT_LOCALE, getUiCopy } from './localization';

const bayDataUrl = new URL('./bayGeojson.json', import.meta.url).href;
const sfDataUrl = new URL('./sfGeojson.json', import.meta.url).href;
const prefecturesDataUrl = new URL('./prefectures.geojson', import.meta.url).href;
const japanRegionsDataUrl = new URL('./japanRegionsGeojson.json', import.meta.url).href;

const loadJsonAsset = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load map data: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const PREFECTURE_FURIGANA = {
  '北海道': 'ほっかいどう',
  '青森県': 'あおもりけん',
  '岩手県': 'いわてけん',
  '宮城県': 'みやぎけん',
  '秋田県': 'あきたけん',
  '山形県': 'やまがたけん',
  '福島県': 'ふくしまけん',
  '茨城県': 'いばらきけん',
  '栃木県': 'とちぎけん',
  '群馬県': 'ぐんまけん',
  '埼玉県': 'さいたまけん',
  '千葉県': 'ちばけん',
  '東京都': 'とうきょうと',
  '神奈川県': 'かながわけん',
  '新潟県': 'にいがたけん',
  '富山県': 'とやまけん',
  '石川県': 'いしかわけん',
  '福井県': 'ふくいけん',
  '山梨県': 'やまなしけん',
  '長野県': 'ながのけん',
  '岐阜県': 'ぎふけん',
  '静岡県': 'しずおかけん',
  '愛知県': 'あいちけん',
  '三重県': 'みえけん',
  '滋賀県': 'しがけん',
  '京都府': 'きょうとふ',
  '大阪府': 'おおさかふ',
  '兵庫県': 'ひょうごけん',
  '奈良県': 'ならけん',
  '和歌山県': 'わかやまけん',
  '鳥取県': 'とっとりけん',
  '島根県': 'しまねけん',
  '岡山県': 'おかやまけん',
  '広島県': 'ひろしまけん',
  '山口県': 'やまぐちけん',
  '徳島県': 'とくしまけん',
  '香川県': 'かがわけん',
  '愛媛県': 'えひめけん',
  '高知県': 'こうちけん',
  '福岡県': 'ふくおかけん',
  '佐賀県': 'さがけん',
  '長崎県': 'ながさきけん',
  '熊本県': 'くまもとけん',
  '大分県': 'おおいたけん',
  '宮崎県': 'みやざきけん',
  '鹿児島県': 'かごしまけん',
  '沖縄県': 'おきなわけん',
};

const REGION_FURIGANA = {
  '北海道地方': 'ほっかいどうちほう',
  '東北地方': 'とうほくちほう',
  '関東地方': 'かんとうちほう',
  '中部地方': 'ちゅうぶちほう',
  '近畿地方': 'きんきちほう',
  '中国地方': 'ちゅうごくちほう',
  '四国地方': 'しこくちほう',
  '九州・沖縄地方': 'きゅうしゅう・おきなわちほう',
};

const MAP_CONFIGS = {
  bay: {
    locale: DEFAULT_LOCALE,
    loadData: () => loadJsonAsset(bayDataUrl),
    label: 'Bay Area Cities',
    labels: {
      en: 'Bay Area Cities',
      ja: 'ベイエリアの都市',
    },
    areaName: 'the Bay Area',
    quizTypePlural: 'cities',
    quizTypeSingular: 'city',
    locationLabel: 'Bay Area',
    searchQuerySuffix: ', California',
  },
  sf: {
    locale: DEFAULT_LOCALE,
    loadData: () => loadJsonAsset(sfDataUrl),
    label: 'San Francisco Neighborhoods',
    labels: {
      en: 'San Francisco Neighborhoods',
      ja: 'サンフランシスコの地区',
    },
    areaName: 'San Francisco',
    quizTypePlural: 'neighborhoods',
    quizTypeSingular: 'neighborhood',
    locationLabel: 'San Francisco',
    searchQuerySuffix: ' neighborhood san francisco',
  },
  japan: {
    locale: 'ja',
    loadData: () => loadJsonAsset(prefecturesDataUrl),
    label: '日本の都道府県',
    labels: {
      en: 'Japan Prefectures',
      ja: '日本の都道府県',
    },
    areaName: '日本',
    quizTypePlural: '都道府県',
    quizTypeSingular: '都道府県',
    quizTargetLabel: 'ハイライトされた都道府県',
    answerNameLabel: '都道府県名',
    locationLabel: '日本',
    searchQuerySuffix: ' 都道府県',
    furiganaByName: PREFECTURE_FURIGANA,
  },
  'japan-regions': {
    locale: 'ja',
    loadData: () => loadJsonAsset(japanRegionsDataUrl),
    label: '日本の地方',
    labels: {
      en: 'Japan Regions',
      ja: '日本の地方',
    },
    areaName: '日本',
    quizTypePlural: '地方',
    quizTypeSingular: '地方',
    quizTargetLabel: 'ハイライトされた地方',
    answerNameLabel: '地方名',
    locationLabel: '日本',
    searchQuerySuffix: ' 日本の地方',
    furiganaByName: REGION_FURIGANA,
  },
};
const DEFAULT_MAP_NAME = 'sf';
const MAP_OPTIONS = Object.entries(MAP_CONFIGS).map(([name, config]) => ({
  name,
  label: config.label,
  labels: config.labels,
}));

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

export const getQuizzableNames = (data) => {
  return data.features
    .filter((d) => !d.properties?.not_quizzable)
    .map((d) => d.properties.name);
}

export const getNewShuffledNames = (data) => {
  return shuffle(getQuizzableNames(data));
}

const getMapName = (routeMapName) => {
  return routeMapName in MAP_CONFIGS ? routeMapName : DEFAULT_MAP_NAME;
}

const isValidQuizOrder = (names, validNames) => {
  if (!Array.isArray(names) || names.length !== validNames.size) {
    return false;
  }

  const seen = new Set();
  for (const name of names) {
    if (!validNames.has(name) || seen.has(name)) {
      return false;
    }
    seen.add(name);
  }
  return true;
}

const isValidPlaceStatus = (status) => {
  return status
    && typeof status === 'object'
    && typeof status.missed === 'boolean'
    && typeof status.guessed === 'boolean';
}

const sanitizePlacesMap = (value, validNames) => {
  if (!(value instanceof Map)) {
    return { placesMap: new Map(), didChange: true };
  }

  const placesMap = new Map();
  for (const [name, status] of value) {
    if (validNames.has(name) && isValidPlaceStatus(status)) {
      placesMap.set(name, {
        missed: status.missed,
        guessed: status.guessed,
      });
    }
  }

  return {
    placesMap,
    didChange: placesMap.size !== value.size,
  };
}

const getNumCorrect = (placesMap) => {
  let numCorrect = 0;
  for (const value of placesMap.values()) {
    if (value.missed === false && value.guessed === true) {
      numCorrect++;
    }
  }
  return numCorrect;
}

const getStoredQuizIndex = (value, namesLength) => {
  const quizIndex = Number.isInteger(value) ? value : 0;
  return Math.min(Math.max(quizIndex, 0), namesLength);
}

export function MapContainer() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isQuizStateLoading, setIsQuizStateLoading] = useState(true);
  const [quizIndex, setQuizIndex] = useState(0);
  const [allPlacesNames, setAllPlacesNames] = useState([]);
  const [allPlacesMap, setAllPlacesMap] = useState(new Map());
  const [numCorrect, setNumCorrect] = useState(0);
  const params = useParams();
  const isQuiz = params && params.quiz === 'quiz';
  const mapName = getMapName(params?.map);
  const mapConfig = MAP_CONFIGS[mapName];
  const ui = getUiCopy(mapConfig.locale);

  useEffect(() => {
    document.documentElement.lang = ui.htmlLang;
  }, [ui.htmlLang]);

  useEffect(() => {
    let isCancelled = false;

    setData(null);
    setLoadError(null);
    setIsQuizStateLoading(true);
    setQuizIndex(0);
    setAllPlacesNames([]);
    setAllPlacesMap(new Map());
    setNumCorrect(0);

    mapConfig.loadData()
      .then((loadedData) => {
        if (!isCancelled) {
          setData(loadedData);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setLoadError(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [mapConfig]);

  useEffect(() => {
    if (!data) {
      return;
    }

    let isCancelled = false;
    const validNames = new Set(getQuizzableNames(data));
    const fallbackNames = getNewShuffledNames(data);

    setIsQuizStateLoading(true);
    setQuizIndex(0);
    setAllPlacesNames([]);
    setAllPlacesMap(new Map());
    setNumCorrect(0);

    const loadQuizState = async () => {
      const [dbAllPlacesMap, dbQuizIndex, dbAllPlacesNames] = await Promise.all([
        db.allPlacesMap.get(mapName),
        db.quizIndex.get(mapName),
        db.allPlacesNames.get(mapName),
      ]);

      const hasValidStoredNames = isValidQuizOrder(dbAllPlacesNames?.names, validNames);
      const names = hasValidStoredNames ? dbAllPlacesNames.names : fallbackNames;

      let placesMap = new Map();
      let shouldPersistPlacesMap = dbAllPlacesMap === undefined;
      if (dbAllPlacesMap !== undefined) {
        try {
          const parsedPlacesMap = JSON.parse(dbAllPlacesMap.value, reviver);
          const sanitized = sanitizePlacesMap(parsedPlacesMap, validNames);
          placesMap = sanitized.placesMap;
          shouldPersistPlacesMap = sanitized.didChange;
        } catch {
          shouldPersistPlacesMap = true;
        }
      }

      const storedQuizIndex = dbQuizIndex?.quizIndex;
      const nextQuizIndex = getStoredQuizIndex(storedQuizIndex, names.length);

      await Promise.all([
        hasValidStoredNames
          ? Promise.resolve()
          : db.allPlacesNames.put({ names, id: mapName }),
        shouldPersistPlacesMap
          ? db.allPlacesMap.put({ value: JSON.stringify(placesMap, replacer), id: mapName })
          : Promise.resolve(),
        storedQuizIndex === nextQuizIndex
          ? Promise.resolve()
          : db.quizIndex.put({ quizIndex: nextQuizIndex, id: mapName }),
      ]);

      if (isCancelled) {
        return;
      }

      setAllPlacesNames(names);
      setAllPlacesMap(placesMap);
      setQuizIndex(nextQuizIndex);
      setNumCorrect(getNumCorrect(placesMap));
      setIsQuizStateLoading(false);
    };

    loadQuizState().catch((error) => {
      if (!isCancelled) {
        setLoadError(error);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [data, mapName])

  if (loadError) {
    return <div>{ui.loadError}</div>;
  }

  if (!data) {
    return <div>{ui.loading}</div>;
  }

  if (isQuizStateLoading) {
    return <div>{ui.loading}</div>;
  }

  const props = { data, db, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex, numCorrect, setNumCorrect, mapName, mapConfig, mapOptions: MAP_OPTIONS, isQuiz, ui }
  return (
    <MapPage
      key={mapName}
      {...props}
    />
  )
}
