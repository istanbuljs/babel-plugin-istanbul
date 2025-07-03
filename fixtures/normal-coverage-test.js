// This file should be instrumented normally
// because it has no skip markers

function shouldBeCovered() {
  console.log("This function should appear in coverage");
  return "covered";
}

const normalFunction = (param) => {
  if (param > 0) {
    return param * 2;
  }
  return 0;
};

shouldBeCovered();
normalFunction(5);
