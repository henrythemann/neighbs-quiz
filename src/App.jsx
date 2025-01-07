import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.scss';
import MapPage from './MapPage';
import { MapContainer } from './MapContainer';
import RedirectComponent from './RedirectComponent';

// if (process.env.NODE_ENV === 'production') {
//   if (window.location.href.substr(0, 5) !== 'https') {
//     window.location.href = window.location.href.replace('http', 'https');
//   }
// }


const App = () => {
  return (
    <Router>
      <div className="App"> 
        <div className="wrapper">
          <Routes>
            <Route path="/:map/:quiz" element={<MapContainer/>}/>
            <Route path="/*" element={<RedirectComponent/>}/>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
