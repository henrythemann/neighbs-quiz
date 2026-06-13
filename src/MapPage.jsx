import React, { useEffect, useState, forwardRef, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { point, booleanPointInPolygon } from "@turf/turf";
import rbush from "rbush";
import { Link } from 'react-router-dom';
import { useGeolocated } from "react-geolocated";
import { replacer, getNewShuffledNames } from './MapContainer';
import { getQuizProgress } from './quizProgress';

const STROKE_COLOR = '#222';
const QUIZ_DIRECTIONS = {
  CLICK_PLACE: 'click-place',
  TYPE_NAME: 'type-name',
};

const normalizeQuizAnswer = (value, locale) => {
  return `${value}`
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase(locale)
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ');
};

const MapComponent = React.memo(forwardRef(function MapComponent(props, ref) {
  const { data, onCityClick, isQuiz, quizDirection, currentQuizName, allPlacesMap, showTooltip, hideTooltip } = props;
  const w = 900;
  const h = 900;
  const projectedFeatures = useMemo(() => {
    const projection = d3.geoMercator().scale(1).translate([0, 0]);
    const tmpPath = d3.geoPath().projection(projection);

    const [[x0, y0], [x1, y1]] = tmpPath.bounds(data);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const scale = 1 / Math.max(dx / w, dy / h);
    const translate = [
      w / 2 - scale * (x0 + x1) / 2,
      h / 2 - scale * (y0 + y1) / 2
    ];
    projection.scale(scale).translate(translate);

    const pathGenerator = d3.geoPath().projection(projection);
    return data.features.map((feature) => ({
      feature,
      path: pathGenerator(feature)
    }));
  }, [data]);

  const handleSvgClick = useCallback((e) => {
    const name = e.target.dataset.name;
    if (name) {
      onCityClick(name);
    }
  }, [onCityClick]);

  const handleSvgHover = useCallback((e) => {
    if (!isQuiz) {
      const { name, quizzable } = e.target.dataset;
      const { clientX, clientY } = e;
      if (name && quizzable === 'true') {
        showTooltip(name, clientX, clientY);
      } else {
        hideTooltip();
      }
    }
  }, [hideTooltip, isQuiz, showTooltip]);

  return (
    <svg
      ref={ref}
      onClick={handleSvgClick}
      onMouseMove={handleSvgHover}
      onMouseLeave={hideTooltip}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      vectorEffect="non-scaling-stroke"
      strokeWidth={0.1}
      stroke={STROKE_COLOR}
      className='map-component'
      data-is-quiz={isQuiz}
      data-quiz-direction={quizDirection}
    >
      {projectedFeatures.map(({ feature, path }) => {
        const allPlacesMapValue = allPlacesMap.get(feature.properties.name)

        return <MapPath
          key={feature.properties.name}
          feature={feature}
          path={path}
          missed={allPlacesMapValue?.missed}
          guessed={allPlacesMapValue?.guessed}
          isCurrent={isQuiz && quizDirection === QUIZ_DIRECTIONS.TYPE_NAME && feature.properties.name === currentQuizName}
        />
      })}
    </svg>
  );
}));

const MapPath = React.memo(function MapPath({
  feature,
  path,
  missed,
  guessed,
  isCurrent
}) {
  return (
    <path
      d={path || undefined}
      data-id={feature.id}
      data-name={feature.properties.name}
      data-quizzable={!feature.properties.not_quizzable}
      data-guessed={guessed}
      data-correct={!missed}
      data-current={isCurrent}
      id={feature.properties.name}
      pointerEvents="all"
      stroke={STROKE_COLOR}
    />
  );
});

const PlaceName = ({ name, furiganaByName }) => {
  const furigana = furiganaByName?.[name];

  if (!furigana) {
    return name;
  }

  return (
    <ruby className="place-name-ruby">
      {name}
      <rp>(</rp>
      <rt>{furigana}</rt>
      <rp>)</rp>
    </ruby>
  );
}

const setTooltipPlaceName = (tooltip, name, furiganaByName) => {
  const furigana = furiganaByName?.[name];

  if (!furigana) {
    tooltip.textContent = name;
    return;
  }

  const ruby = document.createElement('ruby');
  ruby.className = 'place-name-ruby';
  ruby.append(name);

  const openFallback = document.createElement('rp');
  openFallback.textContent = '(';
  ruby.append(openFallback);

  const reading = document.createElement('rt');
  reading.textContent = furigana;
  ruby.append(reading);

  const closeFallback = document.createElement('rp');
  closeFallback.textContent = ')';
  ruby.append(closeFallback);

  tooltip.replaceChildren(ruby);
}

export default function MapPage(props) {
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipTextRef = useRef('');
  const answerInputRef = useRef(null);
  const { data, db, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex, isQuiz, mapName, mapConfig, mapOptions, numCorrect, setNumCorrect, ui } = props;
  const {
    areaName,
    quizTypePlural,
    quizTypeSingular,
    quizTargetLabel,
    answerNameLabel,
    locationLabel,
    searchQuerySuffix,
    furiganaByName,
  } = mapConfig;
  const quizCopyLabels = { quizTypePlural, quizTypeSingular, quizTargetLabel, answerNameLabel };
  const otherMapOptions = mapOptions.filter((option) => option.name !== mapName);
  const getMapOptionLabel = useCallback((option) => {
    return option.labels?.[ui.locale] || option.label;
  }, [ui.locale]);
  const supportsLocationLookup = Boolean(data.spatialIndex);
  const [userLocation, setUserLocation] = useState('');
  const [quizDirection, setQuizDirection] = useState(QUIZ_DIRECTIONS.CLICK_PLACE);
  const [typedAnswer, setTypedAnswer] = useState('');
  const isTypingQuiz = isQuiz && quizDirection === QUIZ_DIRECTIONS.TYPE_NAME;
  const { coords, isGeolocationAvailable, isGeolocationEnabled } =
  useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    suppressLocationOnMount: isQuiz || !supportsLocationLookup,
    userDecisionTimeout: 1000,
  });
  const { latitude: lat, longitude: lon } = coords || {};

  const spatialIndex = useMemo(() => {
    if (!data.spatialIndex) {
      return null;
    }
    const index = new rbush();
    index.fromJSON(data.spatialIndex);
    return index;
  }, [data]);

  const findFeatureContainingPoint = useCallback((lat, lon) => {
    if (!spatialIndex) {
      return null;
    }
    const pt = point([lon, lat]);
    const candidates = spatialIndex.search({ minX: lon, minY: lat, maxX: lon, maxY: lat });

    for (const candidate of candidates) {
      const feature = data.features[candidate.id];
      if (booleanPointInPolygon(pt, feature)) {
        return feature;
      }
    }
    return null;
  }, [data, spatialIndex]);

  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const feature = findFeatureContainingPoint(lat, lon);
      setUserLocation(feature?.properties?.name || '');
    }
  }, [findFeatureContainingPoint, lat, lon]);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  }, []);

  const showMapTooltip = useCallback((name, clientX, clientY) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) {
      return;
    }

    if (tooltipTextRef.current !== name) {
      tooltipTextRef.current = name;
      setTooltipPlaceName(tooltip, name, furiganaByName);
    }

    tooltip.style.display = 'block';
    const tooltipWidth = tooltip.offsetWidth;
    let x = clientX - 5;
    if (tooltipWidth + x + 20 >= window.innerWidth) {
      x = window.innerWidth - tooltipWidth - 20;
    }
    tooltip.style.left = `${Math.max(0, x)}px`;
    tooltip.style.top = `${clientY + 25}px`;
  }, [furiganaByName]);

  useEffect(() => {
    hideTooltip();
  }, [hideTooltip, isQuiz, mapName]);

  const quizProgress = useMemo(
    () => getQuizProgress(allPlacesNames, allPlacesMap, quizIndex),
    [allPlacesMap, allPlacesNames, quizIndex]
  );
  const { currentQuizIndex, currentQuizName, placesLeft, answeredCount } = quizProgress;
  const isFinished = isQuiz && allPlacesNames.length > 0 && placesLeft === 0;
  const promptNeedsRubyPadding = Boolean(furiganaByName && (!isQuiz || !isTypingQuiz));

  useEffect(() => {
    if (!isTypingQuiz || isFinished || !currentQuizName) {
      return;
    }

    setTypedAnswer('');
    answerInputRef.current?.focus();
  }, [currentQuizName, isFinished, isTypingQuiz]);

  const updateQuizIndex = useCallback((val) => {
    setQuizIndex(val);
    db.quizIndex.put({
      quizIndex: val,
      id: mapName
    })
  }, [db, mapName, setQuizIndex]);

  const updateAllPlacesNames = useCallback((val) => {
    setAllPlacesNames(val);
    db.allPlacesNames.put({
      names: val,
      id: mapName
    })
  }, [db, mapName, setAllPlacesNames]);

  const updateAllPlacesMap = useCallback((val) => {
    setAllPlacesMap(val);
    db.allPlacesMap.put({
      value: JSON.stringify(val, replacer),
      id: mapName
    })
  }, [db, mapName, setAllPlacesMap]);

  const resetBoard = useCallback(() => {
    if (isQuiz) {
      updateQuizIndex(0);
      setNumCorrect(0);
      const newArrangement = getNewShuffledNames(data);
      updateAllPlacesNames(newArrangement);
      updateAllPlacesMap(new Map());
      setTypedAnswer('');
      // removeTooltips();
    }
  }, [data, isQuiz, setNumCorrect, updateAllPlacesMap, updateAllPlacesNames, updateQuizIndex]);

  const switchQuizDirection = useCallback(() => {
    setQuizDirection((currentDirection) => (
      currentDirection === QUIZ_DIRECTIONS.CLICK_PLACE
        ? QUIZ_DIRECTIONS.TYPE_NAME
        : QUIZ_DIRECTIONS.CLICK_PLACE
    ));
    resetBoard();
  }, [resetBoard]);

  function skip() {
    if (currentQuizName) {
      nextNeighb();
    }
  }

  // useEffect(() => {
  //   if (mapRef.current && !isQuiz) {
  //     for (const child of mapRef.current.children) {
  //       child.addEventListener('mousemove', (event) => {
  //         let left = 0;
  //         if (tooltipRef.current.offsetWidth + event.pageX > window.innerWidth) {
  //           left = event.pageX - tooltipRef.current.offsetWidth - 20;
  //         } else {
  //           left = event.pageX + 20;
  //         }
  //         tooltipRef.current.style.top = (event.pageY + 20) + "px";
  //         tooltipRef.current.style.left = left + "px";
  //         tooltipRef.current.style.visibility = 'visible';
  //         tooltipRef.current.innerHTML = tooltipText.current;
  //       })
  //       child.addEventListener('mouseout', (e) => {
  //         console.log('mouseout', e)
  //         tooltipRef.current.style.visibility = 'hidden';
  //       })
  //     }
  //   }
  // }, [mapRef, isQuiz]);

  const nextNeighb = useCallback(() => {
    updateQuizIndex(
      Math.min(
        Math.max(quizIndex, currentQuizIndex + 1),
        allPlacesNames.length
      )
    );
  }, [allPlacesNames.length, currentQuizIndex, quizIndex, updateQuizIndex]);

  const answerCurrentQuizName = useCallback((isCorrect) => {
    if (!currentQuizName) {
      return;
    }

    const newMap = new Map(allPlacesMap);
    newMap.set(currentQuizName, { 'missed': !isCorrect, 'guessed': true });
    if (isCorrect) {
      setNumCorrect((current) => current + 1);
    }
    updateAllPlacesMap(newMap);
    nextNeighb();
  }, [allPlacesMap, currentQuizName, nextNeighb, setNumCorrect, updateAllPlacesMap]);

  const onCityClick = useCallback((city) => {
    if (!isQuiz) {
      const newTab = window.open(
        `https://www.google.com/search?q=${encodeURIComponent(`${city || ''}${searchQuerySuffix}`)}`,
        '_blank'
      );
      if (newTab) {
        newTab.focus();
      }
      return;
    } else {
      if (isTypingQuiz) {
        return;
      }
      if (!currentQuizName || allPlacesMap.get(city)?.guessed)
        return;
      answerCurrentQuizName(city === currentQuizName);
    }
  }, [allPlacesMap, answerCurrentQuizName, currentQuizName, isQuiz, isTypingQuiz, searchQuerySuffix]);

  const submitTypedAnswer = useCallback((event) => {
    event.preventDefault();
    if (!isTypingQuiz || !currentQuizName) {
      return;
    }

    const normalizedAnswer = normalizeQuizAnswer(typedAnswer, ui.locale);
    if (!normalizedAnswer) {
      answerInputRef.current?.focus();
      return;
    }

    const normalizedName = normalizeQuizAnswer(currentQuizName, ui.locale);
    answerCurrentQuizName(normalizedAnswer === normalizedName);
  }, [answerCurrentQuizName, currentQuizName, isTypingQuiz, typedAnswer, ui.locale]);

  const GameMode = () => {
    const score = Math.round((numCorrect) / (answeredCount) * 100 || 0);
    let scoreColor = 'inherit';
    if (score > 0) {
      const solid_red_at = 50;
      const solid_green_at = 90;
      const halfway = (solid_red_at + solid_green_at) / 2.0;
      const R = Math.max(Math.min(220.0, (score - solid_green_at) * (220.0 / ((halfway - solid_green_at)))), 0.0);
      const G = Math.max(Math.min(220.0, (score - solid_red_at) * (220.0 / ((halfway - solid_red_at)))), 0.0);
      scoreColor = `rgb(${R},${G},0)`;
    }

    return (
      <div className="pure-u-1 pure-u-md-1-3">
        <div className="quiz-status-row">
          <div className='sm-hidden' style={{display: 'flex', 'justifyContent': 'center', alignItems: 'center', gap: '0.25rem'}}>{ui.scoreLabel} <span style={{ color: scoreColor, fontWeight: 'bold', fontSize: '1.5rem' }}>{score}%</span></div>
          <div>{ui.placesLeft({ count: placesLeft, pluralLabel: quizTypePlural, singularLabel: quizTypeSingular })}</div>
          <div>
            <button type="button" onClick={switchQuizDirection}>
              {quizDirection === QUIZ_DIRECTIONS.CLICK_PLACE
                ? ui.switchToTypeQuiz({ quizTypePlural })
                : ui.switchToClickQuiz({ quizTypePlural })}
            </button>
          </div>
          {!isFinished && (
            <div><button type="button" onClick={skip}>{ui.skipButton}<span className='sm-hidden'>{ui.skipDetails}</span></button></div>
          )}
        </div>
      </div>
    )
  }

  const BottomRow = () => (
    <div style={{ marginTop: '0.75rem', width: '100%' }}>
      <span>{ui.troublePrefix} <Link to={`/${mapName}/location`}>{ui.quitQuiz({ quizTypePlural })}</Link></span>
    </div>
  )

  return (
    <div>
      {!isQuiz && (
        <div>
          {supportsLocationLookup && !isGeolocationEnabled && <span>{ui.enableGeolocation({ locationLabel })}</span>}
          {supportsLocationLookup && !isGeolocationAvailable && <span>{ui.geolocationUnavailable}</span>}
        </div>
      )}
      {!isQuiz && (
        <>
          <div>
            <span>{ui.knowPrompt({ areaName, quizTypePlural })}<Link to={`/${mapName}/quiz`}>{ui.takeQuiz({ quizTypePlural })}</Link></span>
          </div>
        </>
      )}
      <div style={{ margin: 'auto auto 1rem auto' }} className="">
        {isQuiz && (
          <div className="">
            <GameMode />
          </div>
        )}
        <div className="map-wrapper">
          {(!isQuiz && userLocation) && <div style={{fontSize: '1rem', top: '-0.5rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)'}}>{ui.currentLocationPrefix}</div>}
          {(isQuiz || userLocation) && (
            <div className='prompt'>
              <h1 style={{ paddingTop: promptNeedsRubyPadding ? '1.25rem' : '0rem' }}>
                {isQuiz
                  ? (isFinished
                    ? ui.congrats
                    : isTypingQuiz
                      ? (currentQuizName ? ui.nameHighlightedPrompt(quizCopyLabels) : ui.loading)
                      : currentQuizName ? <PlaceName name={currentQuizName} furiganaByName={furiganaByName} /> : ui.loading)
                  : <PlaceName name={userLocation} furiganaByName={furiganaByName} />}
              </h1>
              {isTypingQuiz && !isFinished && currentQuizName && (
                <form className="quiz-answer-form" onSubmit={submitTypedAnswer}>
                  <input
                    ref={answerInputRef}
                    type="text"
                    value={typedAnswer}
                    onChange={(event) => setTypedAnswer(event.target.value)}
                    aria-label={ui.answerInputLabel(quizCopyLabels)}
                    placeholder={ui.answerInputPlaceholder(quizCopyLabels)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button type="submit">{ui.submitAnswer}</button>
                </form>
              )}
            </div>
          )}
          <div
            className='map-overlay'
            style={{ display: isFinished ? 'block' : 'none' }}
          >
            <div className='map-overlay-content'>
              {/* {score <= 50 && (
                `Oof, ${score}%? Are you a tourist or something?`
              )} */}
            <button className='lg-styled-button' onClick={resetBoard}>{ui.restart}</button>
            {otherMapOptions.map((option) => (
              <React.Fragment key={option.name}>
                {ui.or}
                <Link className='lg-styled-button' to={`/${option.name}/quiz`}>{ui.tryMap({ label: getMapOptionLabel(option) })}</Link>
              </React.Fragment>
            ))}
            </div>
          </div>
          <MapComponent
            ref={mapRef}
            data={data}
            onCityClick={onCityClick}
            isQuiz={isQuiz}
            quizDirection={quizDirection}
            currentQuizName={currentQuizName}
            showTooltip={showMapTooltip}
            hideTooltip={hideTooltip}
            allPlacesMap={allPlacesMap}
          />
        </div>
        {isQuiz && (
          <>
            {/* <aside style={{ float: 'right' }} className="pure-u-1 ure-u-md-1-2">
              <h4>Missed Neighborhoods</h4>
              {missed.map((item) => (<ListItem key={item} label={item} />))}
            </aside> */}
            <BottomRow />
          </>
        )}
      </div>
      <div
        id="tooltip"
        ref={tooltipRef}
        style={{
          position: 'absolute',
          'zIndex': 10,
          display: 'none',
          paddingTop: furiganaByName ? '1rem' : '0.5rem',
        }}
      />
      <hr />
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: '0.6rem'
      }}>
        <nav className="map-switcher" aria-label={ui.switchMapsLabel}>
          {mapOptions.map((option) => (
            option.name === mapName ? (
              <span key={option.name} aria-current="page">{getMapOptionLabel(option)}</span>
            ) : (
              <Link key={option.name} to={`/${option.name}/${isQuiz ? 'quiz' : 'location'}`}>{getMapOptionLabel(option)}</Link>
            )
          ))}
        </nav>
        {isQuiz && (
          <button type="button" onClick={resetBoard} style={{}} id="start-game-btn">{ui.restart}</button>
        )}
      </div>
    </div>
  );
}
