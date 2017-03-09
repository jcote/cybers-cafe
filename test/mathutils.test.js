'use strict';

var assert = require('assert');
var mathutils = require('../scripts/mathutils');

describe('MathUtils', function() {
  describe('#CantorPair()', function() {
    it('returns correct values', function() {
			var tests = [  ];
			for (var x = 0; x<100; x++) {
			  for (var y=0; y<100; y++) {
			    tests.push([x,y]);
			  }
			}

			for (var i=0;i<tests.length;i++) {
			  var r = mathutils.cantorPair(tests[i][0],tests[i][1]);
			  var r2 = mathutils.reverseCantorPair(r);
			  assert.equal( r2.toString(), tests[i].toString() );
			}
    });

    it('does not reverse lookup on certain number class', function() {
      var failingTests = [];
			failingTests.push([-1,-1]);
			failingTests.push([Math.PI,Math.PI/2]);
			failingTests.push([1.241245645645364,231231231]);

			for (var i=0;i<failingTests.length;i++) {
			  var r = mathutils.cantorPair(failingTests[i][0],failingTests[i][1]);
			  var r2 = mathutils.reverseCantorPair(r);
			  assert.notEqual( r2.toString(), failingTests[i].toString() );
			}

    });
  });

  describe('#evenOddEncode()', function() {
    it('Encode returns original values with Decode', function() {
			var tests = [  ];
			for (var x = -50; x<50; x++) {
			  tests.push(x);
			}

			for (var i=0;i<tests.length;i++) {
			  var r = mathutils.evenOddEncode(tests[i]);
			  var r2 = mathutils.evenOddDecode(r);
			  assert.equal( r2, tests[i] );
			}
    });
    it('Decode returns original values with Encode', function() {
			var tests = [  ];
			for (var x = 0; x<1000; x++) {
			  tests.push(x);
			}

			for (var i=0;i<tests.length;i++) {
			  var r2 = mathutils.evenOddDecode(tests[i]);
			  var r = mathutils.evenOddEncode(r2);
			  assert.equal( r, tests[i] );
			}
    });
  });

  describe('#zCantorPair()', function() {
    it('returns original values with Reverse', function() {
			var tests = [  ];
			for (var x = -10; x<10; x++) {
			  for (var y= -10; y<10; y++) {
			    tests.push([x,y]);
			  }
			}

			for (var i=0;i<tests.length;i++) {
			  var r = mathutils.zCantorPair(tests[i][0], tests[i][1]);
			  var r2 = mathutils.zReverseCantorPair(r);
			  assert.deepEqual( r2, tests[i] );
			}
    });

    it('Reverse returns original values with Normal', function() {
			var tests = [  ];
			for (var x = 0; x<1000; x++) {
			    tests.push(x);
			}

			for (var i=0;i<tests.length;i++) {
			  var r2 = mathutils.zReverseCantorPair(tests[i]);
			  var r = mathutils.zCantorPair(r2[0], r2[1]);
			  assert.deepEqual( r, tests[i] );
			}
    });
  });


  describe('#SpiralPair()', function() {
    it('returns correct values', function() {
    	assert.equal(mathutils.spiralPair(0,0), 0);
    	assert.equal(mathutils.spiralPair(0,-1), 1);
    	assert.equal(mathutils.spiralPair(1,-1), 2);
    	assert.equal(mathutils.spiralPair(1,0), 3);
    	assert.equal(mathutils.spiralPair(1,1), 4);
    	assert.equal(mathutils.spiralPair(0,1), 5);
    	assert.equal(mathutils.spiralPair(-1,1), 6);
    	assert.equal(mathutils.spiralPair(-1,0), 7);
    	assert.equal(mathutils.spiralPair(-1,-1), 8);
    	assert.equal(mathutils.spiralPair(-1,-2), 9);
    	assert.equal(mathutils.spiralPair(0,-2), 10);
    	assert.equal(mathutils.spiralPair(1,-2), 11);
    	assert.equal(mathutils.spiralPair(2,-2), 12);
    	assert.equal(mathutils.spiralPair(2,-1), 13);
    	assert.equal(mathutils.spiralPair(2,0), 14);
    	assert.equal(mathutils.spiralPair(2,1), 15);
    	assert.equal(mathutils.spiralPair(2,2), 16);
    	assert.equal(mathutils.spiralPair(1,2), 17);
    	assert.equal(mathutils.spiralPair(0,2), 18);
    	assert.equal(mathutils.spiralPair(-1,2), 19);
    	assert.equal(mathutils.spiralPair(-2,2), 20);
    	assert.equal(mathutils.spiralPair(-2,1), 21);
    	assert.equal(mathutils.spiralPair(-2,0), 22);
    	assert.equal(mathutils.spiralPair(-2,-1), 23);
    	assert.equal(mathutils.spiralPair(-2,-2), 24);
    	assert.equal(mathutils.spiralPair(-2,-3), 25);
    	assert.equal(mathutils.spiralPair(-1,-3), 26);
    });
  });

});