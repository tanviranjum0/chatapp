import { VStack, TabPanel, Text, TabPanels } from "@chakra-ui/react";
import { FriendContext } from "./Home";
import { MessagesContext } from "./Home";
import ChatBox from "../ChatBox";
import { useContext, useRef, useEffect } from "react";
const Chat = () => {
  const { friendList } = useContext(FriendContext);
  const { messages } = useContext(MessagesContext);
  const bottomDiv = useRef(null);
  useEffect(() => {
    bottomDiv.current?.scrollIntoView();
  }, [messages]);
  return (
    <>
      {friendList.length > 0 ? (
        <VStack h="100%" justify="end">
          <TabPanels overflowY="scroll">
            {friendList.map((friend, i) => {
              return (
                <VStack
                  flexDir="column-reverse"
                  w="100%"
                  key={`chat:${friend.username}${i}`}
                  as={TabPanel}
                >
                  <div ref={bottomDiv} />
                  {messages
                    .filter(
                      (msg) =>
                        msg.to === friend.userid || msg.from === friend.userid
                    )
                    .map((message, i) => {
                      return (
                        <Text
                          maxW={"50%"}
                          m={
                            message.to === friend.userid
                              ? "1rem 0 0 auto !important"
                              : "1rem auto 0 0 !important"
                          }
                          fontSize="lg"
                          bg={
                            message.to === friend.userid
                              ? "blue.100"
                              : "gray.100"
                          }
                          color="gray.800"
                          borderRadius="10px"
                          p="0.5rem 1rem"
                          key={`${friend.username}${200000 + i}`}
                        >
                          {message.content}
                        </Text>
                      );
                    })}
                </VStack>
              );
            })}
          </TabPanels>
          <ChatBox />
        </VStack>
      ) : (
        <VStack justify="center" pt="5rem" w="100%" fontSize="lg">
          <TabPanel>
            <Text>No Friend. Click add friend to start chatting</Text>
          </TabPanel>
        </VStack>
      )}
    </>
  );
};

export default Chat;
