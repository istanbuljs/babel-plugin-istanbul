/* skip-coverage */

// This file should also be skipped from coverage
// because of the skip-coverage comment

function alsoSkipped() {
  console.log("This should not be instrumented");
  return 42;
}

export default alsoSkipped;
