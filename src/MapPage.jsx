import React, { useEffect, useState, createRef, forwardRef, useRef, useMemo, useCallback, SetStateAction, Dispatch } from 'react';
import * as d3 from 'd3';
import { point, booleanPointInPolygon } from "@turf/turf";
import rbush from "rbush";
import { Link } from 'react-router-dom';
import { useGeolocated } from "react-geolocated";
import { insidePolygon, toLatLon } from 'geolocation-utils';
import shuffle from './shuffle';
import { replacer, getNewShuffledNames } from './MapContainer';

const STROKE_COLOR = '#222';

const MapComponent = forwardRef(function MapComponent(props, ref) {
  const { data, onCityClick, isQuiz, setTooltipText, allPlacesMap, setShowTooltip, setTooltipPosition, tooltipRef } = props;
  const w = 900;
  const h = 900;
  const pathGenerator = useMemo(() => {
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

    return d3.geoPath().projection(projection);
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
      if (name && quizzable) {
        let x = clientX - 5;
        if (tooltipRef.current.offsetWidth + x + 20 >= window.innerWidth) {
          x = window.innerWidth - tooltipRef.current.offsetWidth - 20;
        }
        setTooltipPosition({ x, y: clientY + 25 });
        setShowTooltip(true);
        setTooltipText(name);
      } else {
        setShowTooltip(false);
        setTooltipText('');
      }
    }
  }, []);

  return (
    <svg
      ref={ref}
      onClick={handleSvgClick}
      onMouseMove={handleSvgHover}
      onMouseLeave={() => setShowTooltip(false)}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      vectorEffect="non-scaling-stroke"
      strokeWidth={0.1}
      stroke={STROKE_COLOR}
      className='map-component'
      data-is-quiz={isQuiz}
    >
      {data.features.map((feature) => {
        const dPath = pathGenerator(feature);
        const allPlacesMapValue = allPlacesMap.get(feature.properties.name)

        return <MapPath
          key={feature.properties.name}
          feature={feature}
          path={dPath}
          missed={allPlacesMapValue?.missed}
          guessed={allPlacesMapValue?.guessed}
        />
      })}
    </svg>
  );
})

const MapPath = React.memo(function MapPath({
  feature,
  path,
  missed,
  guessed
}) {
  return (
    <path
      d={path || undefined}
      data-id={feature.id}
      data-name={feature.properties.name}
      data-quizzable={!feature.properties.not_quizzable}
      data-guessed={guessed}
      data-correct={!missed}
      id={feature.properties.name}
      pointerEvents="all"
      stroke={STROKE_COLOR}
    />
  );
});

export default function MapPage(props) {
  const mapRef = useRef(null);
  const { data, db, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex, isQuiz, mapName, numCorrect, setNumCorrect } = props;
  const oppositeMapName = mapName === 'sf' ? 'bay' : 'sf';
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipText, setTooltipText] = useState('');
  const [finishedState, setFinishedState] = useState(false);
  const [userLocation, setUserLocation] = useState('');
  const { coords, isGeolocationAvailable, isGeolocationEnabled } =
  useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 1000,
  });
  const { latitude: lat, longitude: lon, accuracy } = coords || {};

  const findFeatureContainingPoint = (lat, lon, spatialIndex) => {
    const pt = point([lon, lat]);
    const candidates = spatialIndex.search({ minX: lon, minY: lat, maxX: lon, maxY: lat });
    
    for (const candidate of candidates) {
      const feature = data.features[candidate.id];
      if (booleanPointInPolygon(pt, feature)) {
        return feature;
      }
    }
    return null;
  };
  
  useEffect(() => {
    if (lat && lon) {
      const spatialIndex = new rbush();
      spatialIndex.fromJSON(data.spatialIndex);
      const feature = findFeatureContainingPoint(lat, lon, spatialIndex);
      setUserLocation(feature?.properties?.name || '');
      }
  }, [lat, lon, data]);

  let areaName, quizTypePlural, quizTypeSingular = '';
  if (mapName === 'bay') {
    areaName = 'the Bay';
    quizTypePlural = 'cities';
    quizTypeSingular = 'city';
  } else if (mapName === 'sf') {
    areaName = 'SF';
    quizTypePlural = 'neighborhoods';
    quizTypeSingular = 'neighborhood';
  }
  const tooltipRef = useRef();

  const updateQuizIndex = async (val) => {
    setQuizIndex(val);
    db.quizIndex.put({
      quizIndex: val,
      id: mapName
    })
  }

  const updateAllPlacesNames = async (val) => {
    setAllPlacesNames(val);
    db.allPlacesNames.put({
      names: val,
      id: mapName
    })
  }

  const updateAllPlacesMap = async (val) => {
    setAllPlacesMap(val);
    db.allPlacesMap.put({
      value: JSON.stringify(val, replacer),
      id: mapName
    })
  }

  const resetBoard = () => {
    if (isQuiz) {
      setFinishedState(false);
      updateQuizIndex(0);
      setNumCorrect(0);
      const newArrangement = getNewShuffledNames(data);
      updateAllPlacesNames(newArrangement);
      updateAllPlacesMap(new Map());
      // removeTooltips();
    }
  }

  useEffect(() => {
    if (!isQuiz) {
      setFinishedState(false);
    }
  }, [isQuiz]);

  function skip() {
    // if (neighbToFind) {
    //   setNeighbToFind(remainingNeighbs[0]);
    //   setRemainingNeighbs(remainingNeighbs.slice(1).concat(neighbToFind));
    // }
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

  const onCityClick = useCallback((city) => {
    if (!isQuiz) {
      const newTab = window.open(
        `https://www.google.com/search?q=${city || ''}${mapName == 'sf' ? '+neighborhood+san+francisco' : ', California'}`,
        '_blank'
      );
      if (newTab) {
        newTab.focus();
      }
      return;
    } else {
      if (allPlacesMap.get(city)?.guessed)
        return;
      const newMap = new Map(allPlacesMap);
      if (city !== allPlacesNames[quizIndex]) {
        newMap.set(allPlacesNames[quizIndex], { 'missed': true, 'guessed': true });
      } else {
        setNumCorrect(numCorrect + 1);
        newMap.set(city, { 'missed': false, 'guessed': true });
      }
      nextNeighb();
      updateAllPlacesMap(newMap);
    }
  }, [allPlacesNames, quizIndex, isQuiz]);

  const nextNeighb = () => {
    updateQuizIndex(quizIndex + 1);
    if (quizIndex === allPlacesNames.length - 1) {
      // resetBoard();
      setFinishedState(true);
    } else {
      db.allPlacesMap.put({
        value: JSON.stringify(allPlacesMap, replacer),
        id: mapName
      })
    }
  }

  const GameMode = () => {
    const score = Math.round((numCorrect) / (quizIndex) * 100 || 0);
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
        {true && <div style={{
          display: 'grid',
          gridTemplateColumns: `1fr 1fr ${!finishedState ? '1fr' : ''}`,
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',

        }}>
          <div className='sm-hidden' style={{display: 'flex', 'justifyContent': 'center', alignItems: 'center', gap: '0.25rem'}}>Your score: <span style={{ color: scoreColor, fontWeight: 'bold', fontSize: '1.5rem' }}>{score}%</span></div>
          <div>{allPlacesNames.length - quizIndex} <span className='sm-hidden'>{allPlacesNames.length - quizIndex != 1 ? quizTypePlural : quizTypeSingular}</span> left</div>
          {!finishedState && (
            <div><button type="button" onClick={skip}>Skip<span className='sm-hidden'> and come back later</span></button></div>
          )}
        </div>}
      </div>
    )
  }

  const BottomRow = () => (
    <div style={{ marginTop: '0.75rem', width: '100%' }}>
      <span>Having trouble? <Link to={`/${mapName}/location`}>Quit the quiz and learn the {quizTypePlural}</Link></span>
    </div>
  )

  return (
    <div>
      {!isQuiz && (
        <div>
          {!isGeolocationEnabled && <span>Please enable geolocation to show your location in the {mapName == 'sf' ? 'city' : 'Bay'}.</span>}
          {!isGeolocationAvailable && <span>Geolocation is not available.</span>}
        </div>
      )}
      {!isQuiz && (
        <>
          <div>
            <span>Think you know {areaName}? <Link to={`/${mapName}/quiz`}>Take our {quizTypePlural} quiz</Link></span>
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
          {(!isQuiz && userLocation) && <div style={{fontSize: '1rem', top: '-0.5rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)'}}>You're in</div>}
          {(isQuiz || userLocation) && (
            <div className='prompt'><h1>{isQuiz ? (finishedState ? 'Congrats!' : allPlacesNames[quizIndex]) : userLocation}</h1></div>
          )}
          <div
            className='map-overlay'
            style={{ display: finishedState ? 'block' : 'none' }}
          >
            <div className='map-overlay-content'>
              {/* {score <= 50 && (
                `Oof, ${score}%? Are you a tourist or something?`
              )} */}
            <button className='lg-styled-button' onClick={resetBoard}>Restart?</button>
            </div>
          </div>
          <MapComponent
            ref={mapRef}
            data={data}
            onCityClick={onCityClick}
            isQuiz={isQuiz}
            setTooltipText={setTooltipText}
            setShowTooltip={setShowTooltip}
            setTooltipPosition={setTooltipPosition}
            tooltipRef={tooltipRef}
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
          visibility: (!isQuiz && showTooltip) ? 'visible' : 'hidden',
          top: tooltipPosition.y + 'px',
          left: tooltipPosition.x + 'px',
        }}>
        {tooltipText}
      </div>
      <hr />
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: '0.6rem'
      }}>
        <button style={{}} onClick={() => setFinishedState(prev => !prev)}>About</button>
        {/* <button style={{}} onClick={() => setShowAbout(prev => !prev)}>About</button> */}
        <Link to={`/${oppositeMapName}/${isQuiz ? 'quiz' : 'location'}`} style={{}}>Switch to {mapName == 'sf' ? 'Bay Area' : 'SF'}</Link>
        {isQuiz && (
          <button type="button" onClick={resetBoard} style={{}} id="start-game-btn">Restart</button>
        )}
      </div>
      {showAbout && (
        <div style={{ textAlign: 'left', margin: '0 1rem' }}>
          {!isQuiz && (
            <p>This page will determine which neighborhood of San Francisco you are currently in.  You'll need to be in the city boundaries of San Francisco for this page to be useful for you. If you're not, you can still test your knowledge of the 117 neighborhoods in San Francisco on the <Link to={`/${mapName}/quiz`}>quiz page</Link></p>
          )}
          <p>No APIs were harmed in the making of this app. Your location is used solely to determine where you are in the city. Your location data never leaves your browser, and is never shared with anyone, period. Your visit is logged to Google Analytics, simply so I can know how popular this app gets, if it ever does.</p>
          <a href='https://github.com/codeocelot/neighbs-quiz'>Github Repo</a>
          <section>
            <h3>Credits</h3>
            <p>There are many unsung heros who publish their hard work with little recognition and without this project would never exist. Among them:</p>
            <ul>
              <li>The City of San Francisco, and in particular, the lovely folks at <a href="https://datasf.org/opendata/">DataSF</a> for publishing a <a href="https://data.sfgov.org/Geographic-Locations-and-Boundaries/SF-Find-Neighborhoods/pty2-tcw4">list</a> of neighborhood boundaries.</li>
              <li><a href="https://github.com/d3/d3">d3</a></li>
              <li><a target="blank" rel="noreferrer noopener" href="https://bitbucket.org/teqplay/geolocation-utils#readme">geolocation-utils</a></li>
              <li><a target="blank" rel="noreferrer noopener" href="https://github.com/no23reason/react-geolocated">react-geolocated</a></li>
              <li><a target="blank" rel="noreferrer noopener" href="https://github.com/DudaGod/polygons-intersect#readme">polygons-intersect</a></li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
