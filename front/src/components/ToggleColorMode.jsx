import { useColorMode } from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { Button } from "@chakra-ui/button";
const ToggleColorMode = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <div>
      <Button
        pos={"absolute"}
        right={"0px"}
        top={"0px"}
        margin={"1rem"}
        onClick={() => toggleColorMode()}
      >
        {colorMode === "dark" ? (
          <SunIcon color="orange.400" />
        ) : (
          <MoonIcon color="blue.700" />
        )}
      </Button>
    </div>
  );
};

export default ToggleColorMode;
