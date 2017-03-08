'use strict';

// Step vectors
var vectors = [[1,0], [0,-1], [-1,0], [0,1]]; // up left down right


function getLevel (x) {
	// levels start on squares of odd numbers plus one
	var level = Math.ceil(Math.sqrt(x));
	if (level % 2 == 0) level++;
	// now have the odd number. get the natural level number
	level = (level + 1) / 2;
	return level;
}

function getSizeOfStep(level) {
	if (level == 1) return 1;
	return (level - 1) * 2;
}

function getStepAndRemainder (x, level) {
	var subLevel = level - 1; // want level to start at 1 instead of 0
	if (subLevel == 0) {
		if (x < 1) return {"err": "low" };
		if (x > 1) return {"err": "high" };
		return {"step": 0, "remainder": 0};
	}
	var odd = subLevel * 2 - 1;
  var min = Math.pow(odd, 2) + 1;
  if (x < min) {
  	return {"err": "low" };
  } 
  var stepSize = getSizeOfStep(level);
  var max = min + 4 * stepSize - 1;
  if (x > max) {
  	return {"err": "high" };
  }
  // find interval x is in
  if (x < min + stepSize) {
  	return {"step": 0, "remainder": x - min};
  } else if (x < min + 2 * stepSize) {
  	return {"step": 1, "remainder": x - (min + stepSize)};
  } else if (x < min + 3 * stepSize) {
  	return {"step": 2, "remainder": x - (min + 2 * stepSize)};
  } else {
  	return {"step": 3, "remainder": x - (min + 3 * stepSize)};
  }
}

// level is 1-based & step is 0-based
function getStartOfStep (level, step) {
	var subLevel = level - 1; // want level to start at 1 instead of 0
	if (subLevel == 0) {
		return 1;
	}
	var odd = subLevel * 2 - 1;
	var startOfLevel = Math.pow(odd, 2) + 1;
	var sizeOfStep = getSizeOfStep(level); // every step is same size
	var startOfStep = startOfLevel + step * sizeOfStep;
	return startOfStep;
}


function walk (currentVector, currentValue, currentStep, currentLevel, currentRemainder, currentVectorFromStart, range, direction, neighborhood) {
  console.log("walk value " + currentValue + " level " + currentLevel);
  // use for calculating vector (hack for backwards)
  var effectiveValue = (direction == "low") ? currentValue + 1 : currentValue;

  var result = getStepAndRemainder(effectiveValue, currentLevel);
  if ('err' in result) {
    if (result.err == direction) {
    	console.log("err");
    	// transition to next step (turn 90 degrees clockwise for high/up, clockwise for low/down)
    	currentLevel += (direction == "high") ? 1 : -1;
    	result = getStepAndRemainder(effectiveValue, currentLevel);
    } else {
    	// should not occur (wrong direction)
    	throw new Error("getStepAndRemainder expected direction " + direction + " but threw direction error " + result.err);
    }
  }
  currentStep = result["step"];
  if (direction == "low") {
  	// walk backwards (hack for currentVector)
  	currentStep += (currentStep > 1) ? -2 : 2;
  }
  currentRemainder = result["remainder"];
    console.log("step " + currentStep + " rem " + currentRemainder);
  currentVector = vectors[currentStep];
  // if (currentLevel != level) {
  // 	throw new Error("currentLevel " + currentLevel + " is unexpectedly not level " + level);
  // }
  // check if in range
  currentVectorFromStart[0] += currentVector[0];
  currentVectorFromStart[1] += currentVector[1];
  console.log(currentValue + ": " + currentVector + " : " + currentVectorFromStart);
  if (Math.abs(currentVectorFromStart[0]) <= range && Math.abs(currentVectorFromStart[1]) <= range) {
    // add current value to neighborhood
    // remember that there are no negatives in array offsets
    console.log((currentVectorFromStart[0] + range ) + ":" + (currentVectorFromStart[1] + range ) + " -> " + currentValue);
    neighborhood[ currentVectorFromStart[0] + range ][ currentVectorFromStart[1] + range ] = currentValue;
  }
}

function walkNearby (x, currentVectorFromStart, range, neighborhood, isCentered) {
  var startingVectorFromStart = currentVectorFromStart.slice();

	var level = getLevel(x);
  var {step:step, remainder:remainder} = getStepAndRemainder(x, level);
  var vector = vectors[step];

  // walk in range on this whole step
  var currentVector = vectors[step];
  var startValue = x;
  var currentStep = step;
  var currentLevel = level;
  var currentRemainder = remainder;
//  var currentVectorFromStart = [0,0];
  // add starting point
  if (Math.abs(currentVectorFromStart[0]) <= range && Math.abs(currentVectorFromStart[1]) <= range) {
		// console.log((currentVectorFromStart[0] + range ) + ":" + (currentVectorFromStart[1] + range ) + " -> " + startValue);
    neighborhood[ currentVectorFromStart[0] + range  ][ currentVectorFromStart[1] + range ] = startValue;
  }
  // walk counter-clockwise with current* vars
  var min = startValue + 1;
  var max = startValue + range * 2;
  if (isCentered) max = 4 * currentLevel + 1; // center (1) is equidistant to all steps in level
  for (var i = min; i <= max; i++) {
  	// console.log("forward " + i + ": " + startValue);
    if (getLevel(i) > currentLevel) break;
    walk (currentVector, i, currentStep, currentLevel, currentRemainder, currentVectorFromStart, range, "high", neighborhood);
  }
  // walk clockwise with current* vars
  // call by value so we use the same current* vars as above except this one
  currentVectorFromStart = startingVectorFromStart.slice();
  for (var i = startValue - 1; i >= startValue - range * 2; i--) {
  	if (i < 1) break;
    if (getLevel(i) < currentLevel) break;
  	// console.log("backward " + i + ": " + startValue);
    walk (currentVector, i, currentStep, currentLevel, currentRemainder, currentVectorFromStart, range, "low", neighborhood);
  }
  // var stepStart = getStartOfStep(level, step);
  // var stepEnd = stepStart + level; // level is sizeOfStep

}

// find the value which is nearby but in the next level
// use the current step and remainder on the next level
function getNextLevelValue (currentLevel, currentStep, currentRemainder) {
  if (currentLevel == 1) return 2;
//  if (currentLevel == 2 ) return 11;
  var nextLevel = currentLevel + 1;
  var nextStartOfStep = getStartOfStep(nextLevel, currentStep);
  var nextValue = nextStartOfStep + currentRemainder + 1;
  return nextValue;
}

// find the value which is nearby but in the lower level
// use the current step and remainder on the previous level
function getLowerLevelValue (currentLevel, currentStep, currentRemainder) {
  var lowerLevel = currentLevel - 1;
  if (lowerLevel <= 1) {
    return 1;
  }
  var lowerStartOfStep = getStartOfStep(lowerLevel, currentStep);
  var lowerSizeOfStep = lowerLevel;
  var lowerValue = lowerStartOfStep + ((currentRemainder < lowerSizeOfStep) ? currentRemainder : lowerSizeOfStep) - 1;
  return lowerValue;
}

function getNeighborhood (x, range) {
	var neighborhood = [];
	for (var i = 0; i < range * 2 + 1; i++) {
		neighborhood.push([]);
	}
  var currentVectorFromStart = [0,0];
	var isCentered = x == 1;

	// walk the starting level
  walkNearby(x, currentVectorFromStart, range, neighborhood, isCentered);

  // walk each level above starting level, in range
  var	currentLevel = getLevel(x);
  var result = getStepAndRemainder(x, currentLevel);
  if ('err' in result) {
  	throw new Error("Unable to get step and remainder for initial value " + x + " and level " + currentLevel);
  }
  var currentStep = result.step;
  var currentRemainder = result.remainder;
  console.log("### level " + currentLevel +" step " + currentStep + " rem " + currentRemainder);
  var currentValue = getNextLevelValue(currentLevel, currentStep, currentRemainder);
  var vectorAwayFromStartIndex = (currentStep > 0) ? currentStep - 1 : 3;
  var vectorAwayFromStart = vectors[vectorAwayFromStartIndex];
  currentVectorFromStart = vectorAwayFromStart.slice();
  for (var i = 0; i < range; i++) {
    console.log(i + " levels above. currentValue " + currentValue + ", currentVectorFromStart " + currentVectorFromStart + " vectorAwayFromStart " +vectorAwayFromStart);
    // currentRemainder inches upward to compensate
    currentLevel++;
    currentRemainder++;
  	walkNearby(currentValue, currentVectorFromStart, range, neighborhood, isCentered);
    // currentValue and currentLevel go to next level
    // currentStep stays the same
    currentValue = getNextLevelValue(currentLevel, currentStep, currentRemainder);
    currentVectorFromStart[0] = vectorAwayFromStart[0] * (i+2);
    currentVectorFromStart[1] = vectorAwayFromStart[1] * (i+2);
  }

  // walk each level below starting level, in range
  currentLevel = getLevel(x);
  currentStep = result.step;
  currentRemainder = result.remainder;
  currentValue = getLowerLevelValue(currentLevel, currentStep, currentRemainder);
  vectorAwayFromStartIndex = (currentStep < 3) ? currentStep + 1 : 0;
  vectorAwayFromStart = vectors[vectorAwayFromStartIndex];
  currentVectorFromStart = vectorAwayFromStart.slice();
  for (var i = 0; i < range; i++) {
  	if (currentLevel <= 1) break;
    console.log(i + " levels below. value " + currentValue + ", vectorFromStart " + currentVectorFromStart);
    currentLevel--;
    currentRemainder--;
  	walkNearby(currentValue, currentVectorFromStart, range, neighborhood, isCentered);
    // currentValue goes to previous level
    currentValue = getLowerLevelValue(currentLevel, currentStep, currentRemainder);
    currentVectorFromStart[0] = vectorAwayFromStart[0] * (i+2);
    currentVectorFromStart[1] = vectorAwayFromStart[1] * (i+2);
  }

  return neighborhood;
};

module.exports = {
	getLevel: getLevel,
	getStepAndRemainder: getStepAndRemainder,
	getStartOfStep: getStartOfStep,
	walkNearby: walkNearby,
  getNextLevelValue: getNextLevelValue,
  getLowerLevelValue: getLowerLevelValue,
	getNeighborhood: getNeighborhood
};