/* istanbul ignore file */

// This file should be completely skipped from coverage
// because of the ignore comment at the top

function shouldNotBeCovered() {
  console.log("This function should not appear in coverage");
  return "skipped";
}

const anotherFunction = () => {
  return "also skipped";
};

export { shouldNotBeCovered, anotherFunction };
