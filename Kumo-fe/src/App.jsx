import axios from "axios";

import { UserContextProvider } from "./UserContext";

import Routes from "./Routes";

function App() {
  axios.defaults.baseURL = "https://vercel.com/hafiz-samaaes-projects/u09-kumo/6W7LhWKt7LmXRp64u69K4Tm74dJt";
  axios.defaults.withCredentials = true;

  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}

export default App;
