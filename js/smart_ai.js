// This AI follows a hard-coded strategy based on the programmer's experience.
// It is not a trained AI. This version includes special handling for 2048+ tiles
// to prevent them from merging and encourage stacking behavior instead.

GoalType = { UNDEFINED: -1, BUILD: 0, SHIFT: 1, MOVE: 2 };

Goal = function() {
};
Goal.prototype = {
  type: GoalType.UNDEFINED
};

SmartAI = function(game) {
  // If passed a grid directly (classic AI style), create minimal game interface
  if (game.size !== undefined) { // Check if it's a grid object
    const grid = game;
    this.game = {
      grid: grid,
      moveTiles: function(direction) {
        var clonedGrid = grid.clone();
        if (clonedGrid.move(direction).moved) {
          return true;
        }
        return false;
      },
      getVector: function(direction) {
        const map = {
          0: { x: 0, y: -1 }, // up
          1: { x: 1, y: 0 },  // right
          2: { x: 0, y: 1 },  // down
          3: { x: -1, y: 0 }  // left
        };
        return map[direction];
      },
      buildTraversals: function(vector) {
        var traversals = { x: [], y: [] };
        for (var pos = 0; pos < grid.size; pos++) {
          traversals.x.push(pos);
          traversals.y.push(pos);
        }
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();
        return traversals;
      }
    };
  } else {
    this.game = game;
  }
};

SmartAI.prototype.nextMove = function() {
  // Uses depth-5 search for move evaluation
  return this.chooseBestMove2(this.game.grid, 5);
};

SmartAI.prototype.chooseBestMove2 = function(grid, numMoves) {
  var value = -Infinity;
  var direction = -1;
  var availableCells = grid.availableCells();

  for (var d = 0; d < 4; d++) {
    var testGrid = grid.clone();
    var moved = testGrid.move(d).moved;
    if (!moved) continue;
    if (direction == -1) direction = d;
    var value2 = this.planAhead(testGrid, numMoves, -Infinity, Infinity, false);
    if (value2 > value) {
      direction = d;
      value = value2;
    }
  }
  return direction;
};

// Minimax algorithm with alpha-beta pruning for looking ahead
SmartAI.prototype.planAhead = function(grid, numMoves, alpha, beta, maximizing) {
  if (!this.movesAvailable(grid) || numMoves == 0) {
    return this.gridQuality(grid);
  }

  var availableCells = grid.availableCells();
  var value;

  if (maximizing) {
    value = -Infinity;
    for (var d = 0; d < 4; d++) {
      var testGrid = grid.clone();
      if (!testGrid.move(d).moved) continue;
      value = Math.max(value, this.planAhead(testGrid, numMoves-1, alpha, beta, false));
      if (value > beta) break;
      alpha = Math.max(alpha, value);
    }
    return value;
  } else {
    value = Infinity;
    for (var i = 0; i < availableCells.length; i++) {
      var cell = availableCells[i];

      if (!this.hasAdjacentTile(grid, cell)) continue;

      // Try placing a 2
      var testGrid = grid.clone();
      testGrid.insertTile(new Tile(cell, 2));
      value = Math.min(value, this.planAhead(testGrid, numMoves-1, alpha, beta, true));
      if (value < alpha) break;
      beta = Math.min(beta, value);

      // Try placing a 4
      testGrid = grid.clone();
      testGrid.insertTile(new Tile(cell, 4));
      value = Math.min(value, this.planAhead(testGrid, numMoves-1, alpha, beta, true));
      if (value < alpha) break;
      beta = Math.min(beta, value);
    }
    return value;
  }
};

SmartAI.prototype.hasAdjacentTile = function(grid, cell) {
  var vectors = [
    {x: 0, y: -1},
    {x: 1, y: 0},
    {x: 0, y: 1},
    {x: -1, y: 0}
  ];

  for (var i = 0; i < vectors.length; i++) {
    var adjCell = {
      x: cell.x + vectors[i].x,
      y: cell.y + vectors[i].y
    };
    if (grid.cellContent(adjCell)) {
      return true;
    }
  }
  return false;
};

SmartAI.prototype.movesAvailable = function(grid) {
  for (var d = 0; d < 4; d++) {
    var testGrid = grid.clone();
    if (testGrid.move(d).moved) {
      return true;
    }
  }
  return false;
};

// Gets the quality of the current state of the grid
// This function has been modified to handle 2048+ tiles differently:
// - Prevents merging of 2048+ tiles by not rewarding their combinations
// - Encourages stacking 2048+ tiles by rewarding adjacent placement
// - Maintains separate scoring for sub-2048 tiles to preserve normal gameplay
SmartAI.prototype.gridQuality = function(grid) {
  var monoScore = 0;
  var traversals = this.game.buildTraversals({x: -1, y: 0});
  var prevValue = -1;
  var incScore = 0, decScore = 0;
  var prevMerge = -1;
  var emptyScore = 0;
  var mergeScore = 0;
  var sumScore = 0;
  var counter = 0;
  var twentyFortyEightCount = 0;  // Tracks number of 2048+ tiles
  var twentyFortyEightAlignment = 0;  // Rewards for adjacent 2048+ tiles

  var scoreCell = function(cell) {
    var tile = grid.cellContent(cell);
    var tileValue = (tile ? Math.log2(tile.value) : 0);
    
    // Special handling for 2048+ tiles
    if (tile && tile.value >= 2048) {
      twentyFortyEightCount++;
      // Check and reward adjacent 2048+ tiles to encourage stacking
      var vectors = [
        {x: 0, y: -1},
        {x: 1, y: 0},
        {x: 0, y: 1},
        {x: -1, y: 0}
      ];
      for (var i = 0; i < vectors.length; i++) {
        var adjCell = {
          x: cell.x + vectors[i].x,
          y: cell.y + vectors[i].y
        };
        var adjTile = grid.cellContent(adjCell);
        if (adjTile && adjTile.value >= 2048) {
          twentyFortyEightAlignment += 1000; // High reward for stacking 2048+ tiles
        }
      }
    }
    
    if (tileValue == 0) {
      emptyScore++;
    } else {
      // Different scoring for tiles below and above 2048
      if (tile.value < 2048) {
        sumScore += Math.pow(tileValue, 3.5);
      } else {
        // Reduced power for 2048+ tiles to maintain their separation
        sumScore += Math.pow(tileValue, 2.5);
      }
      
      // Only count merges for tiles below 2048
      if (prevMerge == tileValue && tile.value < 2048) {
        counter++;
      } else if (counter > 0) {
        mergeScore += 1 + counter;
        counter = 0;
      }
      prevMerge = tileValue;
    }
    
    if (prevValue == -1) {
      prevValue = tileValue;
      return;
    }
    
    // Modified monotonicity scoring to handle 2048+ tiles differently
    if (tileValue > prevValue) {
      if (Math.pow(2, prevValue) < 2048 || Math.pow(2, tileValue) < 2048) {
        incScore += Math.pow(tileValue, 4) - Math.pow(prevValue, 4);
      }
    } else {
      if (Math.pow(2, prevValue) < 2048 || Math.pow(2, tileValue) < 2048) {
        decScore -= Math.pow(tileValue, 4) - Math.pow(prevValue, 4);
      }
    }
    prevValue = tileValue;
  };

  // Traverse each column
  traversals.x.forEach(function (x) {
    prevValue = -1;
    prevMerge = -1;
    incScore = 0;
    decScore = 0;
    counter = 0;
    traversals.y.forEach(function (y) {
      scoreCell({ x: x, y: y });
    });
    monoScore += Math.min(incScore, decScore);
  });
  if (counter > 0) {mergeScore += 1 + counter;}
  
  // Traverse each row
  traversals.y.forEach(function (y) {
    prevValue = -1;
    prevMerge = -1;
    incScore = 0;
    decScore = 0;
    counter = 0;
    traversals.x.forEach(function (x) {
      scoreCell({ x: x, y: y });
    });
    monoScore += Math.min(incScore, decScore);
  });
  if (counter > 0) {mergeScore += 1 + counter;}

  // Final score calculation with weights adjusted for 2048+ strategy
  var score = -47 * monoScore + 
              270 * emptyScore + 
              700 * mergeScore - 
              11 * sumScore +
              2000 * twentyFortyEightCount + // Heavy reward for 2048 tiles
              twentyFortyEightAlignment;      // Reward for stacking
              
  if (emptyScore == 0 && mergeScore == 0) {
    score -= 200000; // Heavy penalty for no moves available
  }
  
  return score;
};

// Classic AI interface methods
SmartAI.prototype.getBest = function() {
  var direction = this.nextMove();
  return {
    move: direction,
    score: this.gridQuality(this.game.grid),
    positions: 0,
    cutoffs: 0
  };
};

SmartAI.prototype.translate = function(move) {
  return {
    0: 'up',
    1: 'right',
    2: 'down',
    3: 'left'
  }[move];
};