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


function walk (currentVector, currentValue, currentStep, currentLevel, currentRemainder, currentVectorFromX, range, direction, neighborhood) {
  console.log("walk");
  var result = getStepAndRemainder(currentValue, currentLevel);
  if ('err' in result) {
    if (result.err == direction) {
    	// transition to next step (turn 90 degrees clockwise for high/up, clockwise for low/down)
    	currentLevel += (direction == "high") ? 1 : -1;
    	result = getStepAndRemainder(currentValue, currentLevel);
    } else {
    	// should not occur (wrong direction)
    	throw new Error("getStepAndRemainder expected direction " + direction + " but threw direction error " + result.err);
    }
  }
  currentStep = result["step"];
  currentRemainder = result["remainder"];
  currentVector = vectors[currentStep];
  // if (currentLevel != level) {
  // 	throw new Error("currentLevel " + currentLevel + " is unexpectedly not level " + level);
  // }
  // check if in range
  currentVectorFromX[0] += currentVector[0];
  currentVectorFromX[1] += currentVector[1];
  if (currentVectorFromX[0] <= range && currentVectorFromX[1] <= range) {
    // add current value to neighborhood
    // remember that there are no negatives in array offsets
    console.log((currentVectorFromX[0] + range + 1) + ":" + (currentVectorFromX[1] + range + 1) + " -> " + currentValue);
    neighborhood[ currentVectorFromX[0] + range + 1 ][ currentVectorFromX[1] + range +1] = currentValue;
  }
}

function walkNearby (x, range, neighborhood) {
	var level = getLevel(x);
  var {step:step, remainder:remainder} = getStepAndRemainder(x, level);
  var vector = vectors[step];

  // walk in range on this whole step
  var currentVector = vectors[step];
  var currentValue = x;
  var currentStep = step;
  var currentLevel = level;
  var currentRemainder = remainder;
  var currentVectorFromX = [0,0];
  // walk counter-clockwise with current* vars
  for (var i = currentValue + 1; i <= currentValue + range * 2; i++) {
    walk (currentVector, i, currentStep, currentLevel, currentRemainder, currentVectorFromX, range, "high", neighborhood);
  }
  // walk clockwise with current* vars
  // call by value so we use the same current* vars as above
  for (var i = currentValue - 1; i <= currentValue - range * 2; i--) {
    walk (currentVector, i, currentStep, currentLevel, currentRemainder, currentVectorFromX, range, "low", neighborhood);
  }
  // var stepStart = getStartOfStep(level, step);
  // var stepEnd = stepStart + level; // level is sizeOfStep

}

// find the value which is nearby but in the next level
// use the current step and remainder on the next level
function getNextLevelValue (x, currentLevel, currentStep, currentRemainder) {
  var nextLevel = currentLevel + 1;
  var nextStartOfStep = getStartOfStep(nextLevel, currentStep);
  var nextValue = nextStartOfStep + currentRemainder;
  return nextValue;
}

// find the value which is nearby but in the lower level
// use the current step and remainder on the previous level
function getLowerLevelValue (x, currentLevel, currentStep, currentRemainder) {
  var lowerLevel = currentLevel - 1;
  var lowerStartOfStep = getStartOfStep(lowerLevel, currentStep);
  var lowerSizeOfStep = lowerLevel;
  var lowerValue = lowerStartOfStep + ((currentRemainder < lowerSizeOfStep) ? currentRemainder : lowerSizeOfStep);
  return lowerValue;
}

function getNeighborhood (x, range) {
	var neighborhood = [];
	for (var i = 0; i < range * 2 + 1; i++) {
		neighborhood.push([]);
	}

	// walk the starting level
  walkNearby(x, range, neighborhood);

  // walk each level above starting level, in range
  var	currentLevel = getLevel(x);
  var result = getStepAndRemainder(x, currentLevel);
  if ('err' in result) {
  	throw new Error("Unable to get step and remainder for initial value " + x + " and level " + currentLevel);
  }
  var currentStep = result.step;
  var currentRemainder = result.remainder;
  var currentValue = x;
  for (var i = 0; i < range; i++) {
  	// currentValue and currentLevel go to next level
  	// currentStep stays the same
  	// and currentRemainder inches upward
  	currentValue = getNextLevelValue(currentValue, currentLevel, currentStep, currentRemainder);
  	currentLevel++;
  	currentRemainder++;
  	walkNearby(currentValue, range, neighborhood);
  }

  // walk each level below starting level, in range
  currentLevel = getLevel(x);
  var currentStep = result.step;
  var currentRemainder = result.remainder;
  var currentValue = x - 1;
  for (var i = 0; i < range; i++) {
  	// currentValue goes to previous level
  	currentValue = getLowerLevelValue(currentValue, currentLevel, currentStep, currentRemainder);
  	currentLevel--;
  	currentRemainder--;
  	walkNearby(currentValue, range, neighborhood);
  }

  return neighborhood;
};

module.exports = {
	getLevel: getLevel,
	getStepAndRemainder: getStepAndRemainder,
	getStartOfStep: getStartOfStep,
	getNeighborhood: getNeighborhood
};