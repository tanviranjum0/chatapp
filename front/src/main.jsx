import * as React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import * as ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { HashRouter } from "react-router-dom";
import theme from "./theme";
import { ColorModeScript } from "@chakra-ui/react";

const rootElement = document.getElementById("root");
ReactDOM.createRoot(rootElement).render(
  <HashRouter>
    <ChakraProvider>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <App />
    </ChakraProvider>
  </HashRouter>
);
