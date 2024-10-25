/**
 * Grid constructor for 2048 game
 * Optimized for performance with pre-allocated arrays and simplified initialization
 */
function Grid(size) {
  this.size = size;
  this.startTiles = 2;
  this.cells = [];
  this.build();
  this.playerTurn = true;
  this.maxTileValue = 2048; // Constant to prevent merging beyond 2048
}

/**
 * Pre-allocate indexes for repeated access
 * Optimization: Cached position objects prevent garbage collection overhead
 * from creating new objects during gameplay
 */
Grid.prototype.indexes = [];
for (var x = 0; x < 4; x++) {
  Grid.prototype.indexes.push([]);
  for (var y = 0; y < 4; y++) {
    Grid.prototype.indexes[x].push({ x: x, y: y });
  }
}

/**
 * Build initial grid
 * Optimization: Using Array.fill() for faster initialization compared to loops
 */
Grid.prototype.build = function() {
  this.cells = Array(this.size).fill().map(() => Array(this.size).fill(null));
};

/**
 * Find random available cell
 * Optimization: Simplified return logic and removed unnecessary conditions
 */
Grid.prototype.randomAvailableCell = function() {
  const cells = this.availableCells();
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
};

/**
 * Get list of available cells
 * Optimization: Using push instead of array spread for better performance
 */
Grid.prototype.availableCells = function() {
  const cells = [];
  this.eachCell((x, y, tile) => {
    if (!tile) cells.push({ x, y });
  });
  return cells;
};

/**
 * Iterate through each cell
 * Optimization: Single iteration method reduces code duplication
 */
Grid.prototype.eachCell = function(callback) {
  for (let x = 0; x < this.size; x++) {
    for (let y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};

// Quick check for available cells
Grid.prototype.cellsAvailable = function() {
  return this.availableCells().length > 0;
};

// Check if specific cell is available
Grid.prototype.cellAvailable = function(cell) {
  return !this.cellContent(cell);
};

/**
 * Get cell content with bounds checking
 * Optimization: Combined bounds check with content retrieval
 */
Grid.prototype.cellContent = function(cell) {
  return this.withinBounds(cell) ? this.cells[cell.x][cell.y] : null;
};

// Tile manipulation methods
Grid.prototype.insertTile = function(tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function(tile) {
  this.cells[tile.x][tile.y] = null;
};

/**
 * Check if position is within grid bounds
 * Optimization: Combined conditions for faster evaluation
 */
Grid.prototype.withinBounds = function(position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

/**
 * Create a deep copy of the grid
 * Optimization: Using eachCell for consistent iteration
 */
Grid.prototype.clone = function() {
  const newGrid = new Grid(this.size);
  newGrid.playerTurn = this.playerTurn;
  this.eachCell((x, y, tile) => {
    if (tile) {
      newGrid.insertTile(tile.clone());
    }
  });
  return newGrid;
};

/**
 * Initialize starting tiles
 * Optimization: Simple loop for predictable initialization
 */
Grid.prototype.addStartTiles = function() {
  for (let i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

/**
 * Add a new random tile to the grid
 * Optimization: Simplified value generation logic
 */
Grid.prototype.addRandomTile = function() {
  if (this.cellsAvailable()) {
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = new Tile(this.randomAvailableCell(), value);
    this.insertTile(tile);
  }
};

/**
 * Prepare tiles for merging
 * Optimization: Using eachCell for consistent iteration
 */
Grid.prototype.prepareTiles = function() {
  this.eachCell((x, y, tile) => {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move tile to specific cell
Grid.prototype.moveTile = function(tile, cell) {
  this.cells[tile.x][tile.y] = null;
  this.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

/**
 * Direction vectors for movement
 * Optimization: Cached vectors prevent object creation during moves
 */
Grid.prototype.vectors = {
  0: { x: 0, y: -1 }, // up
  1: { x: 1, y: 0 },  // right
  2: { x: 0, y: 1 },  // down
  3: { x: -1, y: 0 }  // left
};

Grid.prototype.getVector = function(direction) {
  return this.vectors[direction];
};

/**
 * Core movement logic
 * Optimizations:
 * - Added maxTileValue check to prevent merges beyond 2048
 * - Simplified score calculation
 * - Removed win condition checking
 * - Improved position comparison
 */
Grid.prototype.move = function(direction) {
  const vector = this.getVector(direction);
  const traversals = this.buildTraversals(vector);
  let moved = false;
  let score = 0;

  this.prepareTiles();

  traversals.x.forEach(x => {
    traversals.y.forEach(y => {
      const cell = this.indexes[x][y];
      const tile = this.cellContent(cell);

      if (tile) {
        const positions = this.findFarthestPosition(cell, vector);
        const next = this.cellContent(positions.next);

        if (next && 
            next.value === tile.value && 
            !next.mergedFrom && 
            tile.value < this.maxTileValue) { // Prevent merging beyond 2048
          const merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          this.insertTile(merged);
          this.removeTile(tile);
          tile.updatePosition(positions.next);
          score += merged.value;
        } else {
          this.moveTile(tile, positions.farthest);
        }

        if (!this.positionsEqual(cell, tile)) {
          this.playerTurn = false;
          moved = true;
        }
      }
    });
  });

  return { moved, score };
};

/**
 * Computer's move - adds a new random tile
 */
Grid.prototype.computerMove = function() {
  this.addRandomTile();
  this.playerTurn = true;
};

/**
 * Skip computer's move (restored function)
 * Used for manual move by user !
 */
Grid.prototype.skipComputerMove = function() {
  this.playerTurn = true;
};

/**
 * Build traversal order for movement
 * Optimization: Using Array.fill().map() for cleaner array initialization
 */
Grid.prototype.buildTraversals = function(vector) {
  const traversals = {
    x: Array(this.size).fill().map((_, i) => i),
    y: Array(this.size).fill().map((_, i) => i)
  };

  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();

  return traversals;
};

/**
 * Find farthest position in a direction
 * Optimization: Simplified while loop condition
 */
Grid.prototype.findFarthestPosition = function(cell, vector) {
  let previous;
  do {
    previous = cell;
    cell = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.withinBounds(cell) && this.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell
  };
};

/**
 * Check if any moves are available
 */
Grid.prototype.movesAvailable = function() {
  return this.cellsAvailable() || this.tileMatchesAvailable();
};

/**
 * Check for possible tile matches
 * Optimization: Early return on first match found
 * Added maxTileValue check to prevent invalid merges
 */
Grid.prototype.tileMatchesAvailable = function() {
  for (let x = 0; x < this.size; x++) {
    for (let y = 0; y < this.size; y++) {
      const tile = this.cellContent({ x, y });
      if (tile) {
        for (let direction = 0; direction < 4; direction++) {
          const vector = this.getVector(direction);
          const cell = { x: x + vector.x, y: y + vector.y };
          const other = this.cellContent(cell);
          if (other && other.value === tile.value && tile.value < this.maxTileValue) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

/**
 * Compare two positions for equality
 * Optimization: Direct comparison instead of multiple checks
 */
Grid.prototype.positionsEqual = function(first, second) {
  return first.x === second.x && first.y === second.y;
};

/**
 * Convert grid to string representation
 * Optimization: Using array methods for cleaner string building
 */
Grid.prototype.toString = function() {
  return Array(4).fill().map((_, i) => 
    Array(4).fill().map((_, j) => 
      this.cells[j][i] ? this.cells[j][i].value : '_'
    ).join(' ')
  ).join('\n');
};