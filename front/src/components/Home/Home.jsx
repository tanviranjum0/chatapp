import { Grid, GridItem, Tabs } from "@chakra-ui/react";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import { createContext, useState } from "react";
import UseSocketSetup from "./UseSocketSetup";

export const MessagesContext = createContext();
export const FriendContext = createContext();
const Home = () => {
  const [friendList, setFriendList] = useState(false);
  const [messages, setMessages] = useState([]);
  const [friendIndex, setFriendIndex] = useState(0);
  UseSocketSetup(setFriendList, setMessages);
  return (
    <FriendContext.Provider value={{ friendList, friendIndex, setFriendList }}>
      <Grid
        as={Tabs}
        onChange={(index) => setFriendIndex(index)}
        templateColumns="repeat(10, 1fr)"
        h={"100vh"}
      >
        <GridItem colSpan="3" borderRight={"1px solid gray"}>
          <Sidebar />
        </GridItem>
        <GridItem colSpan="7" maxH="100vh">
          <MessagesContext.Provider value={{ messages, setMessages }}>
            {friendList && <Chat />}
          </MessagesContext.Provider>
        </GridItem>
      </Grid>
    </FriendContext.Provider>
  );
};

export default Home;
