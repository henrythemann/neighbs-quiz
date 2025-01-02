import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import './App.scss';
import 'purecss';
import Map from './Map';
import Geolocated from './Geolocated/Geolocated';

if (process.env.NODE_ENV === 'production') {
  if (window.location.href.substr(0, 5) !== 'https') {
    window.location.href = window.location.href.replace('http', 'https');
  }
}


const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <div className="wrapper">
          <Switch>
            <Route path="/:quiz">
              <Geolocated />
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  );
}

export default App;
