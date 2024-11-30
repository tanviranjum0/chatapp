import ToggleColorMode from "./components/ToggleColorMode";
import Views from "./components/Views";
import USerContext from "./AccountContext";
import socket from "./socket";

const App = () => {
  socket.connect();
  return (
    <USerContext>
      <Views />
      <ToggleColorMode />
    </USerContext>
  );
};

export default App;
