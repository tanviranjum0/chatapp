import { ChatIcon } from "@chakra-ui/icons";
import { useDisclosure } from "@chakra-ui/react";
import {
  Heading,
  VStack,
  Circle,
  HStack,
  Button,
  TabList,
  Tab,
  Divider,
  Text,
} from "@chakra-ui/react";
import { FriendContext } from "./Home";
import { useContext } from "react";
import AddFriendModal from "./AddFriendModal";

const Sidebar = () => {
  const { friendList } = useContext(FriendContext);
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <VStack py={"1.4rem"}>
        <HStack justify={"space-evenly"} w={"100%"}>
          <Heading size={"md"}>Add Friend</Heading>
          <Button onClick={() => onOpen()}>
            <ChatIcon></ChatIcon>
          </Button>
        </HStack>
        <Divider></Divider>
        <VStack as={TabList}>
          {friendList &&
            friendList.map((user, i) => {
              return (
                <HStack key={`friend:${user}${i}`} as={Tab}>
                  <Circle
                    bg={
                      user.connected == undefined
                        ? ""
                        : user.connected
                        ? "green.500"
                        : ""
                    }
                    w="10px"
                    h="10px"
                  ></Circle>
                  <Text>{user.username == undefined ? "" : user.username}</Text>
                </HStack>
              );
            })}
        </VStack>
      </VStack>
      <AddFriendModal isOpen={isOpen} onClose={onClose} />
    </>
  );
};

export default Sidebar;
