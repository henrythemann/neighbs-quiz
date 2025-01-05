import React, { useEffect, useState, createRef, forwardRef, useRef, useMemo, useCallback, SetStateAction, Dispatch } from 'react';
import * as d3 from 'd3';
import { Selection, event } from 'd3';
import { Link } from 'react-router-dom';
import ListItem from './ListItem';
import shuffle from './shuffle';

const STROKE_COLOR = '#222';

const MapComponent = forwardRef(function MapComponent(props, ref) {
  const { data, onCityClick, isQuiz, tooltipText, allPlacesMap } = props;
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
    console.log('name', name)
    if (name) {
      onCityClick(name);
    }
  }, [onCityClick]);

  return (
    <svg
      ref={ref}
      onClick={handleSvgClick}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      vectorEffect="non-scaling-stroke"
      strokeWidth={0.1}
      stroke={STROKE_COLOR}
      style={{
        maxHeight: "95vh",
        maxWidth: "90vw",
        borderRadius: "3rem",
        margin: "auto",
      }}
      data-is-quiz={isQuiz}
    >
      {data.features.map((feature) => {
        const dPath = pathGenerator(feature);
        const allPlacesMapValue = allPlacesMap.get(feature.properties.name)

        return <MapPath
          key={feature.properties.name}
          feature={feature}
          path={dPath}
          tooltipText={tooltipText}
          isQuiz={isQuiz}
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
  tooltipText,
  isQuiz,
  missed,
  guessed
}) {
  console.log('rendering path')
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
      onMouseEnter={() => {
        if (!feature.properties.not_quizzable && !isQuiz) {
          // setShowTooltip(true)
          tooltipText.current = feature.properties.name;
        }
      }}
    />
  );
});

export default function MapPage(props) {
  const mapRef = useRef(null);
  const { data, allPlacesNames, setAllPlacesNames, allPlacesMap, setAllPlacesMap, quizIndex, setQuizIndex, isQuiz, mapName } = props;
  const oppositeMapName = mapName === 'sf' ? 'bay' : 'sf';
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const tooltipText = useRef('');
  const numCorrect = useRef(0);
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

  const resetBoard = () => {
    if (isQuiz) {
      const newArrangement = shuffle(data.features.map((d) => d.properties.name))
      setAllPlacesNames(newArrangement);
      for (const [key, value] of allPlacesMap.entries()) {
        allPlacesMap.set(key, { 'missed': false, 'guessed': false });
      }
      // removeTooltips();
    }
  }

  function skip() {
    // if (neighbToFind) {
    //   setNeighbToFind(remainingNeighbs[0]);
    //   setRemainingNeighbs(remainingNeighbs.slice(1).concat(neighbToFind));
    // }
  }

  useEffect(() => {
    if (mapRef.current && !isQuiz) {
      for (const child of mapRef.current.children) {
        child.addEventListener('mousemove', (event) => {
          let left = 0;
          if (tooltipRef.current.offsetWidth + event.pageX > window.innerWidth) {
            left = event.pageX - tooltipRef.current.offsetWidth - 20;
          } else {
            left = event.pageX + 20;
          }
          tooltipRef.current.style.top = (event.pageY + 20) + "px";
          tooltipRef.current.style.left = left + "px";
          tooltipRef.current.style.visibility = 'visible';
          tooltipRef.current.innerHTML = tooltipText.current;
        })
        child.addEventListener('mouseout', (e) => {
          console.log('mouseout', e)
          tooltipRef.current.style.visibility = 'hidden';
        })
      }
    }
  }, [mapRef, isQuiz]);

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
      setAllPlacesMap(prevMap => {
        const newMap = new Map(prevMap);
        if (city !== allPlacesNames[quizIndex]) {
          newMap.set(allPlacesNames[quizIndex], { 'missed': true, 'guessed': true });
        } else {
          numCorrect.current++;
          newMap.set(city, { 'missed': false, 'guessed': true });
        }
        nextNeighb();
        return newMap;
      });
    }
  }, [allPlacesNames, quizIndex]);

  const nextNeighb = () => {
    setQuizIndex(prev => prev + 1);
  }

  const GameMode = () => (
    <div className="pure-u-1 pure-u-md-1-3">
      {true && <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

      }}>
        <div>Your score: {Math.round((numCorrect.current) / (quizIndex + 1) * 100 || 0)}%</div>
        <div>{allPlacesNames.length - quizIndex} {allPlacesNames.length - quizIndex > 1 ? quizTypePlural : quizTypeSingular} left</div>

        <div><button type="button" onClick={skip}>Skip and come back later</button></div>
      </div>}
    </div>
  )

  const BottomRow = () => (
    <div className="pure-u-1 pure-u-md-1-3" style={{ marginTop: '1rem' }}>
      <span>Having trouble? <Link to={`/${mapName}/location`}>Quit the quiz and learn the {quizTypePlural}</Link></span>
    </div>
  )

  return (
    <div>
      {!isQuiz && (
        <>
          <div>
            <span>Think you know {areaName}? <Link to={`/${mapName}/quiz`}>Take our {quizTypePlural} quiz</Link></span>
          </div>
        </>
      )}
      <div style={{ margin: 'auto auto 5rem auto' }} className="">
        {isQuiz && (
          <div className="pure-u-1 pure-u-md-1-3">
            <GameMode />
          </div>
        )}
        <div className="map-wrapper">
          <div className='prompt'><h1>{allPlacesNames[quizIndex]}</h1></div>
          <MapComponent
            ref={mapRef}
            data={data}
            onCityClick={onCityClick}
            isQuiz={isQuiz}
            tooltipText={tooltipText}
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
      <div id="tooltip" ref={tooltipRef} style={{ position: 'absolute', 'zIndex': 10, visibility: 'hidden' }} />
      <hr />
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',

      }}>
        <button style={{}} onClick={() => setShowAbout(prev => !prev)}>About</button>
        <Link to={`/${oppositeMapName}/${isQuiz ? 'quiz' : 'location'}`} style={{}}>Switch to {mapName == 'sf' ? 'Bay Area' : 'SF'}</Link>
        <button type="button" onClick={resetBoard} style={{}} id="start-game-btn">Restart</button>
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
