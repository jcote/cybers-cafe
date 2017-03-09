'use strict';

var assert = require('assert');
var spiral = require('../scripts/spiral');

describe('Spiral', function() {
  describe('#getLevel()', function() {
    it('returns correct level', function() {
      assert.equal(spiral.getLevel(1), 1);
      assert.equal(spiral.getLevel(2), 2);
      assert.equal(spiral.getLevel(3), 2);
      assert.equal(spiral.getLevel(7), 2);
      assert.equal(spiral.getLevel(9), 2);
      assert.equal(spiral.getLevel(10), 3);
      assert.equal(spiral.getLevel(11), 3);
      assert.equal(spiral.getLevel(13), 3);
      assert.equal(spiral.getLevel(17), 3);
      assert.equal(spiral.getLevel(21), 3);
      assert.equal(spiral.getLevel(25), 3);
      assert.equal(spiral.getLevel(26), 4);
      assert.equal(spiral.getLevel(27), 4);
      assert.equal(spiral.getLevel(34), 4);
      assert.equal(spiral.getLevel(43), 4);
      assert.equal(spiral.getLevel(49), 4);
      assert.equal(spiral.getLevel(50), 5);
      assert.equal(spiral.getLevel(55), 5);
      assert.equal(spiral.getLevel(81), 5);
    });
  });

  describe('#getStepAndRemainder()', function() {
    it('returns correct step and remainder', function() {
    	result = spiral.getStepAndRemainder(0, 1);
    	assert.equal(result.err, "low");   

    	var result = spiral.getStepAndRemainder(1, 1);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 0);
    	
    	result = spiral.getStepAndRemainder(2, 1);
    	assert.equal(result.err, "high");   

    	result = spiral.getStepAndRemainder(1, 2);
    	assert.equal(result.err, "low");    	

    	result = spiral.getStepAndRemainder(2, 2);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(3, 2);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 1);

    	result = spiral.getStepAndRemainder(4, 2);
    	assert.equal(result.step, 1);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(5, 2);
    	assert.equal(result.step, 1);
    	assert.equal(result.remainder, 1);

    	result = spiral.getStepAndRemainder(6, 2);
    	assert.equal(result.step, 2);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(7, 2);
    	assert.equal(result.step, 2);
    	assert.equal(result.remainder, 1);

    	result = spiral.getStepAndRemainder(8, 2);
    	assert.equal(result.step, 3);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(9, 2);
    	assert.equal(result.step, 3);
    	assert.equal(result.remainder, 1);

    	result = spiral.getStepAndRemainder(10, 2);
    	assert.equal(result.err, "high");

    	result = spiral.getStepAndRemainder(14, 2);
    	assert.equal(result.err, "high");

    	result = spiral.getStepAndRemainder(100, 2);
    	assert.equal(result.err, "high");

    	result = spiral.getStepAndRemainder(5, 3);
    	assert.equal(result.err, "low");

    	result = spiral.getStepAndRemainder(9, 3);
    	assert.equal(result.err, "low");

    	result = spiral.getStepAndRemainder(10, 3);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(13, 3);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 3);

    	result = spiral.getStepAndRemainder(14, 3);
    	assert.equal(result.step, 1);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(17, 3);
    	assert.equal(result.step, 1);
    	assert.equal(result.remainder, 3);

    	result = spiral.getStepAndRemainder(18, 3);
    	assert.equal(result.step, 2);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(21, 3);
    	assert.equal(result.step, 2);
    	assert.equal(result.remainder, 3);

    	result = spiral.getStepAndRemainder(22, 3);
    	assert.equal(result.step, 3);
    	assert.equal(result.remainder, 0);

    	result = spiral.getStepAndRemainder(25, 3);
    	assert.equal(result.step, 3);
    	assert.equal(result.remainder, 3);
    	
    	result = spiral.getStepAndRemainder(26, 3);
    	assert.equal(result.err, "high");

    	result = spiral.getStepAndRemainder(25, 4);
    	assert.equal(result.err, "low");

    	result = spiral.getStepAndRemainder(26, 4);
    	assert.equal(result.step, 0);
    	assert.equal(result.remainder, 0);

    });
  });

  describe('#getStartOfStep()', function() {
    it('returns correct start value', function() {
      assert.equal(spiral.getStartOfStep(1,0), 1);
      assert.equal(spiral.getStartOfStep(1,1), 1);
      assert.equal(spiral.getStartOfStep(1,2), 1);
      assert.equal(spiral.getStartOfStep(1,3), 1);

      assert.equal(spiral.getStartOfStep(2,0), 2);
      assert.equal(spiral.getStartOfStep(2,1), 4);
      assert.equal(spiral.getStartOfStep(2,2), 6);
      assert.equal(spiral.getStartOfStep(2,3), 8);

      assert.equal(spiral.getStartOfStep(3,0), 10);
      assert.equal(spiral.getStartOfStep(3,1), 14);
      assert.equal(spiral.getStartOfStep(3,2), 18);
      assert.equal(spiral.getStartOfStep(3,3), 22);      

      assert.equal(spiral.getStartOfStep(4,0), 26);
      assert.equal(spiral.getStartOfStep(4,1), 32);
      assert.equal(spiral.getStartOfStep(4,2), 38);
      assert.equal(spiral.getStartOfStep(4,3), 44);

      assert.equal(spiral.getStartOfStep(5,0), 50);
      assert.equal(spiral.getStartOfStep(5,1), 58);
      assert.equal(spiral.getStartOfStep(5,2), 66);
      assert.equal(spiral.getStartOfStep(5,3), 74);
    });
  });

  describe('#walkNearby()', function() {
    it('returns a populated neighborhood array', function() {
    	var range = 1;

    	// 15 center, start
			var neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(15, [0,0], range, neighborhood);
      assert.deepEqual(neighborhood, [ [], [16,15,14], [] ]);

    	// 15 center, +1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(34, [1,0], range, neighborhood);
      assert.deepEqual(neighborhood, [ [], [], [35,34,33] ]);

    	// 15 center, -1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(4, [-1,0], range, neighborhood);
      assert.deepEqual(neighborhood, [ [5,4,3], [], [] ]);

    	// 43 center, start
			var neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(43, [0,0], range, neighborhood);
      assert.deepEqual(neighborhood, [ [], [,43,44], [,42,] ]);

    	// 43 center, +1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(73, [-1,-1], range, neighborhood);
      assert.deepEqual(neighborhood, [ [73,74,75], [72,,], [71,,] ]);

    	// 43 center, -1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(21, [1,1], range, neighborhood);
      assert.deepEqual(neighborhood, [ [], [], [,,21] ]);

    	// 1 center, start
			var neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(1, [0,0], range, neighborhood, true);
      assert.deepEqual(neighborhood, [ [], [,1,], [] ]);

    	// 1 center, +1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(2, [0,1], range, neighborhood, true);
      assert.deepEqual(neighborhood, [ [7,8,9], [6,,2], [5,4,3] ]);

      range = 2;

    	// 1 center, start
			var neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(1, [0,0], range, neighborhood, true);
      assert.deepEqual(neighborhood, [ [], [], [,,1,,], [], [] ]);

    	// 1 center, +1
			neighborhood = [];
			for (var i = 0; i < range * 2 + 1; i++) neighborhood.push([]);
			spiral.walkNearby(2, [0,1], range, neighborhood, true);
      assert.deepEqual(neighborhood, [ [], [,7,8,9,], [,6,,2,], [,5,4,3,], [] ]);

    });
  });

  describe('#getNextLevelValue()', function() {
    it('returns the correct near value on next level', function() {
    	assert.equal(spiral.getNextLevelValue(1,0,0), 2);
      assert.equal(spiral.getNextLevelValue(2,0,0), 11);
      assert.equal(spiral.getNextLevelValue(2,0,1), 12);
      assert.equal(spiral.getNextLevelValue(2,1,0), 15);
      assert.equal(spiral.getNextLevelValue(2,1,1), 16);
      assert.equal(spiral.getNextLevelValue(2,2,0), 19);
      assert.equal(spiral.getNextLevelValue(2,2,1), 20);
      assert.equal(spiral.getNextLevelValue(2,3,0), 23);
      assert.equal(spiral.getNextLevelValue(2,3,1), 24);
      assert.equal(spiral.getNextLevelValue(3,0,0), 27);
      assert.equal(spiral.getNextLevelValue(3,0,1), 28);
      assert.equal(spiral.getNextLevelValue(3,0,2), 29);
      assert.equal(spiral.getNextLevelValue(3,0,3), 30);
      assert.equal(spiral.getNextLevelValue(3,1,0), 33);
      assert.equal(spiral.getNextLevelValue(4,1,0), 59);
    });
  });

  describe('#getLowerLevelValue()', function() {
    it('returns the correct near value on previous level', function() {
      assert.equal(spiral.getLowerLevelValue(2,0,0), 1);
      assert.equal(spiral.getLowerLevelValue(2,0,1), 1);
      assert.equal(spiral.getLowerLevelValue(2,1,0), 1);
      assert.equal(spiral.getLowerLevelValue(2,1,1), 1);
      assert.equal(spiral.getLowerLevelValue(2,2,0), 1);
      assert.equal(spiral.getLowerLevelValue(2,2,1), 1);
      assert.equal(spiral.getLowerLevelValue(2,3,0), 1);
      assert.equal(spiral.getLowerLevelValue(2,3,1), 1);
      assert.equal(spiral.getLowerLevelValue(3,0,0), 1);//2);
      assert.equal(spiral.getLowerLevelValue(3,0,1), 2);
      assert.equal(spiral.getLowerLevelValue(3,0,2), 3);
      assert.equal(spiral.getLowerLevelValue(3,0,3), 3);
      assert.equal(spiral.getLowerLevelValue(3,1,0), 3);
      assert.equal(spiral.getLowerLevelValue(3,1,1), 4);
      assert.equal(spiral.getLowerLevelValue(3,1,2), 5);
      assert.equal(spiral.getLowerLevelValue(3,1,3), 5);
      assert.equal(spiral.getLowerLevelValue(3,2,0), 5);
      assert.equal(spiral.getLowerLevelValue(3,2,1), 6);
      assert.equal(spiral.getLowerLevelValue(3,2,2), 7);
      assert.equal(spiral.getLowerLevelValue(3,2,3), 7);
      assert.equal(spiral.getLowerLevelValue(3,3,0), 7);
      assert.equal(spiral.getLowerLevelValue(3,3,1), 8);
      assert.equal(spiral.getLowerLevelValue(3,3,2), 9);
      assert.equal(spiral.getLowerLevelValue(3,3,3), 9);//10);
      assert.equal(spiral.getLowerLevelValue(4,0,0), 9);//10);
      assert.equal(spiral.getLowerLevelValue(4,0,1), 10);
      assert.equal(spiral.getLowerLevelValue(4,0,2), 11);
      assert.equal(spiral.getLowerLevelValue(4,0,3), 12);

    });
  });

  describe('#getNeighborhood()', function() {
    it('returns a populated neighborhood array', function() {
    	var range = 1;
      assert.deepEqual(spiral.getNeighborhood(1,range), [ [7,8,9], [6,1,2], [5,4,3] ]);
      assert.deepEqual(spiral.getNeighborhood(15,range), [ [5,4,3], [16,15,14], [35,34,33] ]);
      //assert.deepEqual(spiral.getNeighborhood(49,range), [ [79,80,81], [48,49,50], [25,26,51] ]);
      range = 2;
      
      assert.deepEqual(spiral.getNeighborhood(15,range), [ [19,6,1,2,11], [18,5,4,3,12], [17,16,15,14,13], [36,35,34,33,32], [63,62,61,60,59] ]);
      //assert.deepEqual(spiral.getNeighborhood(1,range), [ [21,22,23,24,25], [20,7,8,9,10], [19,6,1,2,11], [18,5,4,3,12], [17,16,15,14,13] ]);
    });
  });

});